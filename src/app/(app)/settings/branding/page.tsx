"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import LoadingScreen from "@/components/ui/loading-screen";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette,
  Upload,
  Eye,
  Download,
  Settings,
  FileText,
  Monitor,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { TutorialBanner } from "@/components/tutorials/TutorialBanner";

interface BrandingSettings {
  companyName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCSS: string;
}

interface ReportSettings {
  showPoweredBy: boolean;
  customFooter: string;
  headerText: string;
  contactInfo: string;
  disclaimerText: string;
  reportTemplate: "modern" | "classic" | "minimal";
}

export default function WhiteLabelPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: "",
    logo: "",
    favicon: "",
    // Token defaults (Tailwind / design system vars) instead of raw hex literals
    primaryColor: "hsl(var(--primary))",
    secondaryColor: "hsl(var(--secondary))",
    accentColor: "hsl(var(--accent))",
    fontFamily: "Inter",
    customCSS: "",
  });
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    showPoweredBy: false,
    customFooter: "",
    headerText: "",
    contactInfo: "",
    disclaimerText: "",
    reportTemplate: "modern",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );

  useEffect(() => {
    if (user && canUseFeature("white_label")) {
      fetchBrandingSettings();
    }
  }, [user, canUseFeature]);

  const fetchBrandingSettings = async () => {
    try {
      // Mock data - replace with actual API call
      const mockBranding: BrandingSettings = {
        companyName: "Acme SEO Solutions",
        logo: "/images/sample-logo.png",
        favicon: "/images/sample-favicon.ico",
        primaryColor: "hsl(var(--primary))",
        secondaryColor: "hsl(var(--secondary))",
        accentColor: "hsl(var(--accent))",
        fontFamily: "Inter",
        customCSS: "/* Custom styles */\n.header { border-radius: 8px; }",
      };

      const mockReportSettings: ReportSettings = {
        showPoweredBy: false,
        customFooter: "© 2024 Acme SEO Solutions. All rights reserved.",
        headerText: "Professional SEO Analysis Report",
        contactInfo: "contact@acmeseo.com | (555) 123-4567",
        disclaimerText:
          "This report is confidential and intended for internal use only.",
        reportTemplate: "modern",
      };

      setBranding(mockBranding);
      setReportSettings(mockReportSettings);
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      toast.error("Failed to load branding settings");
    } finally {
      setLoading(false);
    }
  };

  const saveBrandingSettings = async () => {
    setIsSaving(true);
    try {
      // Mock implementation - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Branding settings saved successfully");
    } catch (error) {
      console.error("Error saving branding settings:", error);
      toast.error("Failed to save branding settings");
    } finally {
      setIsSaving(false);
    }
  };

  const saveReportSettings = async () => {
    setIsSaving(true);
    try {
      // Mock implementation - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Report settings saved successfully");
    } catch (error) {
      console.error("Error saving report settings:", error);
      toast.error("Failed to save report settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size should be less than 2MB");
      return;
    }

    try {
      // Mock implementation - replace with actual file upload
      const mockUrl = URL.createObjectURL(file);
      setBranding((prev) => ({ ...prev, logo: mockUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    }
  };

  const generatePreviewReport = () => {
    // Mock implementation - would generate a sample report with current branding
    toast.success("Preview report generated! Check your downloads folder.");
  };

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading white-label settings..." />;
  }

  return (
    <FeatureGate requiredTier="enterprise" feature="white_label">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline">
              White-Label Settings
            </h1>
            <p className="text-muted-foreground font-body">
              Customize the appearance and branding of your reports and
              dashboard.
            </p>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic company details that will appear on reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={branding.companyName}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder="Enter your company name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logo & Visual Identity */}
            <Card>
              <CardHeader>
                <CardTitle>Logo & Visual Identity</CardTitle>
                <CardDescription>
                  Upload your logo and set visual preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="mt-2 space-y-4">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        {branding.logo ? (
                          <div className="space-y-2">
                            <img
                              src={branding.logo}
                              alt="Company Logo"
                              className="h-16 mx-auto object-contain"
                            />
                            <p className="text-sm text-muted-foreground">
                              Current logo
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              No logo uploaded
                            </p>
                          </div>
                        )}
                      </div>
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: PNG or JPG, max 2MB, 200x60px for best
                        results
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={branding.primaryColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              primaryColor: e.target.value,
                            }))
                          }
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={branding.primaryColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              primaryColor: e.target.value,
                            }))
                          }
                          placeholder="hsl(var(--primary))"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={branding.secondaryColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              secondaryColor: e.target.value,
                            }))
                          }
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={branding.secondaryColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              secondaryColor: e.target.value,
                            }))
                          }
                          placeholder="hsl(var(--secondary))"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={branding.accentColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              accentColor: e.target.value,
                            }))
                          }
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={branding.accentColor}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              accentColor: e.target.value,
                            }))
                          }
                          placeholder="hsl(var(--accent))"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customCSS">Custom CSS</Label>
                  <Textarea
                    id="customCSS"
                    value={branding.customCSS}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        customCSS: e.target.value,
                      }))
                    }
                    placeholder="/* Add custom CSS for advanced styling */"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Advanced: Add custom CSS to override default styles
                  </p>
                </div>

                <Button onClick={saveBrandingSettings} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Branding Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Report Branding */}
            <Card>
              <CardHeader>
                <CardTitle>Report Branding</CardTitle>
                <CardDescription>
                  Customize how your reports appear to clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showPoweredBy">
                      Show "Powered by RankPilot"
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Display RankPilot branding on reports
                    </p>
                  </div>
                  <Switch
                    id="showPoweredBy"
                    checked={reportSettings.showPoweredBy}
                    onCheckedChange={(checked) =>
                      setReportSettings((prev) => ({
                        ...prev,
                        showPoweredBy: checked,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="headerText">Report Header Text</Label>
                  <Input
                    id="headerText"
                    value={reportSettings.headerText}
                    onChange={(e) =>
                      setReportSettings((prev) => ({
                        ...prev,
                        headerText: e.target.value,
                      }))
                    }
                    placeholder="e.g., Professional SEO Analysis Report"
                  />
                </div>

                <div>
                  <Label htmlFor="contactInfo">Contact Information</Label>
                  <Input
                    id="contactInfo"
                    value={reportSettings.contactInfo}
                    onChange={(e) =>
                      setReportSettings((prev) => ({
                        ...prev,
                        contactInfo: e.target.value,
                      }))
                    }
                    placeholder="e.g., contact@yourcompany.com | (555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="customFooter">Custom Footer</Label>
                  <Textarea
                    id="customFooter"
                    value={reportSettings.customFooter}
                    onChange={(e) =>
                      setReportSettings((prev) => ({
                        ...prev,
                        customFooter: e.target.value,
                      }))
                    }
                    placeholder="e.g., © 2024 Your Company Name. All rights reserved."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="disclaimerText">Disclaimer Text</Label>
                  <Textarea
                    id="disclaimerText"
                    value={reportSettings.disclaimerText}
                    onChange={(e) =>
                      setReportSettings((prev) => ({
                        ...prev,
                        disclaimerText: e.target.value,
                      }))
                    }
                    placeholder="e.g., This report is confidential and intended for internal use only."
                    rows={3}
                  />
                </div>

                <Button onClick={saveReportSettings} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Report Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {/* Preview Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Preview Your Branding</CardTitle>
                <CardDescription>
                  See how your customizations will look in reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        previewMode === "desktop" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                      className="gap-1"
                    >
                      <Monitor className="h-3 w-3" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                      className="gap-1"
                    >
                      <Smartphone className="h-3 w-3" />
                      Mobile
                    </Button>
                  </div>

                  <Button onClick={generatePreviewReport} className="gap-1">
                    <Download className="h-3 w-3" />
                    Download Sample Report
                  </Button>
                </div>

                {/* Preview Window */}
                <div
                  className={`border rounded-lg p-6 bg-white ${
                    previewMode === "mobile" ? "max-w-sm mx-auto" : "w-full"
                  }`}
                  style={
                    {
                      "--primary-color": branding.primaryColor,
                      "--secondary-color": branding.secondaryColor,
                      "--accent-color": branding.accentColor,
                    } as React.CSSProperties
                  }
                >
                  {/* Mock Report Header */}
                  <div
                    className="border-b pb-4 mb-6"
                    style={{ borderColor: branding.primaryColor }}
                  >
                    <div className="flex items-center justify-between">
                      {branding.logo && (
                        <img
                          src={branding.logo}
                          alt="Company Logo"
                          className="h-12 object-contain"
                        />
                      )}
                      <div className="text-right">
                        <h1
                          className="text-xl font-bold"
                          style={{ color: branding.primaryColor }}
                        >
                          {reportSettings.headerText || "SEO Analysis Report"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                          {reportSettings.contactInfo ||
                            "Your contact information"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mock Report Content */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: `${branding.primaryColor}10`,
                        }}
                      >
                        <h3
                          className="font-semibold"
                          style={{ color: branding.primaryColor }}
                        >
                          SEO Score
                        </h3>
                        <p className="text-2xl font-bold">85/100</p>
                      </div>
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: `${branding.accentColor}10` }}
                      >
                        <h3
                          className="font-semibold"
                          style={{ color: branding.accentColor }}
                        >
                          Issues Found
                        </h3>
                        <p className="text-2xl font-bold">12</p>
                      </div>
                      <div
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: `${branding.secondaryColor}10`,
                        }}
                      >
                        <h3
                          className="font-semibold"
                          style={{ color: branding.secondaryColor }}
                        >
                          Keywords
                        </h3>
                        <p className="text-2xl font-bold">47</p>
                      </div>
                    </div>

                    <div className="border-t pt-4 text-center text-sm text-muted-foreground">
                      {reportSettings.customFooter ||
                        "© 2024 Your Company. All rights reserved."}
                    </div>

                    {reportSettings.disclaimerText && (
                      <div className="text-xs text-muted-foreground text-center border-t pt-2">
                        {reportSettings.disclaimerText}
                      </div>
                    )}

                    {reportSettings.showPoweredBy && (
                      <div className="text-xs text-muted-foreground text-center">
                        Powered by RankPilot
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Tutorial Banner */}
        <TutorialBanner
          feature="white_label"
          variant="floating"
          dismissible={true}
        />
      </div>
    </FeatureGate>
  );
}

