"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
};

export default function AppNav() {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { user, role } = useAuth();
  const { subscription } = useSubscription();

  const collapsed = !open && !isMobile;

  const handleNavItemClick = (item: NavItem) => {
    // Close mobile sidebar when nav item is clicked
    if (isMobile) {
      setOpenMobile(false);
    }

    // Track navigation analytics
    console.log("Navigation clicked:", item.title, item.href);
  };

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
