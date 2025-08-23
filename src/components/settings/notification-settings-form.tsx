"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { getLogger } from "@/lib/logging/app-logger";
import { asVoidHandler } from "@/lib/react/handlers";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Bell, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { asUserProfile, type UserProfile } from "../../../types/user-profile";

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  seoAlerts: z.boolean(),
  weeklyReports: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
  auditCompletions: z.boolean(),
  keywordRankings: z.boolean(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export interface NotificationSettingsFormProps {
  user: User;
  profile: unknown;
}

export default function NotificationSettingsForm({
  user,
  profile,
}: NotificationSettingsFormProps): JSX.Element {
  const { toast } = useToast();
  const logger = getLogger('settings.notifications');
  const [isLoading, setIsLoading] = useState(false);
  const prof: UserProfile | undefined = asUserProfile(profile);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
  emailNotifications: prof?.notifications?.emailNotifications ?? true,
  seoAlerts: prof?.notifications?.seoAlerts ?? true,
  weeklyReports: prof?.notifications?.weeklyReports ?? true,
  marketingEmails: prof?.notifications?.marketingEmails ?? false,
  securityAlerts: prof?.notifications?.securityAlerts ?? true,
  auditCompletions: prof?.notifications?.auditCompletions ?? true,
  keywordRankings: prof?.notifications?.keywordRankings ?? true,
    },
  });

  async function handleFormSubmit(values: NotificationFormValues): Promise<void> {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        notifications: values,
        updatedAt: serverTimestamp(),
      });
      logger.audit('notifications.updated', { userId: user.uid });

      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : undefined;
      logger.error('notifications.update.error', { userId: user.uid, error: msg });
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          "Could not update notification settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose what notifications you'd like to receive via email.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={asVoidHandler(form.handleSubmit((vals) => handleFormSubmit(vals)))}
          className="space-y-6"
        >
          <CardContent className="space-y-6">
            {/* Essential Notifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Essential Notifications</h3>
              <p className="text-sm text-muted-foreground">
                These notifications help keep your account secure and inform you
                of important changes.
              </p>

              <FormField
                control={form.control}
                name="securityAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Security Alerts
                      </FormLabel>
                      <FormDescription>
                        Notifications about suspicious activity and security
                        changes.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !form.watch('emailNotifications')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Notifications
                      </FormLabel>
                      <FormDescription>
                        Master switch for all email notifications.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* SEO Tool Notifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">SEO Tool Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Stay updated on your SEO activities and results.
              </p>

              <FormField
                control={form.control}
                name="auditCompletions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Audit Completions
                      </FormLabel>
                      <FormDescription>
                        Get notified when your SEO audits are complete.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !form.watch('emailNotifications')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywordRankings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Keyword Ranking Changes
                      </FormLabel>
                      <FormDescription>
                        Updates when your tracked keywords change rankings.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !form.watch('emailNotifications')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seoAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">SEO Alerts</FormLabel>
                      <FormDescription>
                        Important SEO issues found during audits.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !form.watch('emailNotifications')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Reports and Marketing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Reports & Updates</h3>
              <p className="text-sm text-muted-foreground">
                Regular reports and product updates.
              </p>

              <FormField
                control={form.control}
                name="weeklyReports"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Weekly SEO Reports
                      </FormLabel>
                      <FormDescription>
                        Summary of your SEO activities and progress.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !form.watch('emailNotifications')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingEmails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Marketing Emails
                      </FormLabel>
                      <FormDescription>
                        Product updates, tips, and promotional content.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
