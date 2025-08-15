"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function UserSubscriptionDebugger() {
  const { user, profile } = useAuth();
  const { subscription, loading } = useSubscription();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Debug</CardTitle>
          <CardDescription>No user logged in</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Debug</CardTitle>
        <CardDescription>Current user subscription information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div>
          <h4 className="font-medium">User Information</h4>
          <div className="text-sm space-y-1 mt-2">
            <div>
              Email: <code>{user.email}</code>
            </div>
            <div>
              UID: <code>{user.uid}</code>
            </div>
            <div>
              Display Name: <code>{user.displayName || "Not set"}</code>
            </div>
          </div>
        </div>

        <Separator />

        {/* Profile Data */}
        <div>
          <h4 className="font-medium">Profile Data (Firestore)</h4>
          {profile ? (
            <div className="text-sm space-y-1 mt-2">
              <div>
                Email: <code>{profile.email}</code>
              </div>
              <div>
                Role: <Badge variant="outline">{profile.role}</Badge>
              </div>
              <div>
                Subscription Status:{" "}
                <Badge>{profile.subscriptionStatus || "Not set"}</Badge>
              </div>
              <div>
                Subscription Tier:{" "}
                <Badge>{profile.subscriptionTier || "Not set"}</Badge>
              </div>
              {profile.stripeCustomerId && (
                <div>
                  Stripe Customer ID: <code>{profile.stripeCustomerId}</code>
                </div>
              )}
              {profile.nextBillingDate && (
                <div>
                  Next Billing:{" "}
                  <code>
                    {new Date(
                      profile.nextBillingDate.seconds * 1000
                    ).toLocaleDateString()}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">
              No profile data found
            </div>
          )}
        </div>

        <Separator />

        {/* Subscription Hook Data */}
        <div>
          <h4 className="font-medium">Subscription Hook Data</h4>
          {loading ? (
            <div className="text-sm text-muted-foreground mt-2">Loading...</div>
          ) : subscription ? (
            <div className="text-sm space-y-1 mt-2">
              <div>
                Status: <Badge>{subscription.status}</Badge>
              </div>
              <div>
                Tier: <Badge>{subscription.tier}</Badge>
              </div>
              {subscription.customerId && (
                <div>
                  Customer ID: <code>{subscription.customerId}</code>
                </div>
              )}
              {subscription.subscriptionId && (
                <div>
                  Subscription ID: <code>{subscription.subscriptionId}</code>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div>
                  Period End:{" "}
                  <code>
                    {subscription.currentPeriodEnd.toLocaleDateString()}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">
              No subscription data
            </div>
          )}
        </div>

        <Separator />

        {/* Raw Data */}
        <div>
          <h4 className="font-medium">Raw Data</h4>
          <details className="mt-2">
            <summary className="text-sm cursor-pointer">
              Click to expand
            </summary>
            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto font-mono" aria-label="Raw user, profile, and subscription data" role="region">
              {JSON.stringify(
                {
                  user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                  },
                  profile,
                  subscription,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
