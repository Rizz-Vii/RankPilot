"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";
import { EnhancedAppNav } from "@/components/enhanced-app-nav";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import type { NavItem } from "@/constants/enhanced-nav";

const menuItemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 20,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
} as const;

export default function AppNav(): JSX.Element {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { role } = useAuth();
  const { subscription } = useSubscription();

  const collapsed = !open && !isMobile;

  const handleNavItemClick = useCallback(
    (item: NavItem) => {
      // Close mobile sidebar when nav item is clicked
      if (isMobile) {
        setOpenMobile(false);
      }

      // Intentionally avoid console logging in production code.
      // Replace this with a telemetry/tracking call if needed.
    },
    [isMobile, setOpenMobile]
  );

  return (
    <motion.div
      initial="closed"
      animate="open"
      variants={menuItemVariants}
      className="px-2"
    >
      <EnhancedAppNav
        userTier={subscription?.tier}
        isAdmin={role === "admin"}
        collapsed={collapsed}
        mobile={isMobile}
        onItemClickAction={handleNavItemClick}
        className="space-y-1"
      />
    </motion.div>
  );
}
