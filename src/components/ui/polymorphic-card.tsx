"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";

// ===== POLYMORPHIC CARD WITH SLOT-BASED COMPOSITION =====

const polymorphicCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "hover:shadow-md",
        interactive:
          "hover:shadow-lg cursor-pointer transform hover:scale-[1.02]",
        elevated: "shadow-lg hover:shadow-xl",
        minimal: "border-0 shadow-none bg-transparent",
        outlined: "border-2 shadow-none",
      },
      size: {
        sm: "p-3",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      spacing: {
        none: "p-0",
        tight: "space-y-2",
        default: "space-y-4",
        loose: "space-y-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      spacing: "default",
    },
  }
);

// ===== POLYMORPHIC BASE COMPONENT =====

type PolymorphicCardElement = React.ElementRef<"div">;

type BaseDivProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "onDrag" | "onDragStart" | "onDragEnd"
>;

interface PolymorphicCardProps
  extends BaseDivProps,
    VariantProps<typeof polymorphicCardVariants> {
  asChild?: boolean;
  /**
   * Render as motion component for animations
   */
  motion?: boolean;
  /**
   * Animation configuration for motion variant
   */
  animation?: {
    initial?: unknown;
    animate?: unknown;
    whileHover?: unknown;
    whileTap?: unknown;
    transition?: unknown;
  };
  /**
   * Slot-based content areas for composition
   */
  slots?: {
    header?: React.ReactNode;
    content?: React.ReactNode;
    footer?: React.ReactNode;
    actions?: React.ReactNode;
  };
}

const PolymorphicCard = React.forwardRef<
  PolymorphicCardElement,
  PolymorphicCardProps
>(
  (
    {
      className,
      variant,
      size,
      spacing,
      asChild = false,
      motion: useMotion = false,
      animation,
      slots,
      children,
      ...props
    },
    ref
  ) => {
    const Comp: React.ElementType = asChild
      ? Slot
      : useMotion
        ? motion.div
        : "div";

    // Use static mappings instead of dynamic template classes to satisfy Tailwind JIT
    const spacingToStack: Record<
      NonNullable<PolymorphicCardProps["spacing"]>,
      string
    > = {
      none: "",
      tight: "space-y-2",
      default: "space-y-4",
      loose: "space-y-6",
    } as const;

    const cardContent = slots ? (
      <div
        className={cn("flex flex-col", spacingToStack[spacing ?? "default"])}
      >
        {slots.header && (
          <div className="card-header" data-slot="header">
            {slots.header}
          </div>
        )}
        {slots.content && (
          <div className="card-content flex-1" data-slot="content">
            {slots.content}
          </div>
        )}
        {slots.actions && (
          <div className="card-actions" data-slot="actions">
            {slots.actions}
          </div>
        )}
        {slots.footer && (
          <div className="card-footer" data-slot="footer">
            {slots.footer}
          </div>
        )}
      </div>
    ) : (
      children
    );

    const motionProps = useMotion && animation ? animation : undefined;

    return (
      <Comp
        ref={ref}
        className={cn(
          polymorphicCardVariants({ variant, size, spacing }),
          className
        )}
        {...(motionProps ?? {})}
        {...props}
      >
        {cardContent}
      </Comp>
    );
  }
);
PolymorphicCard.displayName = "PolymorphicCard";

// ===== SLOT-BASED HEADER COMPONENT =====

interface CardHeaderSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  /**
   * Visual hierarchy level
   */
  level?: "primary" | "secondary" | "tertiary";
  /**
   * Actions to display alongside header
   */
  actions?: React.ReactNode;
}

const CardHeaderSlot = React.forwardRef<HTMLDivElement, CardHeaderSlotProps>(
  (
    {
      className,
      asChild = false,
      level = "primary",
      actions,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";

    const levelClasses = {
      primary: "text-lg font-semibold",
      secondary: "text-base font-medium",
      tertiary: "text-sm font-normal",
    };

    return (
      <Comp
        ref={ref}
        className={cn("flex items-center justify-between", className)}
        {...props}
      >
        <div className={cn("flex flex-col space-y-1.5", levelClasses[level])}>
          {children}
        </div>
        {actions && (
          <div
            className="flex items-center space-x-2"
            data-slot="header-actions"
          >
            {actions}
          </div>
        )}
      </Comp>
    );
  }
);
CardHeaderSlot.displayName = "CardHeaderSlot";

// ===== CONTENT SLOT WITH SCROLLABLE OPTION =====

interface CardContentSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  /**
   * Make content scrollable with max height
   */
  scrollable?: boolean;
  /**
   * Maximum height for scrollable content
   */
  maxHeight?: string;
}

const CardContentSlot = React.forwardRef<HTMLDivElement, CardContentSlotProps>(
  (
    {
      className,
      asChild = false,
      scrollable = false,
      maxHeight = "400px",
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        className={cn("flex-1", scrollable && "overflow-auto", className)}
        style={scrollable ? { maxHeight } : undefined}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardContentSlot.displayName = "CardContentSlot";

// ===== ACTIONS SLOT WITH RESPONSIVE LAYOUT =====

interface CardActionsSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  /**
   * Alignment of actions
   */
  align?: "start" | "center" | "end" | "between";
  /**
   * Stack actions on mobile
   */
  responsive?: boolean;
}

const CardActionsSlot = React.forwardRef<HTMLDivElement, CardActionsSlotProps>(
  (
    {
      className,
      asChild = false,
      align = "end",
      responsive = true,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";

    const alignClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          "flex items-center gap-2",
          alignClasses[align],
          responsive && "flex-col sm:flex-row",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardActionsSlot.displayName = "CardActionsSlot";

// ===== USAGE PATTERNS =====

export {
  CardActionsSlot,
  CardContentSlot,
  CardHeaderSlot,
  PolymorphicCard,
  polymorphicCardVariants,
  type CardActionsSlotProps,
  type CardContentSlotProps,
  type CardHeaderSlotProps,
  type PolymorphicCardProps,
};

// ===== USAGE EXAMPLES =====

/*
// Basic usage with slots
<PolymorphicCard
  variant="interactive"
  slots={{
    header: <h3>Card Title</h3>,
    content: <p>Card content here</p>,
    actions: <Button>Action</Button>
  }}
/>

// Polymorphic usage as Link
<PolymorphicCard asChild variant="interactive">
  <Link href="/somewhere">
    <h3>Clickable Card</h3>
    <p>This entire card is a link</p>
  </Link>
</PolymorphicCard>

// Motion usage with animations
<PolymorphicCard
  motion
  animation={{
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileHover: { scale: 1.02 }
  }}
>
  <h3>Animated Card</h3>
</PolymorphicCard>

// Composition with individual slots
<PolymorphicCard variant="elevated">
  <CardHeaderSlot level="primary" actions={<Button size="sm">Edit</Button>}>
    <h3>Dynamic Header</h3>
    <p>With actions</p>
  </CardHeaderSlot>
  <CardContentSlot scrollable maxHeight="300px">
    <div>Scrollable content...</div>
  </CardContentSlot>
  <CardActionsSlot align="between" responsive>
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardActionsSlot>
</PolymorphicCard>
*/
