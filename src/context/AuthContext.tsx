// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useMockAuth } from "@/lib/dev-auth";
import { ensureUserSubscription } from "@/lib/user-subscription-sync";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

interface UserActivity {
  id: string;
  type: string;
  tool: string;
  timestamp: unknown; // Firestore Timestamp
  details?: unknown;
  resultsSummary?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  profile: unknown;
  activities: UserActivity[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  profile: null,
  activities: [],
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);

  // Use mock auth in development
  const { user: mockUser } = useMockAuth();
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    // Always use Firebase auth, but also listen for mock auth events in development
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChange);

    // In development, also listen for mock auth events
    if (isDevelopment) {
      const handleMockAuthEvent = (event: Event) => {
        const mockUser = (event as CustomEvent).detail;
        handleAuthStateChange(mockUser);
      };

      window.addEventListener(
        "mockUserLogin",
        handleMockAuthEvent as EventListener
      );

      return () => {
        unsubscribe();
        window.removeEventListener(
          "mockUserLogin",
          handleMockAuthEvent as EventListener
        );
      };
    }

    return () => unsubscribe();
  }, [isDevelopment]);

  const handleAuthStateChange = async (currentUser: User | null) => {
    setUser(currentUser);
    if (currentUser) {
      // Ensure user has proper subscription data
      try {
        await ensureUserSubscription(currentUser.uid, currentUser.email || "");
      } catch (_error) {
        console.error("Error ensuring user subscription:", _error);
      }

      // Fetch user profile and role
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setRole(userData?.role || null);
        setProfile(userData || null);
      } else {
        setRole(null);
        setProfile(null);
      }

      // Fetch user activities
      try {
        const activitiesRef = collection(
          db,
          "users",
          currentUser.uid,
          "activities"
        );
        const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        const fetchedActivities = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as UserActivity
        );
        setActivities(fetchedActivities);
      } catch (_error) {
        console.log("Activities not found, setting empty array");
        setActivities([]);
      }
    } else {
      setRole(null);
      setProfile(null);
      setActivities([]); // Clear activities on logout
    }

    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, profile, activities }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
