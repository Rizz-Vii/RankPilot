// src/components/serp-view-form.tsx
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useHydration } from "@/components/HydrationContext";
import { asVoidHandler } from "@/lib/react/handlers";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  keyword: z.string().min(2, { message: "Please enter a keyword." }),
});

type FormValues = z.infer<typeof formSchema>;

interface SerpViewFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  isLoading: boolean;
}

export default function SerpViewForm({
  onSubmit,
  isLoading,
}: SerpViewFormProps) {
  const hydrated = useHydration();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { keyword: "" },
  });
  const isFormReady = hydrated && !isLoading;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">SERP Visualizer</CardTitle>
        <CardDescription className="font-body">
          Enter a keyword to see a simulated Search Engine Results Page.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={asVoidHandler(form.handleSubmit((vals) => onSubmit(vals)))}
          className="space-y-8"
        >
          <CardContent>
            <FormField
              control={form.control}
              name="keyword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="keyword-input">Keyword</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="keyword-input"
                      name="keyword"
                      autoComplete="off"
                      placeholder="e.g. AI content tools"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Visualize SERP
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
