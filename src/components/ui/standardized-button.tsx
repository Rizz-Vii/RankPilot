/**
 * Standardized Button Component - Eliminates UI/UX Inconsistencies
 * Replaces scattered button styling patterns across the application
 */

import { cn } from "@/lib/utils";
import { colors } from "@/lib/design-system/colors";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

// Standardized button variants - replaces inconsistent patterns
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants for RankPilot
        success: `${colors.status.success.bg} ${colors.status.success.text} hover:bg-success/20`,
        warning: `${colors.status.warning.bg} ${colors.status.warning.text} hover:bg-warning/20`,
        info: `${colors.status.info.bg} ${colors.status.info.text} hover:bg-primary/20`,
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

/**
 * Standardized spacing and layout utilities
 * Replaces inconsistent gap/margin/padding patterns
 */
export const spacing = {
  xs: "0.5rem", // 8px
  sm: "1rem", // 16px
  md: "1.5rem", // 24px
  lg: "2rem", // 32px
  xl: "3rem", // 48px
  "2xl": "4rem", // 64px
} as const;

/**
 * Standardized container widths
 * Replaces max-w-* inconsistencies
 */
export const containerSizes = {
  xs: "max-w-xs", // 320px
  sm: "max-w-sm", // 384px
  md: "max-w-md", // 448px
  lg: "max-w-lg", // 512px
  xl: "max-w-xl", // 576px
  "2xl": "max-w-2xl", // 672px
  "3xl": "max-w-3xl", // 768px
  "4xl": "max-w-4xl", // 896px
  "5xl": "max-w-5xl", // 1024px
  "6xl": "max-w-6xl", // 1152px
} as const;

/**
 * Common button combinations for consistent UX
 */
export const ButtonCombinations = {
  PrimaryAction: ({ children, ...props }: ButtonProps) => (
    <Button variant="default" size="lg" {...props}>
      {children}
    </Button>
  ),

  SecondaryAction: ({ children, ...props }: ButtonProps) => (
    <Button variant="outline" size="lg" {...props}>
      {children}
    </Button>
  ),

  DestructiveAction: ({ children, ...props }: ButtonProps) => (
    <Button variant="destructive" size="default" {...props}>
      {children}
    </Button>
  ),

  SuccessAction: ({ children, ...props }: ButtonProps) => (
    <Button variant="success" size="default" {...props}>
      {children}
    </Button>
  ),

  FormSubmit: ({ children, loading, ...props }: ButtonProps) => (
    <Button
      variant="default"
      size="default"
      fullWidth
      loading={loading}
      {...props}
    >
      {children || "Submit"}
    </Button>
  ),

  LinkStyle: ({ children, ...props }: ButtonProps) => (
    <Button variant="link" size="sm" {...props}>
      {children}
    </Button>
  ),
};
