// src/components/profile-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { asUserProfile, type UserProfile } from "../../types/user-profile"; // corrected relative path to project root types

const formSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters." }),
  professionalTitle: z.string().optional(),
  bio: z
    .string()
    .max(500, { message: "Bio must be 500 characters or less." })
    .optional(),
  primaryKeywords: z.string().optional(),
  specializations: z.string().optional(),
  website: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .optional()
    .or(z.literal("")),
  linkedIn: z
    .string()
    .url({ message: "Please enter a valid LinkedIn URL." })
    .optional()
    .or(z.literal("")),
  twitter: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  user: User;
  profile: unknown;
}

export default function ProfileForm({
  user,
  profile,
}: ProfileFormProps): JSX.Element {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const prof: UserProfile | undefined = asUserProfile(profile);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: prof?.displayName || "",
      professionalTitle: prof?.professionalTitle || "",
      bio: prof?.bio || "",
      primaryKeywords: prof?.primaryKeywords || "",
      specializations: prof?.specializations || "",
      website: prof?.website || "",
      linkedIn: prof?.linkedIn || "",
      twitter: prof?.twitter || "",
    },
  });

  async function handleFormSubmit(values: ProfileFormValues): Promise<void> {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: values.displayName,
        professionalTitle: values.professionalTitle,
        bio: values.bio,
        primaryKeywords: values.primaryKeywords,
        specializations: values.specializations,
        website: values.website,
        linkedIn: values.linkedIn,
        twitter: values.twitter,
        updatedAt: new Date(),
      });
      toast({
        title: "Profile Updated",
        description: "Your SEO profile has been successfully updated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle>SEO Professional Profile</CardTitle>
        <CardDescription>
          Your professional SEO identity - how others see you in the SEO
          community.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(handleFormSubmit)(e);
          }}
          className="space-y-8"
        >
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      How you want to be known in the SEO community
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="professionalTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SEO Manager, Digital Marketing Specialist"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Your current role or expertise level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell the SEO community about your experience, achievements, and approach to SEO..."
                      {...field}
                      disabled={isLoading}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of your SEO background and expertise
                    (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary SEO Focus Areas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., e-commerce seo, technical audits, content marketing, local seo"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Your main areas of SEO expertise and interest
                    (comma-separated)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specializations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Specializations</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SaaS, E-commerce, Healthcare, Finance"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Industries or business types you specialize in
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourwebsite.com"
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
                  name="linkedIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/yourprofile"
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
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter Handle</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@yourusername"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
