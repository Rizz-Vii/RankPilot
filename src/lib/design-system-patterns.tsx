// Design System Component Patterns for RankPilot NeuroSEO™
// Based on homepage and site-header professional patterns

import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ===== ERROR HANDLING PATTERNS =====

// ❌ AVOID: Arbitrary palette tokens (example shown for documentation only, replaced with semantic)
const ErrorMessageBad = ({ message }: { message: string }) => (
  <p className="text-sm text-destructive mt-1">{message}</p>
);

// ✅ USE: Semantic error tokens
const ErrorMessage = ({ message }: { message: string }) => (
  <p className="text-sm text-destructive-foreground font-body mt-1">
    {message}
  </p>
);

// ✅ USE: Error input styling
const ErrorInput = ({
  error,
  ...props
}: {
  error?: string;
  [key: string]: any;
}) => (
  <input
    className={`border ${error ? "border-destructive" : "border-input"} rounded-md px-3 py-2`}
    {...props}
  />
);

// ===== SUCCESS STATE PATTERNS =====

// ✅ USE: Success messaging
const SuccessMessage = ({ message }: { message: string }) => (
  <p className="text-sm text-success-foreground font-body mt-1">{message}</p>
);

const SuccessBadge = ({ children }: { children: React.ReactNode }) => (
  <Badge
    variant="outline"
    className="bg-success/10 text-success-foreground border-success"
  >
    {children}
  </Badge>
);

// ===== TYPOGRAPHY PATTERNS =====

// ✅ USE: Consistent typography hierarchy
const PageHeading = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-4xl font-bold font-headline text-foreground mb-4">
    {children}
  </h1>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-semibold font-headline text-foreground mb-3">
    {children}
  </h2>
);

const BodyText = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p className={`text-base font-body text-muted-foreground ${className}`}>
    {children}
  </p>
);

// ===== BUTTON PATTERNS =====

// ✅ USE: Consistent button styling (following site-header pattern)
const PrimaryAction = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => (
  <EnhancedButton className="font-body" {...props}>
    {children}
  </EnhancedButton>
);

const SecondaryAction = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => (
  <EnhancedButton variant="outline" className="font-body" {...props}>
    {children}
  </EnhancedButton>
);

// ===== CARD PATTERNS =====

// ✅ USE: Professional card layout (following homepage pattern)
const FeatureCard = ({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) => (
  <Card className="h-full">
    <CardHeader className="flex flex-row items-center gap-3">
      {Icon && <Icon className="h-6 w-6 text-primary" />}
      <div>
        <CardTitle className="text-xl font-headline">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <BodyText className="mb-4">{description}</BodyText>
      {children}
    </CardContent>
  </Card>
);

// ===== PAGE LAYOUT PATTERNS =====

// ✅ USE: Consistent page structure
const PageLayout = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      <div className="text-center mb-16">
        <PageHeading>{title}</PageHeading>
        {description && (
          <BodyText className="text-xl max-w-3xl mx-auto">
            {description}
          </BodyText>
        )}
      </div>
      {children}
    </div>
  </div>
);

// ===== FORM PATTERNS =====

// ✅ USE: Consistent form styling
const FormField = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium font-body text-foreground">
      {label}
    </label>
    {children}
    {error && <ErrorMessage message={error} />}
  </div>
);

// ===== STATUS INDICATORS =====

// ✅ USE: Semantic status colors
const StatusIndicator = ({
  status,
  children,
}: {
  status: "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}) => {
  const statusClasses = {
    success: "bg-success/10 text-success-foreground border-success",
    warning: "bg-warning/10 text-warning-foreground border-warning",
    error: "bg-destructive/10 text-destructive-foreground border-destructive",
    info: "bg-primary/10 text-primary border-primary",
  };

  return (
    <div className={`rounded-md border px-4 py-3 ${statusClasses[status]}`}>
      <p className="text-sm font-body">{children}</p>
    </div>
  );
};

// ===== NEUROSEO™ BRANDING PATTERNS =====

// ✅ USE: Consistent NeuroSEO™ branding
const NeuroSEOBadge = () => (
  <Badge className="bg-primary text-primary-foreground font-body">
    NeuroSEO™
  </Badge>
);

const AIFeatureBadge = ({ children }: { children: React.ReactNode }) => (
  <Badge
    variant="outline"
    className="bg-primary/10 text-primary border-primary font-body"
  >
    🧠 {children}
  </Badge>
);

export {
  // Error handling
  ErrorMessage,
  ErrorInput,

  // Success states
  SuccessMessage,
  SuccessBadge,

  // Typography
  PageHeading,
  SectionHeading,
  BodyText,

  // Buttons
  PrimaryAction,
  SecondaryAction,

  // Cards
  FeatureCard,

  // Layout
  PageLayout,

  // Forms
  FormField,

  // Status
  StatusIndicator,

  // Branding
  NeuroSEOBadge,
  AIFeatureBadge,
};

// ===== USAGE EXAMPLES =====

// Example page implementation following patterns
const ExamplePage = () => (
  <PageLayout
    title="NeuroSEO™ Dashboard"
    description="Professional AI-powered SEO intelligence platform"
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FeatureCard
        title="Site Audit"
        description="Enterprise-grade crawling with NeuroSEO™ intelligence"
        icon={() => <div className="w-6 h-6 bg-primary rounded" />}
      >
        <PrimaryAction>Start Audit</PrimaryAction>
      </FeatureCard>

      <FeatureCard
        title="Keyword Intelligence"
        description="AI-powered keyword analysis and optimization"
        icon={() => <div className="w-6 h-6 bg-primary rounded" />}
      >
        <SecondaryAction>View Keywords</SecondaryAction>
      </FeatureCard>
    </div>

    <div className="mt-8">
      <StatusIndicator status="success">
        NeuroSEO™ Suite is operating at 99.9% uptime
      </StatusIndicator>
    </div>
  </PageLayout>
);
