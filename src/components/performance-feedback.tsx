"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { severityButtonClasses, severityClasses } from '@/lib/ui/status-colors';
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Send,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";

// Map severity to semantic token-based classes (success|warning|destructive)
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
const getSeverityColor = (severity: string): string => {
  const level = severity.toLowerCase() as SeverityLevel;
  if (["critical","high","medium","low"].includes(level)) {
    return severityButtonClasses(level);
  }
  return "bg-muted text-foreground hover:bg-muted/80";
};

interface FeedbackData {
  operationType: string;
  rating: number;
  responseTime: number;
  feedback: string;
  category: "performance" | "accuracy" | "usability" | "bug" | "feature";
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  userId?: string;
}

interface PerformanceFeedbackProps {
  operationType: string;
  responseTime: number;
  onSubmit?: (feedback: FeedbackData) => void;
  autoShow?: boolean;
  showThreshold?: number; // Show feedback form if response time exceeds this (ms)
}

export function PerformanceFeedback({
  operationType,
  responseTime,
  onSubmit,
  autoShow = false,
  showThreshold = 10000, // 10 seconds
}: PerformanceFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] =
    useState<FeedbackData["category"]>("performance");
  const [severity, setSeverity] = useState<FeedbackData["severity"]>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (autoShow && responseTime > showThreshold) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Show 2 seconds after slow response
      return () => clearTimeout(timer);
    }
  }, [autoShow, responseTime, showThreshold]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Please provide a rating",
        description: "Rating is required to submit feedback",
      });
      return;
    }

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      operationType,
      rating,
      responseTime,
      feedback,
      category,
      severity,
      timestamp: new Date(),
    };

    try {
      if (onSubmit) {
        await onSubmit(feedbackData);
      }

      // Store in localStorage for demo purposes
      const existingFeedback = JSON.parse(
        localStorage.getItem("ai-feedback") || "[]"
      );
      existingFeedback.push(feedbackData);
      localStorage.setItem("ai-feedback", JSON.stringify(existingFeedback));

      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
      });

  setIsVisible(false);
  // Reset form state
  setRating(0);
  setFeedback("");
  setCategory('performance');
  setSeverity('medium');
    } catch {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Could not submit feedback. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className={`p-1 rounded transition-colors ${
              star <= rating
                ? "text-warning-foreground hover:text-warning-foreground/80"
                : "text-muted-foreground hover:text-muted-foreground/80"
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-36 right-4 z-50"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-36 right-4 z-50 w-96"
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Operation Feedback
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                aria-label="Close feedback form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {(responseTime / 1000).toFixed(1)}s
              </div>
              <Badge variant="outline" className="text-xs">
                {operationType}
              </Badge>
              {responseTime > showThreshold && (
                <Badge className={`${severityClasses('high', { variant: 'subtle' })} text-xs`}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Slow Response
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Rating */}
            <div>
              <Label className="text-sm font-medium">Rate this operation</Label>
              <div className="mt-1">{renderStars()}</div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={category}
                onValueChange={(value: FeedbackData["category"]) =>
                  setCategory(value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                  <SelectItem value="usability">Usability</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div>
              <Label className="text-sm font-medium">Severity</Label>
              <Select
                value={severity}
                onValueChange={(value: FeedbackData["severity"]) =>
                  setSeverity(value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback */}
            <div>
              <Label className="text-sm font-medium">
                Additional feedback{" "}
                {responseTime > showThreshold && "(optional)"}
              </Label>
              <Textarea
                placeholder="Tell us about your experience..."
                value={feedback}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => { void handleSubmit(); }}
                disabled={isSubmitting || rating === 0}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsVisible(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing feedback collection
export function useFeedbackCollection(operationType: string) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [responseTime, setResponseTime] = useState(0);

  const startOperation = () => {
    setStartTime(Date.now());
    setShowFeedback(false);
  };

  const endOperation = (forceShow: boolean = false) => {
    if (startTime) {
      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);

      // Auto-show feedback for slow operations or force show
      if (forceShow || elapsed > 8000) {
        setShowFeedback(true);
      }
    }
  };

  const hideFeedback = () => {
    setShowFeedback(false);
  };

  return {
    startOperation,
    endOperation,
    hideFeedback,
    showFeedback,
    responseTime,
    FeedbackComponent: showFeedback ? (
      <PerformanceFeedback
        operationType={operationType}
        responseTime={responseTime}
        autoShow={false}
        onSubmit={(feedback) => {
          console.log("Feedback submitted:", feedback);
          hideFeedback();
        }}
      />
    ) : null,
  };
}

// Feedback summary component for dashboard
export function FeedbackSummary() {
  const [feedbackData, setFeedbackData] = useState<FeedbackData[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("ai-feedback");
    if (stored) {
      setFeedbackData(JSON.parse(stored));
    }
  }, []);

  const averageRating = feedbackData.length > 0
    ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
    : 0;

  const categoryBreakdown = feedbackData.reduce(
    (acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const severityBreakdown = feedbackData.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4" />
            User Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= averageRating
                      ? "text-warning-foreground fill-current"
                      : "text-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              ({feedbackData.length} reviews)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Issue Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(severityBreakdown).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <Badge className={getSeverityColor(severity)}>{severity}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Feedback Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{cat}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(categoryBreakdown).length === 0 && (
              <div className="text-xs text-muted-foreground">No feedback yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
