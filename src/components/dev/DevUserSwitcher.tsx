/**
 * Development User Switcher & Debug Component (Consolidated)
 * Allows switching between test users in development mode using real Firebase auth
 * Includes tier debug info for comprehensive development visibility
 */

"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ChevronDown, ChevronUp, User, Bug } from "lucide-react";

// Centralized test user credentials (matches test.config.ts)
const TEST_USERS = {
  free: {
    email: "abbas_ali_rizvi@hotmail.com",
    password: "123456",
    tier: "free",
    displayName: "Abbas Ali (Free)"
  },
  starter: {
    email: "starter@rankpilot.com", 
    password: "starter123",
    tier: "starter",
    displayName: "Starter User"
  },
  agency: {
    email: "agency@rankpilot.com",
    password: "agency123", 
    tier: "agency",
    displayName: "Agency User"
  },
  enterprise: {
    email: "enterprise@rankpilot.com",
    password: "enterprise123",
    tier: "enterprise", 
    displayName: "Enterprise User"
  },
  admin: {
    email: "admin@rankpilot.com",
    password: "admin123",
    tier: "admin",
    displayName: "Admin User"
  }
} as const;

export function DevUserSwitcher() {
  const { user, role } = useAuth();
  const { subscription } = useSubscription();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleUserSwitch = async (userType: keyof typeof TEST_USERS | "logout") => {
    try {
      if (userType === "logout") {
        await signOut(auth);
        return;
      }

      const userConfig = TEST_USERS[userType];
      if (!userConfig) {
        console.error(`Unknown user type: ${userType}`);
        return;
      }

      // Use email/password authentication for all test users
      await signInWithEmailAndPassword(
        auth,
        userConfig.email,
        userConfig.password
      );
    } catch (_error) {
      console.error(`Failed to switch to ${userType} user:`, _error);
    }
  };

  const getCurrentUserTier = () => {
    if (!user?.email) return null;
    return Object.entries(TEST_USERS).find(([_, config]) => config.email === user.email)?.[0] || null;
  };

  const currentTier = getCurrentUserTier();

  return (
    <div className="fixed bottom-4 left-4 bg-background/95 backdrop-blur-sm border border-border text-foreground rounded-lg shadow-lg text-sm z-[9999] max-w-sm">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="font-semibold text-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            Dev Mode
          </div>
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Toggle Debug Info"
          >
            {showDebugInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {user && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="text-green-600 font-medium">●</span> {user.email}
            {currentTier && (
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                {currentTier.toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* User Switcher */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4" />
          <span className="font-medium">Switch Test User</span>
        </div>
        
        {Object.entries(TEST_USERS).map(([tier, config]) => (
          <button
            key={tier}
            onClick={() => handleUserSwitch(tier as keyof typeof TEST_USERS)}
            className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${
              user?.email === config.email
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <div className="font-medium">{config.displayName}</div>
            <div className="text-xs text-muted-foreground">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier • {config.email}
            </div>
          </button>
        ))}
        
        <button
          onClick={() => handleUserSwitch("logout")}
          className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${
            !user ? "bg-destructive text-destructive-foreground" : "hover:bg-muted"
          }`}
        >
          <div className="font-medium">Logout</div>
          <div className="text-xs text-muted-foreground">Sign out current user</div>
        </button>
      </div>

      {/* Debug Info (Collapsible) */}
      {showDebugInfo && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Bug className="w-4 h-4" />
            <span className="font-medium">Debug Info</span>
          </div>
          <div className="space-y-1 text-xs">
            <div><span className="font-medium text-blue-600">User:</span> {user?.email || "Not logged in"}</div>
            <div><span className="font-medium text-blue-600">Role:</span> {role || "None"}</div>
            <div><span className="font-medium text-blue-600">Subscription Tier:</span> {subscription?.tier || "Unknown"}</div>
            <div><span className="font-medium text-blue-600">Plan Name:</span> {subscription?.planName || "None"}</div>
            <div><span className="font-medium text-blue-600">Status:</span> {subscription?.status || "Unknown"}</div>
            <div><span className="font-medium text-blue-600">User Access Tier:</span> {subscription?.userAccess?.tier || "Unknown"}</div>
            <div className="pt-2 border-t border-border/50">
              <span className="font-medium text-green-600">Current Tier Match:</span> {currentTier || "Unknown"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
