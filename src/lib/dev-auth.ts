/**
 * Development Authentication Helper
 * Provides convenience functions for logging in with real Firebase credentials
 */

import type { User } from "firebase/auth";
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userCreds.email,
        userCreds.password!
      );
      console.log(`Logged in as ${userType} user:`, userCredential.user.email);
      return userCredential.user;
    }
  } catch (error) {
    console.error(`Failed to login as ${userType} user:`, error);

    // Fallback to mock user for development if real login fails
    const mockUser = createMockUser(userType);
    const event = new CustomEvent("mockUserLogin", { detail: mockUser });
    window.dispatchEvent(event);
    return mockUser;
  }
};

export const useMockAuth = () => {
  // This hook is now just for compatibility
  return { user: null };
};

function createMockUser(userType: keyof typeof DEV_USERS): User {
  // Provide minimal subset of Firebase User interface used in app paths
  return {
    uid: DEV_USERS[userType].uid,
    email: DEV_USERS[userType].email,
    displayName: DEV_USERS[userType].displayName,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    refreshToken: "mock-refresh-token",
    metadata: {
      creationTime: String(Date.now()),
      lastSignInTime: String(Date.now()),
    } as unknown as User["metadata"],
    tenantId: null,
    delete: async () => {
      /* noop */
    },
    getIdToken: async () => "mock-id-token",
    getIdTokenResult: async () => ({ token: "mock-id-token" }) as unknown,
    reload: async () => {
      /* noop */
    },
    toJSON: () => ({
      uid: DEV_USERS[userType].uid,
      email: DEV_USERS[userType].email,
    }),
  } as unknown as User;
}
