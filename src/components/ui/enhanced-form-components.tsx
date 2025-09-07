/**
 * Enhanced Form Components
 * Consistent form styling with design system integration
 */

import { Label } from "@/components/ui/label";
import { colors } from "@/lib/design-system/colors";
import { spacing } from "@/lib/design-system/spacing";
import { typography } from "@/lib/design-system/typography";
import { cn } from "@/lib/utils";
import React from "react";

interface EnhancedFormFieldProps {
  label?: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function EnhancedFormField({
  label,
  error,
  helper,
  children,
  className,
  required = false,
}: EnhancedFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          className={cn(
            typography.ui.label,
            "block",
            required &&
              `after:content-['*'] after:ml-0.5 ${colors.status.error.text}`
          )}
        >
          {label}
        </Label>
      )}
      <div className={spacing.touch.comfortable}>{children}</div>
      {helper && !error && (
        <p className={cn(typography.ui.helper, colors.text.muted)}>{helper}</p>
      )}
      {error && (
        <p
          className={cn(
            typography.ui.helper,
            colors.status.error.text,
            "flex items-center gap-1"
          )}
        >
          <span className={colors.status.error.text}>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "base" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function EnhancedButton({
  variant = "primary",
  size = "base",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: EnhancedButtonProps) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/90 focus:ring-ring",
    outline:
      "border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring",
    ghost:
      "text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-ring",
  } as const;

  const sizes = {
    sm: cn(spacing.touch.min, "px-3 text-sm"),
    base: cn(spacing.touch.comfortable, "px-4"),
    lg: cn(spacing.touch.large, "px-6 text-lg"),
  } as const;

  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Variant styles
        variants[variant],
        // Size styles
        sizes[size],
        // Custom className
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

interface EnhancedSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  options: { value: string; label: string }[];
}

export function EnhancedSelect({
  placeholder,
  options,
  className,
  ...props
}: EnhancedSelectProps) {
  return (
    <select
      className={cn(
        "block w-full rounded-md border border-input shadow-sm",
        "bg-card text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        spacing.touch.comfortable,
        "disabled:bg-muted disabled:text-muted-foreground",
        className
      )}
      // Prevent hydration warnings if extensions add attributes
      suppressHydrationWarning={true}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default { EnhancedFormField, EnhancedButton, EnhancedSelect };
