/**
 * Development Authentication Helper
 * Provides convenience functions for logging in with real Firebase credentials
 */

import { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Real user credentials for development convenience
export const DEV_USERS = {
  free: {
    email: "abbas_ali_rizvi@hotmail.com",
    password: "123456",
    authMethod: "email" as const,
    uid: "abbas_free_user_uid",
    displayName: "Abbas Ali (Free)",
  },
  starter: {
    email: "abba7254@gmail.com",
    password: null, // Google sign-in user
    authMethod: "google" as const,
    uid: "abba_starter_user_uid",
    displayName: "Abba (Starter)",
  },
};

// Login with real Firebase credentials
export const loginAsDevUser = async (
  userType: "free" | "starter"
): Promise<User | null> => {
  try {
    const userCreds = DEV_USERS[userType];

    if (userCreds.authMethod === "google") {
      // Use Google sign-in for users who signed up with Google
      const provider = new GoogleAuthProvider();
      // Force account selection for the specific user
      provider.setCustomParameters({
        login_hint: userCreds.email,
        prompt: "select_account",
      });

      const userCredential = await signInWithPopup(auth, provider);
      console.log(
        `Logged in as ${userType} user via Google:`,
        userCredential.user.email
      );
      return userCredential.user;
    } else {
      // Use email/password for regular users
      if (!userCreds.password) {
        throw new Error('Password is required for non-admin users');
      }
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userCreds.email,
        userCreds.password
      );
      console.log(`Logged in as ${userType} user:`, userCredential.user.email);
      return userCredential.user;
    }
  } catch (_error) {
    console.error(`Failed to login as ${userType} user:`, _error);

    // Fallback to mock user for development if real login fails
    const mockUser = createMockUser(userType);
    const event = new CustomEvent("mockUserLogin", { detail: mockUser });
    window.dispatchEvent(event);
    return mockUser;
  }
};

// Create mock user for fallback
const createMockUser = (userType: "free" | "starter"): User => {
  const userCreds = DEV_USERS[userType];
  return {
    uid: userCreds.uid,
    email: userCreds.email,
    displayName: userCreds.displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: async () => { },
    getIdToken: async () => "mock-token",
    getIdTokenResult: async () => ({}) as Record<string, unknown>,
    reload: async () => { },
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
  } as User;
};

export const useMockAuth = () => {
  // This hook is now just for compatibility
  return { user: null };
};
