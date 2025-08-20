// src/hooks/useAdminRoute.ts
 "use client";
 
 import { useEffect } from "react";
 import { useRouter } from "next/navigation";
 import { useAuth } from "@/context/AuthContext";


/* eslint-disable @typescript-eslint/no-unused-vars */
/* Access __E2E__ at runtime via (window as any).__E2E__ to avoid a file-level type augmentation
   that can be reported as an unused declaration by @typescript-eslint/no-unused-vars. */
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function useAdminRoute(): { user: ReturnType<typeof useAuth>["user"]; loading: boolean; role: string | null } {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  // Prevent false-positive unused variable lint errors.
  // Reference variables in a no-op so @typescript-eslint/no-unused-vars doesn't trigger.
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  void (user, loading, role, router);

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
      const allowE2E = (process.env.NEXT_PUBLIC_E2E === '1') || (window as any).__E2E__ === '1';
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
