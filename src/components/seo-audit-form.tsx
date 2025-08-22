// src/components/seo-audit-form.tsx
"use client";

import type { AuditUrlInput } from "@/ai/flows/seo-audit";
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
import { useIsMobile } from "@/lib/mobile-responsive-utils";
import { asVoidHandler } from "@/lib/react/handlers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  url: z
    .string()
    .min(1, { message: "Please enter a valid URL." })
    .refine(
      (url) => {
        const trimmed = url.trim();
        if (!trimmed) return false;
        // Basic URL pattern validation
        const urlPattern =
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        const withProtocol = trimmed.startsWith("http")
          ? trimmed
          : `https://${trimmed}`;
        return urlPattern.test(withProtocol);
      },
      {
        message:
          "Please enter a valid URL (e.g., example.com or https://example.com)",
      }
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface SeoAuditFormProps {
  onSubmit: (values: AuditUrlInput) => Promise<void>;
  isLoading: boolean;
}

export default function SeoAuditForm({
  onSubmit,
  isLoading,
}: SeoAuditFormProps) {
  const hydrated = useHydration();
  const isMobile = useIsMobile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  function handleFormSubmit(values: FormValues) {
    const normalizeUrl = (url: string): string => {
      const trimmed = url.trim();
      if (!trimmed) {
        return "";
      }
      if (!/^(https?:\/\/)/i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };

    const submissionValues: AuditUrlInput = {
      url: normalizeUrl(values.url),
    };
    // Intentionally not awaited to avoid blocking UI; caller handles state
    void onSubmit(submissionValues);
  }

  return (
    <EnhancedCard
      className="h-full"
      variant="elevated"
    >
      <EnhancedCardHeader>
        <EnhancedCardTitle className="font-headline flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Technical SEO Audit
        </EnhancedCardTitle>
        <EnhancedCardDescription className="font-body">
          Enter a URL to run a comprehensive technical and content SEO audit.
          Get detailed insights on performance, accessibility, and SEO best
          practices.
        </EnhancedCardDescription>
      </EnhancedCardHeader>

      <Form {...form}>
        <form
          onSubmit={asVoidHandler(form.handleSubmit(handleFormSubmit))}
          className="space-y-6"
          aria-busy={isLoading}
          aria-disabled={isLoading}
        >
          <EnhancedCardContent>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-2">
                      <FormLabel
                        className="font-body text-sm font-medium"
                        htmlFor="url-input"
                      >
                        Website URL to Audit
                      </FormLabel>
                      <Input
                        id="url-input"
                        placeholder="e.g., example.com or https://www.example.com"
                        {...field}
                        className="font-body"
                        disabled={!hydrated || isLoading}
                        autoComplete="url"
                        aria-describedby="url-description url-error"
                      />
                      <FormDescription
                        id="url-description"
                        className="font-body text-sm text-muted-foreground"
                      >
                        Enter the website URL you want to audit. We'll analyze
                        technical SEO factors, performance, and content
                        optimization.
                      </FormDescription>
                      <FormMessage id="url-error" />
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
              loadingText="Running audit..."
              leftIcon={!isLoading ? <Search className="h-4 w-4" /> : undefined}
              disabled={!hydrated || isLoading || !form.watch("url")}
              variant="gradient"
            >
              {isLoading ? "Running SEO Audit..." : "Run Complete Audit"}
            </EnhancedButton>
          </EnhancedCardFooter>
        </form>
      </Form>
    </EnhancedCard>
  );
}
