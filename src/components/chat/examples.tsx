/**
 * Example: How to integrate RankPilot ChatBot
 * This file shows different ways to use the chatbot components
 */

import { AdminChatBot, ChatBot, CustomerChatBot } from "@/components/chat";
import React from "react";

// Example 1: Simple integration in any page
export function PageWithChatBot() {
  return (
    <div className="page-content">
      <h1>Your Page Content</h1>
      <p>This is your regular page content...</p>

      {/* The chatbot will automatically show based on user permissions */}
      <ChatBot />
    </div>
  );
}

// Example 2: Integration in layout (recommended)
export function LayoutWithChatBot({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      {children}

      {/* Place at the end of your layout for global availability */}
      <ChatBot />
    </div>
  );
}

// Example 3: Custom positioning
export function CustomPositionedChatBot() {
  return (
    <div className="relative">
      <div className="your-content">{/* Your page content */}</div>

      {/* Custom positioning with className */}
      <ChatBot className="bottom-4 right-4" />
    </div>
  );
}

// Example 4: Only customer chatbot
export function CustomerSupportPage() {
  const currentUrl = "https://example.com/support";

  return (
    <div className="support-page">
      <h1>Customer Support</h1>

      {/* Only show customer chatbot with specific URL context */}
      <CustomerChatBot currentUrl={currentUrl} />
    </div>
  );
}

// Example 5: Admin dashboard with admin chatbot
export function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Only show admin chatbot for system management */}
      <AdminChatBot />
    </div>
  );
}

// Example 6: Integration with Next.js App Router layout
export function RootLayoutWithChatBot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>

        {/* Global chatbot availability */}
        <ChatBot />
      </body>
    </html>
  );
}

// Example usage in Next.js app/layout.tsx:
/*
import { ChatBot } from '@/components/chat';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <ChatBot />
      </body>
    </html>
  );
}
*/

// Example usage in a specific page:
/*
'use client';

import { CustomerChatBot } from '@/components/chat';
import { usePathname } from 'next/navigation';

export default function SEOAuditPage() {
  const pathname = usePathname();
  const currentUrl = `${window.location.origin}${pathname}`;
  
  return (
    <div>
      <h1>SEO Audit Results</h1>
      // Your audit content here
      
      <CustomerChatBot currentUrl={currentUrl} />
    </div>
  );
}
*/
