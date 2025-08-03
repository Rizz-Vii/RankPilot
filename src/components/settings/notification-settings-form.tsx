"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Bell } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { User } from "firebase/auth";

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

interface Notifications {
  emailNotifications?: boolean;
  seoAlerts?: boolean;
  weeklyReports?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  auditCompletions?: boolean;
  keywordRankings?: boolean;
}

interface Profile {
  notifications?: Notifications;
}

interface NotificationSettingsFormProps {
  user: User;
  profile: Profile;
}

export default function NotificationSettingsForm({
  user,
  profile,
}: NotificationSettingsFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: profile?.notifications?.emailNotifications ?? true,
      seoAlerts: profile?.notifications?.seoAlerts ?? true,
      weeklyReports: profile?.notifications?.weeklyReports ?? true,
      marketingEmails: profile?.notifications?.marketingEmails ?? false,
      securityAlerts: profile?.notifications?.securityAlerts ?? true,
      auditCompletions: profile?.notifications?.auditCompletions ?? true,
      keywordRankings: profile?.notifications?.keywordRankings ?? true,
    },
  });

  async function handleFormSubmit(values: NotificationFormValues) {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        notifications: values,
        updatedAt: new Date(),
      });

      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (_error: unknown) {
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
          onSubmit={form.handleSubmit(handleFormSubmit)}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
