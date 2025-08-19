"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import type { ErrorInfo, ReactNode } from "react";
import React, { Component } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error);
      console.error("Error Info:", errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  override componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        eventId: null,
      });
    }, 100);
  };

  reportProblem = () => {
    const { error, errorInfo, eventId } = this.state;
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toISOString();

    const errorReport = {
      eventId,
      timestamp,
      userAgent,
      url: window.location.href,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
    };

    // In a real app, you'd send this to your error reporting service
    console.log("Error Report:", errorReport);

    // For now, just copy to clipboard
    navigator.clipboard?.writeText(JSON.stringify(errorReport, null, 2));

    // You could show a toast notification here
    alert(
      "Error details copied to clipboard. Please send this to our support team."
    );
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, eventId } = this.state;
      const { showDetails = false } = this.props;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl w-full"
          >
            <div className="text-center space-y-6">
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="rounded-full bg-destructive/10 p-6">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </motion.div>

              {/* Error Message */}
              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-foreground">
                  Oops! Something went wrong
                </h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  We've encountered an unexpected error. Don't worry, our team
                  has been notified.
                </p>
              </div>

              {/* Error Details */}
              {showDetails && error && (
                <Alert variant="destructive" className="text-left">
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div className="font-medium">
                      {error.name}: {error.message}
                    </div>
                    {eventId && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Error ID:</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {eventId}
                        </Badge>
                      </div>
                    )}
                    {process.env.NODE_ENV === "development" && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Stack Trace (Development)
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-muted rounded">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  onClick={this.resetErrorBoundary}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>

                <Button
                  variant="ghost"
                  onClick={this.reportProblem}
                  className="flex items-center gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Report Problem
                </Button>
              </div>

              {/* Additional Help */}
              <div className="text-sm text-muted-foreground">
                If this problem persists, please{" "}
                <a href="/contact" className="text-primary hover:underline">
                  contact our support team
                </a>
                {eventId && (
                  <>
                    {" "}
                    and include error ID:{" "}
                    <code className="bg-muted px-1 rounded font-mono text-xs">
                      {eventId}
                    </code>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default EnhancedErrorBoundary;
