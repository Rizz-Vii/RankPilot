"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getErrorInfo } from "@/lib/errors";
import { db } from "@/lib/firebase";
import { getLogger } from "@/lib/logging/app-logger";
import { asVoidHandler } from "@/lib/react/handlers";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "firebase/auth";
import { updateEmail } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { asUserProfile, type UserProfile } from "../../../types/user-profile";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  firstName: z
    .string()
    .min(1, { message: "First name is required." })
    .optional(),
  lastName: z.string().min(1, { message: "Last name is required." }).optional(),
  company: z.string().optional(),
  timezone: z.string().optional(),
});

type AccountFormValues = z.infer<typeof formSchema>;

export interface AccountSettingsFormProps {
  user: User;
  profile: unknown;
}

export default function AccountSettingsForm({
  user,
  profile,
}: AccountSettingsFormProps): JSX.Element {
  const { toast } = useToast();
  const logger = getLogger("settings.account");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const prof: UserProfile | undefined = asUserProfile(profile);
  const isPasswordProvider =
    Array.isArray(user.providerData) &&
    user.providerData.some((p) => p?.providerId === "password");

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user.email || "",
      firstName: prof?.firstName || "",
      lastName: prof?.lastName || "",
      company: prof?.company || "",
      timezone:
        prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  async function handleFormSubmit(values: AccountFormValues): Promise<void> {
    if (cooldown) return;
    setIsLoading(true);
    try {
      // Update email in Firebase Auth if changed
      if (values.email !== user.email) {
        if (!isPasswordProvider) {
          throw new Error("Email managed by your sign-in provider.");
        }
        await updateEmail(user, values.email);
        logger.audit("account.email.updated", { userId: user.uid });
      }

      // Update profile in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        company: values.company,
        timezone: values.timezone,
        email: values.email,
        updatedAt: serverTimestamp(),
      });
      logger.audit("account.profile.updated", { userId: user.uid });

      toast({
        title: "Account Updated",
        description: "Your account information has been successfully updated.",
      });
    } catch (error: unknown) {
      const { message, code } = getErrorInfo(error);
      const msg =
        code === "auth/requires-recent-login"
          ? "Please re-authenticate to change your email."
          : message;
      logger.error("account.update.error", { userId: user.uid, error: msg });
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: msg || "Could not update your account. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Account Information
        </CardTitle>
        <CardDescription>
          Update your account details and contact information.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={asVoidHandler(form.handleSubmit(handleFormSubmit))}
          className="space-y-6"
        >
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Changes to your email address will require email verification.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      {...field}
                      disabled={isLoading || !isPasswordProvider}
                    />
                  </FormControl>
                  <FormDescription>
                    {isPasswordProvider ? (
                      <>
                        This email is used for login and important
                        notifications.
                      </>
                    ) : (
                      <>
                        Your email is managed by your sign-in provider. Update
                        it in your provider settings.
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your Company Name"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Auto-detected from your browser"
                      {...field}
                      disabled={isLoading}
                      readOnly
                    />
                  </FormControl>
                  <FormDescription>
                    Used for scheduling reports and notifications.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || cooldown}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
