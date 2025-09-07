/**
 * RankPilot Main ChatBot Component
 * Orchestrates customer and admin chatbots based on user permissions
 */

"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import AdminChatBot from "./AdminChatBot";
import CustomerChatBot from "./CustomerChatBot";

// Define interfaces for component props
interface ChatBotProps {
  className?: string;
}

export default function ChatBot({
  className,
}: ChatBotProps): JSX.Element | null {
  const { user, profile } = useAuth();
  const userTier = profile?.subscriptionTier || "free";
  const pathname = usePathname();

  // Don't show chatbots on auth pages
  if (
    pathname?.includes("/auth/") ||
    pathname?.includes("/login") ||
    pathname?.includes("/register")
  ) {
    return null;
  }

  // Don't show if user is not authenticated
  if (!user) {
    return null;
  }

  // Determine which chatbots to show
  const isAdmin = userTier === "admin" || userTier === "enterprise";
  const showCustomerChat = true; // Always show customer chat for authenticated users
  const showAdminChat = isAdmin; // Only show admin chat for admin/enterprise users

  // Get current URL for context
  const currentUrl: string | undefined =
    typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <>
      {/* Customer ChatBot - Always available for authenticated users */}
      {showCustomerChat && (
        <CustomerChatBot currentUrl={currentUrl} className={className} />
      )}

      {/* Admin ChatBot - Only for admin/enterprise users */}
      {showAdminChat && <AdminChatBot className={className} />}
    </>
  );
}

// Export individual components for direct use
export { AdminChatBot, CustomerChatBot };
