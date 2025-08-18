"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  adminUpdateUserSubscription,
  fixAbbaUser,
  fixAllTestUsers,
} from "@/lib/admin-user-management";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuickAction {
  label: string;
  description: string;
  action: () => Promise<void>;
  variant: "default" | "destructive" | "secondary";
}

export function AdminUserSubscriptionManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);

  // Form state
  const [email, setEmail] = useState("");
  type SubscriptionTier = "free" | "starter" | "agency" | "enterprise";
  type SubscriptionStatus = "free" | "active" | "canceled" | "past_due";

  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [monthsToAdd, setMonthsToAdd] = useState("3");
  const [paymentHistoryMonths, setPaymentHistoryMonths] = useState("3");

  const quickActions: QuickAction[] = [
    {
      label: "Fix Abba User",
      description: "Fix abba7254@gmail.com subscription issue",
      action: fixAbbaUser,
      variant: "default",
    },
    {
      label: "Fix All Test Users",
      description: "Reset all test user subscriptions",
      action: fixAllTestUsers,
      variant: "secondary",
    },
  ];

  const handleQuickAction = (action: () => Promise<void>) => {
    setPendingAction(() => action);
    setShowConfirmDialog(true);
  };

  const executeAction = async () => {
    if (!pendingAction) return;

    setLoading(true);
    try {
      await pendingAction();
      toast({
        title: "Success",
        description: "Action completed successfully",
      });
    } catch (error) {
      console.error("Action failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  const handleManualUpdate = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email is required",
      });
      return;
    }

    setLoading(true);
    try {
      await adminUpdateUserSubscription({
        email: email.trim(),
        tier,
        status,
        monthsToAdd: parseInt(monthsToAdd) || 0,
        paymentHistoryMonths: parseInt(paymentHistoryMonths) || 0,
      });

      toast({
        title: "Success",
        description: `Updated ${email} to ${tier} (${status})`,
      });

      // Reset form
      setEmail("");
      setTier("starter");
      setStatus("active");
      setMonthsToAdd("3");
      setPaymentHistoryMonths("3");
    } catch (error) {
      console.error("Update failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Update failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Pre-configured actions to fix common subscription issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{action.label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button
                  variant={action.variant}
                  onClick={() => handleQuickAction(action.action)}
                  disabled={loading}
                >
                  Execute
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual User Update */}
      <Card>
        <CardHeader>
          <CardTitle>Manual User Subscription Update</CardTitle>
          <CardDescription>
            Update any user's subscription status and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Subscription Tier</Label>
              <Select
                value={tier}
                onValueChange={(value: SubscriptionTier) => setTier(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter ($19/month)</SelectItem>
                  <SelectItem value="agency">
                    Agency ($49/month)
                  </SelectItem>
                  <SelectItem value="enterprise">
                    Enterprise ($99/month)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Subscription Status</Label>
              <Select
                value={status}
                onValueChange={(value: SubscriptionStatus) => setStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthsToAdd">Months to Add</Label>
              <Input
                id="monthsToAdd"
                type="number"
                placeholder="3"
                value={monthsToAdd}
                onChange={(e) => setMonthsToAdd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentHistory">Payment History (Months)</Label>
              <Input
                id="paymentHistory"
                type="number"
                placeholder="3"
                value={paymentHistoryMonths}
                onChange={(e) => setPaymentHistoryMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleManualUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Subscription"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Known Test Users</CardTitle>
          <CardDescription>Status of configured test users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">abba7254@gmail.com</div>
                <div className="text-sm text-muted-foreground">
                  Primary test user
                </div>
              </div>
              <div className="flex gap-2">
                <Badge>Starter</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">abbas_ali_rizvi@hotmail.com</div>
                <div className="text-sm text-muted-foreground">
                  Free tier test user
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Free</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to execute this action? This will modify
              user subscription data in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
