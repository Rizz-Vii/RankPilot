import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FormCardProps = {
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function FormCard({
  title,
  description,
  children,
  className,
}: FormCardProps) {
  return (
    <Card className={cn("bg-card text-card-foreground border", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="font-headline">{title}</CardTitle>}
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
