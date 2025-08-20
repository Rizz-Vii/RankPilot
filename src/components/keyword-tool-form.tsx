// src/components/keyword-tool-form.tsx
"use client";

import type { SuggestKeywordsInput } from "@/ai/flows/keyword-suggestions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardFooter,
  EnhancedCardHeader,
  EnhancedCardTitle,
} from "@/components/ui/enhanced-card";
import { Search, Sparkles } from "lucide-react";
import { useHydration } from "@/components/HydrationContext";
import { useIsMobile } from "@/lib/mobile-responsive-utils";

const formSchema = z.object({
  topic: z
    .string()
    .min(3, { message: "Topic must be at least 3 characters long." })
    .max(100, { message: "Topic must be less than 100 characters." }),
  includeLongTailKeywords: z.boolean().default(false).optional(),
});

type KeywordFormValues = z.infer<typeof formSchema>;

interface KeywordToolFormProps {
  onSubmit: (values: SuggestKeywordsInput) => Promise<void>;
  isLoading: boolean;
}

export default function KeywordToolForm({
  onSubmit,
  isLoading,
}: KeywordToolFormProps): JSX.Element {
  const hydrated = useHydration();
  const isMobile = useIsMobile();

  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      includeLongTailKeywords: false,
    },
  });

  const topic = form.watch("topic");

  async function handleFormSubmit(values: KeywordFormValues): Promise<void> {
    try {
      await onSubmit(values as SuggestKeywordsInput);
    } catch (error) {
      console.error("Keyword analysis failed:", error);
      // Error handling could be improved with toast notifications
    }
  }

  return (
    <EnhancedCard
      className="h-full"
      variant="elevated"
    >
      <EnhancedCardHeader>
        <EnhancedCardTitle className="font-headline flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Discover Keywords
        </EnhancedCardTitle>
        <EnhancedCardDescription className="font-body">
          Enter a topic to get AI-powered keyword suggestions with search volume
          and competition analysis.
        </EnhancedCardDescription>
      </EnhancedCardHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6"
          aria-busy={isLoading}
          aria-disabled={isLoading}
        >
          <EnhancedCardContent className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-2">
                      <FormLabel
                        className="font-body text-sm font-medium"
                        htmlFor="topic-input"
                      >
                        Topic or Seed Keyword
                      </FormLabel>
                      <Input
                        id="topic-input"
                        placeholder="e.g., sustainable gardening, AI in marketing, digital photography"
                        {...field}
                        className="font-body"
                        disabled={!hydrated || isLoading}
                        autoComplete="off"
                        aria-describedby="topic-description topic-error"
                      />
                      <FormDescription
                        id="topic-description"
                        className="font-body text-sm text-muted-foreground"
                      >
                        Enter your main topic or a seed keyword to generate
                        related keyword suggestions.
                      </FormDescription>
                      <FormMessage id="topic-error" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="includeLongTailKeywords"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hydrated || isLoading}
                      aria-describedby="longtail-description"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-body text-sm font-medium cursor-pointer">
                      Include Long-tail Keywords
                    </FormLabel>
                    <FormDescription
                      id="longtail-description"
                      className="font-body text-xs text-muted-foreground"
                    >
                      Generate longer, more specific keyword phrases with lower
                      competition.
                    </FormDescription>
                  </div>
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
              loadingText="Analyzing keywords..."
              leftIcon={
                !isLoading ? <Sparkles className="h-4 w-4" /> : undefined
              }
              disabled={!hydrated || isLoading || !topic}
              variant="gradient"
            >
              {isLoading ? "Analyzing Keywords..." : "Generate Keywords"}
            </EnhancedButton>
          </EnhancedCardFooter>
        </form>
      </Form>
    </EnhancedCard>
  );
}
