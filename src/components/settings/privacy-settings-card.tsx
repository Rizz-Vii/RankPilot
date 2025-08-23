"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { getLogger } from "@/lib/logging/app-logger";
import { asVoidHandler } from "@/lib/react/handlers";
import type { User } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { AlertTriangle, Download, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { asUserProfile } from "../../../types/user-profile";

export interface PrivacySettingsCardProps {
  user: User;
  profile: unknown;
}

export default function PrivacySettingsCard({
  user,
  profile,
}: PrivacySettingsCardProps): JSX.Element {
  const { toast } = useToast();
  const logger = getLogger('settings.privacy');
  const [isLoading, setIsLoading] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(
    asUserProfile(profile)?.privacy?.profileVisibility ?? false
  );
  const [dataCollection, setDataCollection] = useState(
    asUserProfile(profile)?.privacy?.dataCollection ?? true
  );
  const [activityTracking, setActivityTracking] = useState(
    asUserProfile(profile)?.privacy?.activityTracking ?? true
  );

  const handlePrivacyUpdate = async (setting: string, value: boolean): Promise<void> => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        [`privacy.${setting}`]: value,
        updatedAt: serverTimestamp(),
      });
      logger.audit('privacy.setting.updated', { userId: user.uid, setting, value });

      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : undefined;
      logger.error('privacy.setting.update.error', { userId: user.uid, setting, value, error: msg });
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update privacy settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataExport = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const functions = getFunctions();
      const exportFn = httpsCallable(functions, "exportUserData");
  const res: unknown = await exportFn({ userId: user.uid });
      logger.audit('privacy.data.export.requested', { userId: user.uid });
      // Audit timestamp now recorded server-side in export function.
      // Trigger download locally
      const data = (res && typeof res === 'object' && 'data' in res) ? (res as { data?: unknown }).data : res;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rankpilot-export-${user.uid}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Ready', description: 'Your data export has downloaded.' });
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : undefined;
      logger.error('privacy.data.export.error', { userId: user.uid, error: msg });
      toast({ variant: 'destructive', title: 'Export Failed', description: msg || 'Unable to export data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const functions = getFunctions();
      const delFn = httpsCallable(functions, "requestAccountDeletion");
      await delFn({ userId: user.uid });
      // Deletion audit recorded server-side.
      logger.audit('privacy.account.deletion.requested', { userId: user.uid });
      toast({ variant: 'destructive', title: 'Deletion Scheduled', description: 'Your account has been scheduled for deletion.' });
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : undefined;
      logger.error('privacy.account.deletion.error', { userId: user.uid, error: msg });
      toast({ variant: 'destructive', title: 'Deletion Failed', description: msg || 'Unable to schedule deletion.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
          <CardDescription>
            Control how your data is used and shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to find your profile in search results
              </p>
            </div>
            <Switch
              id="profile-visibility"
              checked={profileVisibility}
              onCheckedChange={asVoidHandler((checked: boolean) => {
                setProfileVisibility(checked);
                return handlePrivacyUpdate("profileVisibility", checked);
              })}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-collection">Analytics & Usage Data</Label>
              <p className="text-sm text-muted-foreground">
                Help improve our service by sharing anonymous usage data
              </p>
            </div>
            <Switch
              id="data-collection"
              checked={dataCollection}
              onCheckedChange={asVoidHandler((checked: boolean) => {
                setDataCollection(checked);
                return handlePrivacyUpdate("dataCollection", checked);
              })}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="activity-tracking">Activity Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track your SEO activities for personalized insights
              </p>
            </div>
            <Switch
              id="activity-tracking"
              checked={activityTracking}
              onCheckedChange={asVoidHandler((checked: boolean) => {
                setActivityTracking(checked);
                return handlePrivacyUpdate("activityTracking", checked);
              })}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or delete your personal data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Export Your Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Download a copy of all your data including profiles, audits, and
                activity history.
              </p>
              <Button
                variant="outline"
                onClick={asVoidHandler(() => handleDataExport())}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Request Data Export
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-destructive">Danger Zone</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete your account and all associated data.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account, remove all your data from our servers, and
                      cancel any active subscriptions.
                      <br />
                      <br />
                      <strong>You will lose:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All SEO audit history</li>
                        <li>Keyword research data</li>
                        <li>Custom settings and preferences</li>
                        <li>Any active subscription benefits</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={asVoidHandler(() => handleAccountDeletion())}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Information</CardTitle>
          <CardDescription>
            Learn more about how we protect your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Data Encryption</h4>
              <p className="text-sm text-muted-foreground">
                All data is encrypted in transit and at rest using
                industry-standard encryption.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Data Location</h4>
              <p className="text-sm text-muted-foreground">
                Your data is stored securely in Google Cloud Platform data
                centers.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                We retain your data only as long as necessary to provide our
                services.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Third Parties</h4>
              <p className="text-sm text-muted-foreground">
                We never sell your data to third parties. See our Privacy Policy
                for details.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="link" className="p-0 h-auto text-sm">
              Read our Privacy Policy
            </Button>
            <span className="mx-2 text-muted-foreground">•</span>
            <Button variant="link" className="p-0 h-auto text-sm">
              Terms of Service
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
