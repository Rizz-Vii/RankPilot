/**
 * Push Notifications API - Subscribe Endpoint
 * Advanced Architecture Enhancement - DevReady Phase 3
 *
 * Features:
 * - Subscription storage in Firestore
 * - User-specific notification preferences
 * - Rate limiting protection
 */

import { adminDb } from "@/lib/firebase-admin";
import { noStoreHeaders } from "@/lib/http/cache";
import { handleCors } from "@/lib/http/cors";
import { rateLimit } from "@/lib/utils/rate-limit";
import * as admin from "firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscribeRequest {
  subscription: PushSubscription;
  userId: string;
  preferences?: {
    analysisComplete?: boolean;
    weeklyReports?: boolean;
    criticalAlerts?: boolean;
    systemUpdates?: boolean;
  };
}

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  const cors = handleCors(request, {
    allowMethods: ["POST", "DELETE", "OPTIONS"],
  });
  if ("preflight" in cors) return cors.preflight as Response;
  try {
    // Rate limiting
    const ip = getClientIP(request);
    try {
      await limiter.check(5, ip); // 5 requests per minute
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    // Parse request body
    const body: SubscribeRequest = await request.json();

    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    if (!body.userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    // Validate subscription format
    if (!body.subscription.keys?.p256dh || !body.subscription.keys?.auth) {
      return NextResponse.json(
        { error: "Missing subscription keys" },
        { status: 400, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    // Default notification preferences
    const defaultPreferences = {
      analysisComplete: true,
      weeklyReports: true,
      criticalAlerts: true,
      systemUpdates: false,
    };

    // Store subscription in Firestore
    const subscriptionData = {
      userId: body.userId,
      subscription: body.subscription,
      preferences: { ...defaultPreferences, ...body.preferences },
      userAgent: request.headers.get("user-agent") || "Unknown",
      ipAddress: ip,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    };

    // Use subscription endpoint as document ID for easy deduplication
    const subscriptionId = Buffer.from(body.subscription.endpoint).toString(
      "base64"
    );
    const subscriptionRef = adminDb
      .collection("pushSubscriptions")
      .doc(subscriptionId);
    await subscriptionRef.set(subscriptionData, { merge: true });

    // Update user's notification settings
    const userRef = adminDb.collection("users").doc(body.userId);
    await userRef.set(
      {
        notificationsEnabled: true,
        lastNotificationUpdate: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[PWA] Push subscription created:", {
      userId: body.userId,
      subscriptionId: subscriptionId.substring(0, 10) + "...",
      preferences: subscriptionData.preferences,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push notification subscription created successfully",
        subscriptionId,
      },
      { headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  } catch (error) {
    console.error("[PWA] Push subscription error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Subscription failed", details: error.message },
        { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const cors = handleCors(request, {
    allowMethods: ["POST", "DELETE", "OPTIONS"],
  });
  if ("preflight" in cors) return cors.preflight as Response;
  try {
    // Rate limiting
    const ip = getClientIP(request);
    try {
      await limiter.check(5, ip);
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    // Parse request body
    const body = await request.json();

    if (!body.subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400, headers: { ...noStoreHeaders(), ...cors.headers } }
      );
    }

    // Remove subscription from Firestore
    const subscriptionId = Buffer.from(body.subscription.endpoint).toString(
      "base64"
    );
    const subscriptionRef = adminDb
      .collection("pushSubscriptions")
      .doc(subscriptionId);
    await subscriptionRef.set(
      {
        isActive: false,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[PWA] Push subscription deleted:", {
      subscriptionId: subscriptionId.substring(0, 10) + "...",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push notification subscription deleted successfully",
      },
      { headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  } catch (error) {
    console.error("[PWA] Push unsubscription error:", error);

    return NextResponse.json(
      { error: "Unsubscription failed" },
      { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  }
}

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const cors = handleCors(request, {
    allowMethods: ["POST", "DELETE", "OPTIONS"],
  });
  return "preflight" in cors
    ? (cors.preflight as Response)
    : new Response(null, { status: 204, headers: cors.headers });
}
