// src/hooks/useAdminRoute.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import _LoadingScreen from "@/components/loading-screen";

export default function useAdminRoute() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

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
