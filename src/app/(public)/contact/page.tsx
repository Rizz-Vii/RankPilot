"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const supportCategories = [
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Support" },
  { value: "account", label: "Account Management" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "general", label: "General Inquiry" },
];

const supportChannels = [
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Email Support",
    description: "Get help via email within 24 hours",
    contact: "support@rankpilot.com",
    availability: "24/7",
    responseTime: "< 24 hours",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Live Chat",
    description: "Chat with our support team in real-time",
    contact: "Available in dashboard",
    availability: "Mon-Fri 9AM-6PM EST",
    responseTime: "< 5 minutes",
  },
  {
    icon: <Phone className="h-6 w-6" />,
    title: "Phone Support",
    description: "Speak directly with our experts",
    contact: "+1 (555) 123-4567",
    availability: "Enterprise customers only",
    responseTime: "Immediate",
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Motion helpers with reduced-motion + mobile-aware tuning
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fadeIn = useMemo(() => {
    if (reduceMotion) {
      return {
        hidden: { opacity: 0 },
        visible: (i: number) => ({
          opacity: 1,
          transition: { delay: Math.min(i * 0.05, 0.3), duration: 0.25 },
        }),
      } as const;
    }
    const baseDuration = isMobile ? 0.35 : 0.6;
    const baseDelay = isMobile ? 0.08 : 0.15;
    return {
      hidden: { opacity: 0, y: 24 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * baseDelay, duration: baseDuration },
      }),
    } as const;
  }, [reduceMotion, isMobile]);

  const viewport = { once: true, amount: 0.2 } as const;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(err.message || "Failed to send message");
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch (error: unknown) {
      console.error("Contact form error:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stable submit handler (explicitly depends on handleSubmit & onSubmit for exhaustive-deps compliance)
  // Inline wrapper removes need for useCallback (avoids dependency warning while still voiding promise)
  const submitHandler = (e: React.FormEvent) => {
    void handleSubmit(onSubmit)(e);
  };

  return (
    <div className="min-h-[100dvh] sm:min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeIn}
          custom={0}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold font-headline">
              Contact Support
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Need help? We're here for you. Get support via your preferred
            channel.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Contact Form */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={1}
          >
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as
                  possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={submitHandler}
                  className="space-y-4"
                  role="form"
                  aria-describedby="contact-form-status"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your full name"
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? "name-error" : undefined
                        }
                        {...register("name")}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p
                          id="name-error"
                          className="text-sm text-destructive-foreground mt-1"
                        >
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        aria-describedby={
                          errors.email ? "email-error" : undefined
                        }
                        {...register("email")}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p
                          id="email-error"
                          className="text-sm text-destructive-foreground mt-1"
                        >
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      aria-invalid={!!errors.category}
                      aria-describedby={
                        errors.category ? "category-error" : undefined
                      }
                      {...register("category")}
                      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.category ? "border-destructive" : ""}`}
                    >
                      <option value="">Select a category</option>
                      {supportCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p
                        id="category-error"
                        className="text-sm text-destructive-foreground mt-1"
                      >
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      aria-invalid={!!errors.subject}
                      aria-describedby={
                        errors.subject ? "subject-error" : undefined
                      }
                      {...register("subject")}
                      className={errors.subject ? "border-destructive" : ""}
                    />
                    {errors.subject && (
                      <p
                        id="subject-error"
                        className="text-sm text-destructive-foreground mt-1"
                      >
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      aria-invalid={!!errors.message}
                      aria-describedby={
                        errors.message ? "message-error" : undefined
                      }
                      {...register("message")}
                      className={errors.message ? "border-destructive" : ""}
                      placeholder="Please describe your issue or question in detail..."
                    />
                    {errors.message && (
                      <p
                        id="message-error"
                        className="text-sm text-destructive-foreground mt-1"
                      >
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Message...
                      </div>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                  <p
                    id="contact-form-status"
                    role="status"
                    aria-live="polite"
                    className="sr-only"
                  >
                    {isSubmitting
                      ? "Submitting"
                      : errors
                        ? "Form has validation errors"
                        : "Ready"}
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Support Channels */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeIn}
            custom={2}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Support Channels</CardTitle>
                <CardDescription>
                  Choose your preferred way to get help
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {supportChannels.map((channel, index) => (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewport}
                    variants={fadeIn}
                    custom={index + 3}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        {channel.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{channel.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {channel.description}
                        </p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Contact:
                            </span>
                            <span className="font-medium">
                              {channel.contact}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Available:
                            </span>
                            <span>{channel.availability}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Response:
                            </span>
                            <span className="text-success-foreground">
                              {channel.responseTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success-foreground" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm">API Services</span>
                    </div>
                    <span className="text-xs text-success-foreground">
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm">Dashboard</span>
                    </div>
                    <span className="text-xs text-success-foreground">
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm">Billing System</span>
                    </div>
                    <span className="text-xs text-success-foreground">
                      Operational
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enterprise Contact */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeIn}
          custom={supportChannels.length + 4}
          className="mt-16"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Enterprise Support</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Need dedicated support for your team? Our enterprise customers
                get priority support, dedicated account managers, and custom
                solutions.
              </p>
              <Button size="lg">
                <Phone className="h-4 w-4 mr-2" /> Contact Enterprise Sales
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
