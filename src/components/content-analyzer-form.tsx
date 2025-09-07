// src/components/content-analyzer-form.tsx
"use client";

import type { AnalyzeContentInput } from "@/ai/flows/content-optimization";
import { useHydration } from "@/components/HydrationContext";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardFooter,
  EnhancedCardHeader,
  EnhancedCardTitle,
} from "@/components/ui/enhanced-card";
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
import { colors } from "@/lib/design-system/colors";
import { useIsMobile } from "@/lib/mobile-responsive-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Sparkles } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  content: z
    .string()
    .min(50, { message: "Content must be at least 50 characters long." })
    .max(10000, { message: "Content must be less than 10,000 characters." }),
  targetKeywords: z
    .string()
    .min(3, { message: "Target keywords must be at least 3 characters long." })
    .max(200, { message: "Target keywords must be less than 200 characters." }),
});

type ContentAnalyzerFormValues = z.infer<typeof formSchema>;

interface ContentAnalyzerFormProps {
  onSubmit: (values: AnalyzeContentInput) => Promise<void>;
  isLoading: boolean;
}

export default function ContentAnalyzerForm({
  onSubmit,
  isLoading,
}: ContentAnalyzerFormProps) {
  const hydrated = useHydration();
  const isMobile = useIsMobile();

  const form = useForm<ContentAnalyzerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      targetKeywords: "",
    },
  });

  async function handleFormSubmit(values: ContentAnalyzerFormValues) {
    try {
      await onSubmit(values as AnalyzeContentInput);
    } catch (error) {
      console.error("Content analysis failed:", error);
      // Error handling could be improved with toast notifications
    }
  }

  // Sync wrapper so the form onSubmit attribute itself does not receive a promise-returning function
  const handleFormEvent: React.FormEventHandler<HTMLFormElement> = (e) => {
    void form.handleSubmit(handleFormSubmit)(e);
  };

  const contentLength = form.watch("content")?.length || 0;
  const keywordsLength = form.watch("targetKeywords")?.length || 0;

  return (
    <EnhancedCard className="h-full" variant="elevated">
      <EnhancedCardHeader>
        <EnhancedCardTitle className="font-headline flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Optimize Your Content
        </EnhancedCardTitle>
        <EnhancedCardDescription className="font-body">
          Paste your content and target keywords to get AI-powered optimization
          suggestions, readability analysis, and SEO improvements.
        </EnhancedCardDescription>
      </EnhancedCardHeader>

      <Form {...form}>
        <form
          onSubmit={handleFormEvent}
          className="space-y-6"
          aria-busy={isLoading}
          aria-disabled={isLoading}
        >
          <EnhancedCardContent className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-2">
                      <FormLabel
                        className="font-body text-sm font-medium flex items-center justify-between"
                        htmlFor="content-input"
                      >
                        Content to Analyze
                        <span
                          className={`text-xs ${
                            contentLength > 9000
                              ? colors.status.error.text
                              : contentLength > 7000
                                ? colors.status.warning.text
                                : colors.text.muted
                          }`}
                        >
                          {contentLength}/10,000 characters
                        </span>
                      </FormLabel>
                      <Textarea
                        id="content-input"
                        placeholder="Paste your article, blog post, or page content here..."
                        className="min-h-[200px] font-body resize-y"
                        {...field}
                        disabled={!hydrated || isLoading}
                        aria-describedby="content-description content-error"
                      />
                      <FormDescription
                        id="content-description"
                        className="font-body text-sm text-muted-foreground"
                      >
                        Paste the text content you want to analyze for SEO
                        optimization, readability, and engagement.
                      </FormDescription>
                      <FormMessage id="content-error" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-2">
                      <FormLabel
                        className="font-body text-sm font-medium flex items-center justify-between"
                        htmlFor="keywords-input"
                      >
                        Target Keywords
                        <span
                          className={`text-xs ${
                            keywordsLength > 180
                              ? colors.status.error.text
                              : keywordsLength > 150
                                ? colors.status.warning.text
                                : colors.text.muted
                          }`}
                        >
                          {keywordsLength}/200 characters
                        </span>
                      </FormLabel>
                      <Input
                        id="keywords-input"
                        placeholder="e.g., SEO best practices, content marketing, digital optimization"
                        {...field}
                        className="font-body"
                        disabled={!hydrated || isLoading}
                        autoComplete="off"
                        aria-describedby="keywords-description keywords-error"
                      />
                      <FormDescription
                        id="keywords-description"
                        className="font-body text-sm text-muted-foreground"
                      >
                        Comma-separated list of keywords you want to optimize
                        for. These will guide the analysis and recommendations.
                      </FormDescription>
                      <FormMessage id="keywords-error" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </EnhancedCardContent>

          <EnhancedCardFooter>
            <EnhancedButton
              type="submit"
              className="w-full"
              size={isMobile ? "mobile" : "default"}
              loading={isLoading}
              loadingText="Analyzing content..."
              leftIcon={
                !isLoading ? <Sparkles className="h-4 w-4" /> : undefined
              }
              disabled={
                !hydrated ||
                isLoading ||
                !form.watch("content") ||
                !form.watch("targetKeywords")
              }
              variant="gradient"
            >
              {isLoading
                ? "Analyzing Content..."
                : "Analyze & Optimize Content"}
            </EnhancedButton>
          </EnhancedCardFooter>
        </form>
      </Form>
    </EnhancedCard>
  );
}
