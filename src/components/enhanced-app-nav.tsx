"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  navGroups,
  getVisibleNavGroups,
  standaloneNavItems,
  defaultNavState,
  type NavState,
  type NavGroup,
  type NavItem,
  trackNavigation,
  handleNavError,
} from "@/constants/enhanced-nav";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Zap, Target, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedAppNavProps {
  userTier?: string;
  isAdmin?: boolean;
  className?: string;
  mobile?: boolean;
  onItemClickAction?: (item: NavItem) => void;
  collapsed?: boolean;
}

export function EnhancedAppNav({
  userTier,
  isAdmin = false,
  className,
  mobile = false,
  onItemClickAction,
  collapsed = false,
}: EnhancedAppNavProps) {
  const pathname = usePathname();
  const [navState, setNavState] = useState<NavState>(defaultNavState);
  const [visibleGroups, setVisibleGroups] = useState<NavGroup[]>([]);
  const [mounted, setMounted] = useState(false);
  const EXPANDED_STORAGE_KEY = "enhanced_nav_expanded_groups_v1";

  // Helper: persist expanded group state (desktop only)
  const persistExpanded = useCallback((expanded: Set<string>) => {
    try {
      const arr = Array.from(expanded);
      window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }, []);

  // Initialize navigation state
  useEffect(() => {
    setMounted(true);
    try {
  const groups = getVisibleNavGroups(userTier, isAdmin, { includeLocked: true });
      setVisibleGroups(groups);

      // Restore persisted expanded groups (desktop only)
      let restored: string[] | null = null;
      if (!mobile) {
        try {
          const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
            if (raw) restored = JSON.parse(raw);
        } catch {}
      }

      const activeGroup = groups.find((group) =>
        group.items.some((item) => item.href === pathname)
      );

      setNavState((prev) => {
        let expanded = new Set<string>(prev.expandedGroups);

        // If mobile: collapse all except active (for focus) to reduce scroll noise
        if (mobile) {
          expanded = new Set(activeGroup ? [activeGroup.id] : []);
        } else if (restored && restored.length) {
          expanded = new Set(restored.filter((id) => groups.some((g) => g.id === id)));
        } else {
          // Ensure hero groups exist; keep default but add active if missing
          if (activeGroup && !expanded.has(activeGroup.id)) {
            expanded.add(activeGroup.id);
          }
        }

        // Normalize to a single expanded group (active group preferred)
        if (expanded.size > 1) {
          const chosen = activeGroup?.id || Array.from(expanded)[0];
          expanded = new Set([chosen]);
        }
        return {
          ...prev,
          expandedGroups: expanded,
          activeGroup: activeGroup?.id || prev.activeGroup,
          activeItem: pathname || prev.activeItem,
        };
      });
    } catch (error) {
      const fallback = handleNavError(error as Error, "EnhancedAppNav initialization");
      console.warn(fallback.message);
    }
  }, [userTier, isAdmin, pathname, mobile]);

  // Persist whenever expanded groups change (desktop only)
  useEffect(() => {
    if (!mobile && mounted) {
      persistExpanded(navState.expandedGroups);
    }
  }, [navState.expandedGroups, persistExpanded, mobile, mounted]);

  // Enforce only one expanded group at a time
  const toggleGroup = useCallback((groupId: string) => {
    setNavState((prev) => {
      const isOpen = prev.expandedGroups.has(groupId);
      const newExpanded = isOpen ? new Set<string>() : new Set<string>([groupId]);
      return { ...prev, expandedGroups: newExpanded };
    });
  }, []);

  const handleItemClick = useCallback(
    (item: NavItem, groupId: string) => {
      trackNavigation(item.href, groupId);
      setNavState((prev) => ({
        ...prev,
        activeItem: item.href,
        activeGroup: groupId,
        expandedGroups: mobile ? new Set<string>() : prev.expandedGroups,
      }));
      onItemClickAction?.(item);
    },
      [onItemClickAction, mobile]
  );

  // -----------------------------------------------------------------------
  // Tier + Feature Badge System
  // -----------------------------------------------------------------------
  const tierVisual = {
    starter: {
      label: "Starter",
      icon: Zap,
      classes:
        "bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]",
    },
    agency: {
      label: "Agency",
      icon: Target,
      classes:
        "bg-violet-500/15 text-violet-300 border border-violet-400/30 shadow-[0_0_0_1px_rgba(167,139,250,0.25)]",
    },
    enterprise: {
      label: "Enterprise",
      icon: Rocket,
      classes:
        "bg-amber-500/15 text-amber-300 border border-amber-400/30 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
    },
  } as const;

  const tierOrder: Array<keyof typeof tierVisual> = [
    "starter",
    "agency",
    "enterprise",
  ];

  const getTierBadge = useCallback(
    (tier?: string) => {
      if (!tier) return null;
      if (tier in tierVisual) return tierVisual[tier as keyof typeof tierVisual];
      return null;
    },
    []
  );

  // Feature badges now suppressed unless also locked (kept for potential future use)
  const featureBadgeClass = useCallback(() => "", []);

  // Highest tier among LOCKED items only (relative to current user)
  const getGroupLockedTier = (group: NavGroup) => {
    if (!userTier) return null; // can't determine without user tier
    let highest: keyof typeof tierVisual | undefined;
    group.items.forEach((item) => {
      if (item.requiredTier && tierOrder.includes(item.requiredTier)) {
        const userIndex = tierOrder.indexOf(userTier as any);
        const reqIndex = tierOrder.indexOf(item.requiredTier);
        if (userIndex === -1 || reqIndex > userIndex) {
          if (!highest) highest = item.requiredTier;
          else if (tierOrder.indexOf(item.requiredTier) > tierOrder.indexOf(highest)) {
            highest = item.requiredTier;
          }
        }
      }
    });
    return highest ? tierVisual[highest] : null;
  };

  const renderNavItem = useCallback(
    (item: NavItem, groupId: string, index: number) => {
  const isActive = pathname === item.href;
  const groupActive = navState.activeGroup === groupId;
      const Icon = item.icon;

      return (
        <motion.li
          key={item.href}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Link
                  href={item.href}
                  onClick={() => handleItemClick(item, groupId)}
                    className={cn(
                      "tool-link group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 relative",
                      "w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 min-h-[44px] touch-manipulation",
                      // Hover: increased brightness (previous /12 -> now /20 ~ +25% visual) & text uplift
                      "hover:bg-primary/20 hover:text-primary group-hover/sidebar-wrapper:text-primary",
                      {
                        // Active item stays brightest
                        "text-primary bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5 shadow-sm ring-1 ring-primary/35": isActive,
                        // Active group non-selected
                        "text-primary/90 group-hover:text-primary": !isActive && groupActive && !item.disabled,
                        // Idle baseline
                        "text-primary/75 group-hover:text-primary": !isActive && !groupActive && !item.disabled,
                        // Disabled
                        "text-primary/40": item.disabled && !isActive,
                        // Collapsed
                        "justify-center px-2": collapsed,
                        // Disable pointer
                        "opacity-50 cursor-not-allowed pointer-events-none": item.disabled,
                      },
                      className
                    )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${item.title}${item.description ? `. ${item.description}` : ""}${item.requiredTier ? `. Requires ${item.requiredTier} plan` : ""}`}
                  title={collapsed ? item.title : item.description}
                  tabIndex={item.disabled ? -1 : undefined}
                >
                  {/* Icon */}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary group-hover/sidebar-wrapper:text-primary"
                        : groupActive
                          ? "text-primary/95 group-hover:text-primary group-hover/sidebar-wrapper:text-primary"
                          : "text-primary/80 group-hover:text-primary group-hover/sidebar-wrapper:text-primary"
                    )}
                    aria-hidden="true"
                  />

                  {/* Title and Badge */}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-sm leading-tight">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Show single badge ONLY if locked (disabled) */}
                        {item.disabled && item.requiredTier && (() => {
                          const data = getTierBadge(item.requiredTier);
                          if (!data) return null;
                          const TierIcon = data.icon;
                          return (
                            <Badge
                              className={cn(
                                "h-5 w-5 p-0 flex items-center justify-center rounded-md backdrop-blur-sm border",
                                data.classes,
                                "shadow-sm"
                              )}
                              aria-label={`Locked: ${data.label} tier required`}
                            >
                              <TierIcon className="h-3.5 w-3.5" />
                              <span className="sr-only">{data.label}</span>
                            </Badge>
                          );
                        })()}
                      </div>
                    </>
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <>
                      {/* Left Accent Bar */}
                      <motion.div
                        layoutId="activeNavItem-bar"
                        className="absolute inset-y-1 left-0 w-1 rounded-r bg-gradient-to-b from-primary via-primary/90 to-primary/70"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        aria-hidden="true"
                      />
                      {/* Subtle glow */}
                      <motion.div
                        layoutId="activeNavItem-glow"
                        className="absolute inset-0 -z-10 rounded-lg bg-primary/10 blur-[1px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Link>
              </TooltipTrigger>
              {!collapsed && (
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs opacity-75">{item.description}</p>
                    )}
                    {item.requiredTier && (
                      <p className="text-xs text-muted-foreground">
                        Requires {item.requiredTier} plan
                      </p>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </motion.li>
      );
    },
    [pathname, collapsed, className, handleItemClick]
  );

  const renderNavGroup = useCallback(
    (group: NavGroup, index: number) => {
      const isExpanded = navState.expandedGroups.has(group.id);
      const isActive = navState.activeGroup === group.id;
      const GroupIcon = group.icon;

      if (group.items.length === 0) return null;

      return (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-2"
        >
          <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between p-2 h-auto font-medium text-sm min-h-[44px] transition-colors",
                  isActive
                    ? "bg-primary/25 text-primary ring-1 ring-primary/40 hover:bg-primary/30"
                    : "text-primary/75 hover:text-primary hover:bg-primary/15 group-hover/sidebar-wrapper:text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 touch-manipulation",
                  {
                    "justify-center": collapsed,
                  }
                )}
                onFocus={() => {
                  // When collapsed, focusing a group trigger should expand it for keyboard users
                  if (collapsed && !isExpanded) toggleGroup(group.id);
                }}
                disabled={!group.collapsible}
                title={collapsed ? group.title : group.description}
                aria-expanded={group.collapsible ? isExpanded : undefined}
                aria-controls={
                  group.collapsible
                    ? `nav-group-${group.id}-content`
                    : undefined
                }
                aria-label={`${group.title} navigation group. ${group.items.length} items${group.collapsible ? ". Click to expand or collapse" : ""}.`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon
                    className={cn("h-4 w-4 shrink-0", {
                      "text-primary": isActive,
                    })}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate text-sm">{group.title}</span>
                      {/* Single group badge only if group contains locked items */}
                      {(() => {
                        const data = getGroupLockedTier(group);
                        if (!data) return null;
                        const TierIcon = data.icon;
                        return (
                          <Badge
                            className={cn(
                              "h-5 w-5 p-0 flex items-center justify-center rounded-md backdrop-blur-sm border",
                              data.classes
                            )}
                            aria-label={`Locked items up to ${data.label} tier`}
                          >
                            <TierIcon className="h-3.5 w-3.5" />
                            <span className="sr-only">{data.label}</span>
                          </Badge>
                        );
                      })()}
                    </>
                  )}
                </div>
                {!collapsed && group.collapsible && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                )}
              </Button>
            </CollapsibleTrigger>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <CollapsibleContent
                  className="space-y-2"
                  id={`nav-group-${group.id}-content`}
                >
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-2 space-y-1 border-l border-border pl-2.5"
                    role="list"
                    aria-label={`${group.title} navigation items`}
                    variants={{
                      show: { transition: { staggerChildren: 0.035 } },
                      hide: {},
                    }}
                  >
                    {group.items.map((item, itemIndex) =>
                      renderNavItem(item, group.id, itemIndex)
                    )}
                  </motion.ul>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>

          {/* Collapsed items (show as tooltip or dropdown) */}
          {collapsed && isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-16 z-50 w-48 rounded-md border bg-popover p-2 shadow-lg"
              role="menu"
              aria-label={`${group.title} items`}
            >
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const itemActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleItemClick(item, group.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors",
                        "hover:bg-primary/20 hover:text-primary group-hover/sidebar-wrapper:text-primary disabled:opacity-40 disabled:pointer-events-none",
                        {
                          "bg-accent text-accent-foreground": itemActive,
                          "opacity-60": item.disabled,
                          // Tint non-active items within the active group
                          "text-primary/90 group-hover:text-primary": !itemActive && navState.activeGroup === group.id && !item.disabled,
                        }
                      )}
                      aria-disabled={item.disabled || undefined}
                      tabIndex={item.disabled ? -1 : 0}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          itemActive
                            ? "text-primary group-hover/sidebar-wrapper:text-primary"
                            : navState.activeGroup === group.id && !item.disabled
                              ? "text-primary/95 group-hover:text-primary group-hover/sidebar-wrapper:text-primary"
                              : !item.disabled
                                ? "text-primary/80 group-hover:text-primary group-hover/sidebar-wrapper:text-primary"
                                : "text-primary/40"
                        )}
                      />
                      <span>{item.title}</span>
                      {/* Collapsed: show icon badge only if locked */}
                      {item.disabled && item.requiredTier && (() => {
                        const data = getTierBadge(item.requiredTier);
                        if (!data) return null;
                        const TierIcon = data.icon;
                        return (
                          <Badge
                            className={cn(
                              "ml-auto h-5 w-5 p-0 flex items-center justify-center rounded-md backdrop-blur-sm border",
                              data.classes
                            )}
                          >
                            <TierIcon className="h-3.5 w-3.5" />
                            <span className="sr-only">{data.label}</span>
                          </Badge>
                        );
                      })()}
                      {item.disabled && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Upgrade</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      );
    },
    [
      navState.expandedGroups,
      navState.activeGroup,
      collapsed,
      toggleGroup,
      renderNavItem,
      handleItemClick,
      pathname,
    ]
  );

  if (!mounted) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "space-y-3",
        mobile
          ? "w-full max-w-full px-1"
          : "max-w-[15.5rem] w-[14.5rem]",
        !mobile && collapsed && "w-16 max-w-[4.5rem]",
        "[&_.tool-link]:whitespace-nowrap [&_.tool-link]:truncate",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <AnimatePresence initial={false}>
        {visibleGroups.map((group, index) => renderNavGroup(group, index))}
      </AnimatePresence>
    </nav>
  );
}

// Enhanced mobile navigation with bottom sheet behavior
export function EnhancedMobileNav({
  userTier,
  isAdmin = false,
  onItemClickAction,
  onCloseAction,
}: {
  userTier?: string;
  isAdmin?: boolean;
  onItemClickAction?: (item: NavItem) => void;
  onCloseAction?: () => void;
}) {
  const handleItemClick = useCallback(
    (item: NavItem) => {
      onItemClickAction?.(item);
      onCloseAction?.();
    },
    [onItemClickAction, onCloseAction]
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 340 }}
      className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border-t bg-background/98 backdrop-blur-xl shadow-2xl pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] px-4 sm:px-6"
      role="dialog"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/25" />
      <div className="max-h-[62vh] overflow-y-auto overscroll-contain pr-1 -mr-1 focus:outline-none" tabIndex={-1}>
        <EnhancedAppNav
          userTier={userTier}
          isAdmin={isAdmin}
          mobile={true}
          onItemClickAction={handleItemClick}
          className="space-y-1"
        />
      </div>
    </motion.div>
  );
}

export default EnhancedAppNav;
