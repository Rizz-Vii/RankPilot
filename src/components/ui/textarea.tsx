import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
  <textarea
      className={cn(
    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground",
    // subtle static outline + focus treatment (tokens)
    "ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2",
    // disabled
    "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
  // Prevent hydration warnings from extension-injected attributes
  suppressHydrationWarning={true}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
