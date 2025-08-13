"use client";

import React from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SubscriptionTest() {
  const { subscription, loading } = useSubscription();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🧪 Subscription Test</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-muted-foreground">Loading subscription...</div>
        ) : subscription ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant="secondary">{subscription.status}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Tier:</span>
              <Badge variant="outline">{subscription.tier}</Badge>
            </div>
            <div className="text-sm text-success-foreground">
              ✅ Subscription hook working correctly!
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No subscription data</div>
        )}
      </CardContent>
    </Card>
  );
}
