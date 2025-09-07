// src/components/link-analysis-form.tsx
"use client";

import type { LinkAnalysisInput } from "@/ai/flows/link-analysis";
import { useHydration } from "@/components/HydrationContext";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { asVoidHandler } from "@/lib/react/handlers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  url: z.string().min(1, { message: "Please enter a valid URL." }),
});

type FormValues = z.infer<typeof formSchema>;

interface LinkAnalysisFormProps {
  onFormSubmitAction: (values: FormValues) => Promise<void>;
  isLoading: boolean;
}

export default function LinkAnalysisForm({
  onFormSubmitAction,
  isLoading,
}: LinkAnalysisFormProps) {
  const hydrated = useHydration();

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

    const submissionValues: LinkAnalysisInput = {
      url: normalizeUrl(values.url),
    };
    void onFormSubmitAction(submissionValues);
  }
  const isFormReady = hydrated && !isLoading;

  return (
    <Card className="h-full shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="font-headline">Backlink Analyzer</CardTitle>
        <CardDescription className="font-body">
          Enter a URL to discover its backlink profile.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={asVoidHandler(form.handleSubmit(handleFormSubmit))}>
          <CardContent>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="url-input">URL to Analyze</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="url-input"
                      autoComplete="url"
                      placeholder="www.example.com"
                      disabled={!isFormReady}
                      className={!hydrated ? "opacity-50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!isFormReady}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze Backlinks
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
