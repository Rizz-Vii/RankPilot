import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground",
          // subtle static outline + focus treatment (tokens)
          "ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2",
          // disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        // Prevent noisy hydration warnings from extension-injected attributes (e.g., __gchrome_uniqueid)
        suppressHydrationWarning={true}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
