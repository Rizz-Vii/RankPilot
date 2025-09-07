/**
 * Enhanced Sidebar Component - Mobile-Optimized
 * Implements design system patterns with proper touch targets
 */

import React from "react";
import { cn } from "@/lib/utils";
import {
  sidebarStyles,
  mobileSidebarOptimizations,
} from "@/lib/design-system/sidebar-styles";
import { typography } from "@/lib/design-system/typography";
import { colors, getTierBadgeColor } from "@/lib/design-system/colors";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string;
  tierBadge?: string;
  onClick?: () => void;
}

export const EnhancedNavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  tierBadge,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        sidebarStyles.navItem.base,
        sidebarStyles.navItem.padding,
        sidebarStyles.navItem.interactive,
        mobileSidebarOptimizations.touchTarget,
        isActive && sidebarStyles.navItem.selected,
        "w-full text-left group"
      )}
    >
      <span
        className={cn(
          sidebarStyles.icon.size,
          isActive ? sidebarStyles.icon.selected : sidebarStyles.icon.color
        )}
      >
        {icon}
      </span>

      <span className={cn(typography.nav.primary, "flex-1 truncate")}>
        {label}
      </span>

      {badge && <span className={sidebarStyles.badge.count}>{badge}</span>}

      {tierBadge && (
        <span className={cn(getTierBadgeColor(tierBadge))}>{tierBadge}</span>
      )}
    </button>
  );
};

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
}

export const EnhancedNavGroup: React.FC<NavGroupProps> = ({
  title,
  children,
}) => {
  return (
    <div className={sidebarStyles.navGroup.container}>
      <h3 className={cn(sidebarStyles.navGroup.header, typography.nav.badge)}>
        {title}
      </h3>
      <div className={sidebarStyles.navGroup.content}>{children}</div>
    </div>
  );
};

interface UserSwitchItemProps {
  name: string;
  email: string;
  tier: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const EnhancedUserSwitchItem: React.FC<UserSwitchItemProps> = ({
  name,
  email,
  tier,
  isActive = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        sidebarStyles.userSwitch.userItem,
        mobileSidebarOptimizations.touchTarget,
        isActive && colors.status.info.bg
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          colors.background.dark
        )}
      >
        <span className={cn("text-xs font-medium", colors.text.inverse)}>
          {name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className={typography.nav.primary}>{name}</div>
        <div className={cn(typography.nav.user, "truncate")}>{email}</div>
      </div>

      <span className={cn(getTierBadgeColor(tier))}>{tier.toUpperCase()}</span>
    </button>
  );
};
