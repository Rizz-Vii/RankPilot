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
    _error,
    helper,
    children,
    className,
    required = false,
}: EnhancedFormFieldProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className={cn(
                    typography.ui.label,
                    "block",
                    required && "after:content-['*'] after:ml-0.5 after:text-red-500"
                )}>
                    {label}
                </Label>
            )}
            <div className={spacing.touch.comfortable}>
                {children}
            </div>
            {helper && !error && (
                <p className={cn(
                    typography.ui.helper,
                    colors.text.muted
                )}>
                    {helper}
                </p>
            )}
            {error && (
                <p className={cn(
                    typography.ui.helper,
                    colors.status.error.text,
                    "flex items-center gap-1"
                )}>
                    <span className="text-red-500">⚠</span>
                    {error}
                </p>
            )}
        </div>
    );
}

interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
        ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    const sizes = {
        sm: cn(spacing.touch.min, "px-3 text-sm"),
        base: cn(spacing.touch.comfortable, "px-4"),
        lg: cn(spacing.touch.large, "px-6 text-lg"),
    };

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

interface EnhancedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    placeholder?: string;
    options: { _value: string; label: string; }[];
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
                "block w-full rounded-md border-gray-300 shadow-sm",
                "focus:border-blue-500 focus:ring-blue-500",
                spacing.touch.comfortable,
                "bg-white text-gray-900",
                "disabled:bg-gray-50 disabled:text-gray-500",
                className
            )}
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
