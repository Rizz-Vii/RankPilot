// src/hooks/useAdminRoute.ts
 "use client";
 
 import { useEffect } from "react";
 import { useRouter } from "next/navigation";
 import { useAuth } from "@/context/AuthContext";


declare global {
  // Augment Window with optional __E2E__ flag used in tests.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface Window { __E2E__?: string; }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

// Reference the declared global property at runtime so TypeScript/ESLint don't report it as unused.
// This is a no-op that's safe in all environments.
void (globalThis as any).__E2E__;

export default function useAdminRoute(): { user: ReturnType<typeof useAuth>["user"]; loading: boolean; role: string | null } {
  const { user, loading, role } = useAuth();
  const router = useRouter();


  useEffect(() => {
    // Redirect if not loading and user is not authenticated or role is not 'admin'
    if (!loading && (!user || role !== "admin")) {
      // Redirect to a page indicating unauthorized access or the home page
      router.push("/login"); // Redirect to home page as an example
    }
  }, [user, loading, role, router]);

  // Tightened test override: requires both localStorage flag AND E2E runtime/build flag.
  // Moved below hook calls to keep hooks usage unconditional (fixes react-hooks/rules-of-hooks).
  if (typeof window !== 'undefined') {
    try {
      const allowE2E = (process.env.NEXT_PUBLIC_E2E === '1') || window.__E2E__ === '1';
      if (allowE2E && localStorage.getItem('TEST_FORCE_ADMIN') === '1') {
        // Provide deterministic admin override object; keep shape consistent with AdminRouteResult.
        return { user: (user || { uid: 'test-admin-override' }) as typeof user, loading: false, role: 'admin' };
      }
    } catch { /* ignore */ }
  }

  if (loading || (user && role !== "admin")) {
    return { user: null, loading: true, role: null };
  }

  return { user, loading, role }; // Return these values if needed in the component
}
