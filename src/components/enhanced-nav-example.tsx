/**
 * Enhanced Navigation Integration Example
 *
 * This file demonstrates how to integrate the new enhanced navigation
 * into existing components like the sidebar and mobile layouts.
 */

import React from "react";
import {
  EnhancedAppNav,
  EnhancedMobileNav,
} from "@/components/enhanced-app-nav";
import type { NavItem } from "@/constants/enhanced-nav";

// Example: Integration with existing sidebar
export function SidebarWithEnhancedNav({
  userTier,
  isAdmin,
  collapsed = false,
}: {
  userTier?: string;
  isAdmin?: boolean;
  collapsed?: boolean;
}) {
  const handleNavItemClick = (item: NavItem) => {
    // Analytics tracking
    console.log("Navigation clicked:", item.title, item.href);

    // Close mobile menu if needed
    // dispatch({ type: "CLOSE_MOBILE_MENU" });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header/Logo section */}
      <div className="p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg" />
            <span className="font-semibold">RankPilot</span>
          </div>
        )}
        {collapsed && <div className="h-8 w-8 bg-primary rounded-lg mx-auto" />}
      </div>

      {/* Enhanced Navigation */}
      <div className="flex-1 overflow-auto p-4">
        <EnhancedAppNav
          userTier={userTier}
          isAdmin={isAdmin}
          collapsed={collapsed}
          onItemClickAction={handleNavItemClick}
        />
      </div>

      {/* Footer section */}
      <div className="p-4 border-t">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <div>Tier: {userTier || "Free"}</div>
            <div>NeuroSEO™ Suite v2.0</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Example: Mobile navigation integration
export function MobileNavigationExample({
  isOpen,
  onClose,
  userTier,
  isAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  userTier?: string;
  isAdmin?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Enhanced Mobile Navigation */}
      <EnhancedMobileNav
        userTier={userTier}
        isAdmin={isAdmin}
        onCloseAction={onClose}
        onItemClickAction={(item) => {
          console.log("Mobile nav clicked:", item.title);
        }}
      />
    </>
  );
}

// Example: Replace existing navigation in layout
export function LayoutNavigationExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/10">
          <SidebarWithEnhancedNav userTier="agency" isAdmin={false} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <main className="p-6">
            <h1>Enhanced Navigation Demo</h1>
            <p>The sidebar now uses the enhanced navigation with:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>NeuroSEO™ Suite prominently featured</li>
              <li>Logical grouping of related features</li>
              <li>Collapsible sections</li>
              <li>Tier-based access control</li>
              <li>Visual indicators and badges</li>
            </ul>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <button className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent">
              <span className="sr-only">Open main menu</span>
              {/* Menu icon */}
            </button>
            <div className="ml-4 flex lg:ml-0">
              <span className="font-semibold">RankPilot</span>
            </div>
          </div>
        </div>

        <main className="p-4">
          <h1>Mobile Enhanced Navigation</h1>
          <p>Use the menu button to see the enhanced mobile navigation.</p>
        </main>
      </div>
    </div>
  );
}

// Migration guide for existing components
export const MIGRATION_GUIDE = {
  steps: [
    "1. Import EnhancedAppNav from @/components/enhanced-app-nav",
    "2. Replace existing navigation imports with enhanced versions",
    "3. Update props: onItemClick → onItemClickAction",
    "4. Add userTier and isAdmin props for access control",
    "5. Use collapsed prop for condensed sidebar states",
    "6. Test tier-based visibility and grouping behavior",
  ],

  beforeAfter: {
    before: `
// OLD: Direct nav items usage
import { navItems } from "@/constants/nav";
<nav>
  {navItems.map(item => <NavItem key={item.href} {...item} />)}
</nav>
    `,
    after: `
// NEW: Enhanced grouped navigation
import { EnhancedAppNav } from "@/components/enhanced-app-nav";
<EnhancedAppNav 
  userTier={user?.tier}
  isAdmin={user?.role === "admin"}
  onItemClickAction={(_item) => handleNavigation(_item)}
/>
    `,
  },

  features: [
    "✅ NeuroSEO™ Suite highlighted as flagship feature group",
    "✅ Logical grouping: NeuroSEO™, SEO Tools, Competitive Intelligence, Management",
    "✅ Collapsible sections with smooth animations",
    "✅ Tier-based access control (starter/agency/enterprise)",
    "✅ Admin-only sections",
    "✅ Visual badges and indicators",
    "✅ Mobile-responsive design",
    "✅ Accessibility features (ARIA labels, keyboard navigation)",
    "✅ Loading states and error handling",
    "✅ Analytics tracking integration",
  ],
};

export default SidebarWithEnhancedNav;
