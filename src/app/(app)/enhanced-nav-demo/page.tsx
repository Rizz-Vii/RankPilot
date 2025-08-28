"use client";
/**
 * Enhanced Navigation Demo Page
 *
 * This page demonstrates the enhanced navigation in action.
 * Use this to test the navigation before integrating it fully.
 */

import {
  EnhancedAppNav,
  EnhancedMobileNav,
} from "@/components/enhanced-app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NavItem } from "@/constants/enhanced-nav";
import { Brain, Eye, Settings, Users } from "lucide-react";
import { useState } from "react";

export default function EnhancedNavigationDemo() {
  const isProd = process.env.NODE_ENV === 'production';
  const [selectedTier, setSelectedTier] = useState<string>("agency");
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [lastClicked, setLastClicked] = useState<NavItem | null>(null);

  const handleNavItemClick = (item: NavItem) => {
    setLastClicked(item);
    console.log("Navigation clicked:", item);
  };

  if (isProd) {
    return (
      <div className="min-h-[50vh] grid place-items-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Demo disabled</h1>
          <p className="text-muted-foreground">This demo page isn’t available in production.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Enhanced Navigation Demo</h1>
            <Badge variant="default" className="ml-2">
              NeuroSEO™ Suite
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Experience the new systematically organized navigation with
            prominent NeuroSEO™ Suite grouping.
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Demo Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User Tier:</label>
                <div className="flex gap-2">
                  {["free", "starter", "agency", "enterprise"].map((tier) => (
                    <Button
                      key={tier}
                      variant={selectedTier === tier ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTier(tier)}
                    >
                      {tier}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Options:</label>
                <div className="flex gap-2">
                  <Button
                    variant={isAdmin ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAdmin(!isAdmin)}
                  >
                    Admin Mode
                  </Button>
                  <Button
                    variant={collapsed ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    Collapsed
                  </Button>
                  <Button
                    variant={showMobile ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMobile(!showMobile)}
                  >
                    Mobile View
                  </Button>
                </div>
              </div>
            </div>

            {lastClicked && (
              <div className="p-3 bg-accent rounded-lg">
                <p className="text-sm font-medium">Last Clicked:</p>
                <p className="text-sm text-muted-foreground">
                  {lastClicked.title} → {lastClicked.href}
                  {lastClicked.requiredTier &&
                    ` (${lastClicked.requiredTier}+)`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demo Views */}
        <Tabs defaultValue="desktop" className="space-y-6">
          <TabsList>
            <TabsTrigger value="desktop">Desktop Navigation</TabsTrigger>
            <TabsTrigger value="mobile">Mobile Navigation</TabsTrigger>
            <TabsTrigger value="features">Feature Highlights</TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Navigation Sidebar */}
              <div
                className={`${collapsed ? "lg:col-span-1" : "lg:col-span-1"} space-y-4`}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      Enhanced Navigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnhancedAppNav
                      userTier={
                        selectedTier === "free" ? undefined : selectedTier
                      }
                      isAdmin={isAdmin}
                      collapsed={collapsed}
                      onItemClickAction={handleNavItemClick}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Content Area */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Navigation Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          NeuroSEO™ Suite Prominence
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          AI-powered features are now the primary focus with
                          dedicated grouping and visual badges.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Logical Organization
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Related features are systematically grouped together
                          for better user experience.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Tier-Based Access
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Navigation adapts based on user subscription tier,
                          showing only relevant features.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Responsive Design
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Mobile-optimized with collapsible groups and
                          touch-friendly interactions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mobile Navigation Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Button onClick={() => setShowMobile(true)} size="lg">
                    Show Mobile Navigation
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click to see the enhanced mobile navigation in action
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">NeuroSEO™ Suite</CardTitle>
                  <Badge className="w-fit">AI Powered</Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>• NeuralCrawler™</p>
                  <p>• SemanticMap™</p>
                  <p>• AI Visibility Engine</p>
                  <p>• TrustBlock™</p>
                  <p>• RewriteGen™</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">SEO Tools</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Core Features
                  </Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>• Keyword Tool</p>
                  <p>• Content Analyzer</p>
                  <p>• SEO Audit</p>
                  <p>• Content Brief</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Competitive Intelligence
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    Advanced
                  </Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>• Competitors</p>
                  <p>• SERP View</p>
                  <p>• Link View</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Management</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Overview
                  </Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>• Dashboard</p>
                  <p>• Insights</p>
                  <p>• Performance</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Mobile Navigation Overlay */}
        {showMobile && (
          <EnhancedMobileNav
            userTier={selectedTier === "free" ? undefined : selectedTier}
            isAdmin={isAdmin}
            onCloseAction={() => setShowMobile(false)}
            onItemClickAction={handleNavItemClick}
          />
        )}
      </div>
    </div>
  );
}
