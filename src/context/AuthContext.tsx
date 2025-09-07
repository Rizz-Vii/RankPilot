// src/context/AuthContext.tsx
"use client";

import { useMockAuth } from "@/lib/dev-auth";
import { auth, db } from "@/lib/firebase";
import type { DashboardData } from "@/lib/services/dashboard-data.service";
import { ensureUserSubscription } from "@/lib/user-subscription-sync";
import type { User as FirebaseUser } from "firebase/auth"; // This line is unchanged
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

interface UserActivity {
  id: string;
  type: string;
  tool: string;
  timestamp: unknown; // Firestore Timestamp
  details?: unknown;
  resultsSummary?: string;
}

// Extend Firebase User with optional teamId
export interface User extends FirebaseUser {
  teamId?: string;
}

export interface UserProfile {
  role?: string;
  subscriptionTier?: string;
  teamId?: string;
  dashboardCache?: {
    data?: DashboardData;
    lastUpdated?: unknown; // Firestore TS
    version?: string;
  };
  [key: string]: unknown; // allow forward-compatible fields
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  profile: UserProfile | null;
  activities: UserActivity[];
}

const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  role: null,
  profile: null,
  activities: [],
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);

  // Use mock auth in development
  useMockAuth();
  const isDevelopment =
    typeof window !== "undefined" && process.env.NODE_ENV === "development";

  useEffect(() => {
    // Always use Firebase auth, but also listen for mock auth events in development
    const handleAuthStateChange = async (currentUser: FirebaseUser | null) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user has proper subscription data
        try {
          await ensureUserSubscription(
            currentUser.uid,
            currentUser.email || ""
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Error ensuring user subscription:", msg);
        }

        // Fetch user profile and role
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userDataRaw = userDocSnap.data();
          const userData =
            userDataRaw && typeof userDataRaw === "object"
              ? (userDataRaw as Record<string, unknown>)
              : {};
          const roleField =
            typeof userData.role === "string" ? userData.role : null;
          setRole(roleField);
          setProfile(userData as UserProfile);
          // Attach teamId from Firestore user doc if present without breaking User prototype methods
          try {
            // Safely attach teamId without using any casts
            const possibleTeamId =
              "teamId" in userData && typeof userData.teamId === "string"
                ? (userData.teamId as string)
                : undefined;
            // Double cast via unknown to extend the FirebaseUser instance at runtime (non‑enumerable methods preserved)
            (currentUser as unknown as User).teamId = possibleTeamId;
          } catch (e) {
            // non-fatal; ignore
            console.debug("Failed to attach teamId", e);
          }
          setUser(currentUser as User);
        } else {
          setRole(null);
          setProfile(null);
          setUser(currentUser as User);
        }

        // Fetch user activities
        try {
          const activitiesRef = collection(
            db,
            "users",
            currentUser.uid,
            "activities"
          );
          const q = query(
            activitiesRef,
            orderBy("timestamp", "desc"),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          const fetchedActivities = querySnapshot.docs.map(
            (snapshot) =>
              ({
                id: snapshot.id,
                ...snapshot.data(),
              }) as UserActivity
          );
          setActivities(fetchedActivities);
        } catch {
          console.debug("Activities not found, setting empty array");
          setActivities([]);
        }
      } else {
        setRole(null);
        setProfile(null);
        setActivities([]); // Clear activities on logout
      }

      setLoading(false);
    };

    // Wrap async handler to satisfy no-misused-promises (we intentionally ignore returned promise)
    const unsubscribe = auth.onAuthStateChanged((u) => {
      void handleAuthStateChange(u);
    });

    // In development, also listen for mock auth events
    let removeMockListener: (() => void) | undefined;
    if (isDevelopment) {
      const handleMockAuthEvent = (event: CustomEvent) => {
        const mockUser = event.detail;
        // Explicitly void the async promise (fire-and-forget)
        void handleAuthStateChange(mockUser);
      };
      window.addEventListener(
        "mockUserLogin",
        handleMockAuthEvent as EventListener
      );
      removeMockListener = () =>
        window.removeEventListener(
          "mockUserLogin",
          handleMockAuthEvent as EventListener
        );
    }

    return () => {
      unsubscribe();
      if (removeMockListener) removeMockListener();
    };
  }, [isDevelopment]);

  return (
    <AuthContext.Provider value={{ user, loading, role, profile, activities }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
