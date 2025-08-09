"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  HelpCircle,
  CheckCircle,
  CreditCard,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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

const faqItems = [
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription anytime from the Billing page in your dashboard. Your access will continue until the end of your current billing period.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "Yes! You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at your next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise customers.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 14-day money-back guarantee for all new subscriptions. Enterprise customers may have custom refund terms.",
  },
  {
    question: "How do I update my billing information?",
    answer:
      "You can update your payment method and billing details from the Billing page in your account dashboard.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely! We use enterprise-grade security measures including SSL encryption, secure data centers, and regular security audits.",
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        {...register("name")}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive-foreground mt-1">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive-foreground mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
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
                      <p className="text-sm text-destructive-foreground mt-1">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      {...register("subject")}
                      className={errors.subject ? "border-destructive" : ""}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive-foreground mt-1">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      {...register("message")}
                      className={errors.message ? "border-destructive" : ""}
                      placeholder="Please describe your issue or question in detail..."
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive-foreground mt-1">
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
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Support Channels */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
                  <div key={index} className="p-4 border rounded-lg">
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
                            <span className="text-green-600">
                              {channel.responseTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">API Services</span>
                    </div>
                    <span className="text-xs text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Dashboard</span>
                    </div>
                    <span className="text-xs text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Billing System</span>
                    </div>
                    <span className="text-xs text-green-600">Operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border rounded-lg">
                    <button
                      onClick={() =>
                        setSelectedFaq(selectedFaq === index ? null : index)
                      }
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{item.question}</h3>
                        <div
                          className={`transition-transform ${selectedFaq === index ? "rotate-180" : ""}`}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                    {selectedFaq === index && (
                      <div className="px-4 pb-4">
                        <p className="text-muted-foreground">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enterprise Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
                <Phone className="h-4 w-4 mr-2" />
                Contact Enterprise Sales
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

