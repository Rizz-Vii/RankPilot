/**
 * Development User Switcher & Debug Component (Consolidated)
 * Allows switching between test users in development mode using real Firebase auth
 * Includes tier debug info for comprehensive development visibility
 */

"use client";

import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Bug, ChevronDown, ChevronUp, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  const STORAGE_KEY = "dev_user_switcher_expanded_v1";
  const [expanded, setExpanded] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false); // nested debug toggle (optional)

  // Restore persisted expanded state (default true)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setExpanded(raw === "true");
    } catch {}
  }, []);

  const persistExpanded = useCallback((value: boolean) => {
    try { window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false"); } catch {}
  }, []);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      persistExpanded(!prev);
      return !prev;
    });
  };

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
    } catch (error) {
      console.error(`Failed to switch to ${userType} user:`, error);
    }
  };

  const getCurrentUserTier = () => {
    if (!user?.email) return null;
    return Object.entries(TEST_USERS).find(([_, config]) => config.email === user.email)?.[0] || null;
  };

  const currentTier = getCurrentUserTier();

  return (
    <div className="fixed bottom-4 left-4 z-[9999] text-sm">
      {/* Collapsed pill */}
      {!expanded && (
        <button
          onClick={toggleExpanded}
          className="group flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm border border-border px-3 py-2 shadow-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Expand developer user switcher"
        >
          <div className="relative flex items-center gap-1 text-xs font-medium text-primary">
            <span className="inline-flex items-center gap-1">
              <User className="h-4 w-4" /> Dev
            </span>
            <ChevronUp className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
          </div>
        </button>
      )}

      {/* Expanded Panel */}
      {expanded && (
        <div className="bg-background/95 backdrop-blur-sm border border-border text-foreground rounded-lg shadow-xl max-w-sm w-[320px] animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="p-3 border-b border-border flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="font-semibold text-primary flex items-center gap-2">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" aria-hidden="true"></div>
                <span className="truncate">Dev Mode</span>
              </div>
              {user && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <span className="text-success-foreground font-medium">●</span>
                  <span className="truncate max-w-[170px]">{user.email}</span>
                  {currentTier && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                      {currentTier.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowDebugInfo((p) => !p)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                title="Toggle debug details"
                aria-label="Toggle debug info"
              >
                {showDebugInfo ? <Bug className="h-4 w-4" /> : <Bug className="h-4 w-4 opacity-60" />}
              </button>
              <button
                onClick={toggleExpanded}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                title="Collapse switcher"
                aria-label="Collapse dev switcher"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body Scroll Container */}
            <div className="max-h-[55vh] overflow-y-auto p-3 space-y-4">
              {/* User Switcher */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>Switch User</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(TEST_USERS).map(([tier, config]) => (
                    <button
                      key={tier}
                      onClick={() => { void handleUserSwitch(tier as keyof typeof TEST_USERS); }}
                      className={`group relative flex flex-col rounded-md border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        user?.email === config.email
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "hover:bg-muted/70 border-border/60"
                      }`}
                    >
                      <span className="text-[13px] font-medium leading-tight truncate flex items-center gap-2">
                        {config.displayName}
                        {user?.email === config.email && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-foreground/15 text-primary-foreground/90">
                            ACTIVE
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] mt-0.5 opacity-80 truncate">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} • {config.email}
                      </span>
                    </button>
                  ))}
                  <button
                  onClick={() => { void handleUserSwitch("logout"); }}
                    className={`group relative flex flex-col rounded-md border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      !user
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "hover:bg-muted/70 border-border/60"
                    }`}
                  >
                    <span className="text-[13px] font-medium leading-tight">Logout</span>
                    <span className="text-[10px] mt-0.5 opacity-80">
                      Sign out current user
                    </span>
                  </button>
                </div>
              </div>

              {/* Debug Info */}
              {showDebugInfo && (
                <div className="space-y-2 border-t pt-3 border-border/60">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Bug className="w-3.5 h-3.5" />
                    <span>Debug Info</span>
                  </div>
                  <div className="space-y-1 text-[11px] leading-tight">
                    <div><span className="font-medium text-primary">User:</span> {user?.email || "Not logged in"}</div>
                    <div><span className="font-medium text-primary">Role:</span> {role || "None"}</div>
                    <div><span className="font-medium text-primary">Subscription:</span> {subscription?.tier || "Unknown"}</div>
                    <div><span className="font-medium text-primary">Plan Name:</span> {subscription?.planName || "None"}</div>
                    <div><span className="font-medium text-primary">Status:</span> {subscription?.status || "Unknown"}</div>
                    <div><span className="font-medium text-primary">Access Tier:</span> {subscription?.userAccess?.tier || "Unknown"}</div>
                    <div className="pt-1 border-t border-border/40"><span className="font-medium text-success-foreground">Current Tier Match:</span> {currentTier || "Unknown"}</div>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
