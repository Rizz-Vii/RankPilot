// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth"; // This line is unchanged
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
  timestamp: any; // Firestore Timestamp
  details?: any;
  resultsSummary?: string;
}

// Extend Firebase User with optional teamId
export interface User extends FirebaseUser {
  teamId?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  profile: any;
  activities: UserActivity[];
}


const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  role: null,
  profile: null,
  activities: [],
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);

  // Use mock auth in development
  const { user: mockUser } = useMockAuth();
  const isDevelopment = typeof window !== "undefined" && process.env.NODE_ENV === "development";



  const handleAuthStateChange = async (currentUser: FirebaseUser | null) => {
    setUser(currentUser);
    if (currentUser) {
      // Ensure user has proper subscription data
      try {
        await ensureUserSubscription(currentUser.uid, currentUser.email || "");
      } catch (error) {
        console.error("Error ensuring user subscription:", error);
      }

      // Fetch user profile and role
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setRole(userData?.role || null);
        setProfile(userData || null);
        // Attach teamId from Firestore user doc if present
        setUser({ ...currentUser, teamId: userData?.teamId });
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
      } catch (error) {
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

  useEffect(() => {
    // Always use Firebase auth, but also listen for mock auth events in development
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChange);

    // In development, also listen for mock auth events
    let removeMockListener: (() => void) | undefined;
    if (isDevelopment) {
      const handleMockAuthEvent = (event: CustomEvent) => {
        const mockUser = event.detail;
        handleAuthStateChange(mockUser);
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
