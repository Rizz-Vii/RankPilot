// src/components/competitor-analysis-form.tsx
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  yourUrl: z.string().min(1, { message: "Please enter your website URL." }),
  competitorUrls: z
    .string()
    .min(1, { message: "Please enter at least one competitor URL." }),
  keywords: z
    .string()
    .min(1, { message: "Please enter at least one keyword." }),
});

type FormValues = z.infer<typeof formSchema>;

interface CompetitorAnalysisFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  isLoading: boolean;
}

export default function CompetitorAnalysisForm({
  onSubmit,
  isLoading,
}: CompetitorAnalysisFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      yourUrl: "",
      competitorUrls: "",
      keywords: "",
    },
  });

  async function handleSubmit(values: FormValues) {
    // Await to avoid floating promise lint warning and surface errors if needed later.
    await onSubmit(values);
  }

  // Provide a stable sync wrapper so the onSubmit attribute does not receive a promise-returning function directly.
  const handleFormEvent: React.FormEventHandler<HTMLFormElement> = (e) => {
    void form.handleSubmit(handleSubmit)(e);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Competitor Analysis</CardTitle>
        <CardDescription className="font-body">
          Compare your keyword rankings against your competitors.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={handleFormEvent}
          className="space-y-8"
        >
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="yourUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="yourwebsite.com"
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
              name="competitorUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competitor URLs</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="competitor1.com, competitor2.com"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of competitor URLs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="seo tools, content marketing, ai writing"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of keywords to analyze.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze Competitors
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
