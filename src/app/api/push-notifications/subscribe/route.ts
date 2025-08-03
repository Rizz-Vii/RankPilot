/**
 * Push Notifications API - Subscribe Endpoint
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * Features:
 * - Subscription storage in Firestore
 * - User-specific notification preferences
 * - Rate limiting protection
 */

import { db } from '@/lib/firebase';
import { rateLimit } from '@/lib/utils/rate-limit';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

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
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    return '127.0.0.1';
}

export async function POST(_request: NextRequest) {
    try {
        // Rate limiting
        const ip = getClientIP(_request);
        try {
            await limiter.check(5, ip); // 5 requests per minute
        } catch {
            return NextResponse.json(
                { _error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse request body
        const body: SubscribeRequest = await _request.json();

        if (!body.subscription || !body.subscription.endpoint) {
            return NextResponse.json(
                { _error: 'Invalid subscription data' },
                { status: 400 }
            );
        }

        if (!body.userId) {
            return NextResponse.json(
                { _error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Validate subscription format
        if (!body.subscription.keys?.p256dh || !body.subscription.keys?.auth) {
            return NextResponse.json(
                { _error: 'Missing subscription keys' },
                { status: 400 }
            );
        }

        // Default notification preferences
        const defaultPreferences = {
            analysisComplete: true,
            weeklyReports: true,
            criticalAlerts: true,
            systemUpdates: false
        };

        // Store subscription in Firestore
        const subscriptionData = {
            userId: body.userId,
            subscription: body.subscription,
            preferences: { ...defaultPreferences, ...body.preferences },
            userAgent: _request.headers.get('user-agent') || 'Unknown',
            ipAddress: ip,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true
        };

        // Use subscription endpoint as document ID for easy deduplication
        const subscriptionId = Buffer.from(body.subscription.endpoint).toString('base64');
        const subscriptionRef = doc(db, 'pushSubscriptions', subscriptionId);

        await setDoc(subscriptionRef, subscriptionData, { merge: true });

        // Update user's notification settings
        const userRef = doc(db, 'users', body.userId);
        await setDoc(userRef, {
            notificationsEnabled: true,
            lastNotificationUpdate: serverTimestamp()
        }, { merge: true });

        console.log('[PWA] Push subscription created:', {
            userId: body.userId,
            subscriptionId: subscriptionId.substring(0, 10) + '...',
            preferences: subscriptionData.preferences
        });

        return NextResponse.json({
            success: true,
            message: 'Push notification subscription created successfully',
            subscriptionId
        });

    } catch (error) {
        console.error('[PWA] Push subscription _error:', error);

        if (error instanceof Error) {
            return NextResponse.json(
                { _error: 'Subscription failed', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { _error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Rate limiting
        const ip = getClientIP(request);
        try {
            await limiter.check(5, ip);
        } catch {
            return NextResponse.json(
                { _error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse request body
        const body = await request.json();

        if (!body.subscription?.endpoint) {
            return NextResponse.json(
                { _error: 'Invalid subscription data' },
                { status: 400 }
            );
        }

        // Remove subscription from Firestore
        const subscriptionId = Buffer.from(body.subscription.endpoint).toString('base64');
        const subscriptionRef = doc(db, 'pushSubscriptions', subscriptionId);

        await setDoc(subscriptionRef, {
            isActive: false,
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('[PWA] Push subscription deleted:', {
            subscriptionId: subscriptionId.substring(0, 10) + '...'
        });

        return NextResponse.json({
            success: true,
            message: 'Push notification subscription deleted successfully'
        });

    } catch (_error) {
        console.error('[PWA] Push unsubscription _error:', _error);

        return NextResponse.json(
            { _error: 'Unsubscription failed' },
            { status: 500 }
        );
    }
}
