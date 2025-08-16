// src/hooks/useAdminRoute.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/ui/loading-screen";

export default function useAdminRoute() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  // Tightened test override: requires both localStorage flag AND E2E runtime/build flag
  if (typeof window !== 'undefined') {
    try {
      const allowE2E = (process.env.NEXT_PUBLIC_E2E === '1') || (window as any).__E2E__ === '1';
      if (allowE2E && localStorage.getItem('TEST_FORCE_ADMIN') === '1') {
        return { user: user || { uid: 'test-admin-override' }, loading: false, role: 'admin' } as any;
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    // Redirect if not loading and user is not authenticated or role is not 'admin'
    if (!loading && (!user || role !== "admin")) {
      // Redirect to a page indicating unauthorized access or the home page
      router.push("/login"); // Redirect to home page as an example
    }
  }, [user, loading, role, router]);

  if (loading || (user && role !== "admin")) {
    return { user: null, loading: true, role: null };
  }

  return { user, loading, role }; // Return these values if needed in the component
}
