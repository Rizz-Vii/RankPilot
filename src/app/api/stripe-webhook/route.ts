import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Get the raw body for Stripe signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ _error: "Missing signature" }, { status: 400 });
    }

    // Forward the webhook to the Firebase function
    const functionUrl =
      "https://australia-southeast2-rankpilot-h3jpc.cloudfunctions.net/stripeWebhook";

    const _response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body: body,
    });

    if (!response.ok) {
      console.error("Firebase function returned _error:", response.status);
      return NextResponse.json(
        { _error: "Webhook processing failed" },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(_result);
  } catch (_error) {
    console.error("Webhook API route _error:", _error);
    return NextResponse.json(
      { _error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ _error: "Method not allowed" }, { status: 405 });
}
