"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/ui/loading-screen";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Only perform Firebase operations on the client side
        if (typeof window !== "undefined") {
          // Import Firebase auth directly from Firebase SDK
          const { signOut, getAuth } = await import("firebase/auth");
          const { getApps, getApp } = await import("firebase/app");

          // Get the existing Firebase app if it exists
          const app = getApps().length > 0 ? getApp() : null;
          if (app) {
            const auth = getAuth(app);
            await signOut(auth);
          }
        }
      } catch (_error) {
        console.error("Error during logout:", _error);
      } finally {
        // Always redirect to home page
        router.push("/");
      }
    };

    performLogout();
  }, [router]);

  return <LoadingScreen fullScreen text="Logging out..." />;
}
