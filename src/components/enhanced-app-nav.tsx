"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedAppNavProps {
  userTier?: string;
  isAdmin?: boolean;
  className?: string;
  mobile?: boolean;
  onItemClickAction?: (_item: NavItem) => void;
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

  // Initialize navigation state
  useEffect(() => {
    setMounted(true);
    try {
      const groups = getVisibleNavGroups(userTier, isAdmin);
      setVisibleGroups(groups);

      // Set initial expanded state based on current pathname
      const activeGroup = groups.find((group) =>
        group.items.some((_item) => item.href === pathname)
      );

      if (activeGroup) {
        setNavState((prev) => ({
          ...prev,
          expandedGroups: new Set([...prev.expandedGroups, activeGroup.id]),
          activeGroup: activeGroup.id,
          activeItem: pathname || undefined,
        }));
      }
    } catch (_error) {
      const fallback = handleNavError(
        error as Error,
        "EnhancedAppNav initialization"
      );
      console.warn(fallback.message);
    }
  }, [userTier, isAdmin, pathname]);

  const toggleGroup = useCallback((groupId: string) => {
    setNavState((prev) => {
      const newExpanded = new Set(prev.expandedGroups);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return {
        ...prev,
        expandedGroups: newExpanded,
      };
    });
  }, []);

  const handleItemClick = useCallback(
    (_item: NavItem, groupId: string) => {
      trackNavigation(item.href, groupId);
      setNavState((prev) => ({
        ...prev,
        activeItem: item.href,
        activeGroup: groupId,
      }));
      onItemClickAction?.(_item);
    },
    [onItemClickAction]
  );

  const renderNavItem = useCallback(
    (_item: NavItem, groupId: string, _index: number) => {
      const isActive = pathname === item.href;
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
                  onClick={() => handleItemClick(_item, groupId)}
                  className={cn(
                    "tool-link group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-accent hover:text-accent-foreground w-full min-w-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "min-h-[44px] touch-manipulation", // WCAG touch target size
                    {
                      "bg-accent text-accent-foreground shadow-sm": isActive,
                      "text-muted-foreground hover:text-foreground": !isActive,
                      "justify-center px-2": collapsed,
                      "opacity-50 cursor-not-allowed pointer-events-none":
                        item.disabled,
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
                    className={cn("h-4 w-4 shrink-0 transition-colors", {
                      "text-primary": isActive,
                      "group-hover:text-primary": !isActive,
                    })}
                    aria-hidden="true"
                  />

                  {/* Title and Badge */}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-sm leading-tight">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.badge && (
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className="h-4 px-1.5 text-xs"
                            aria-label={`${item.badge} feature`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {item.requiredTier && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-xs"
                            aria-label={`Requires ${item.requiredTier} plan`}
                          >
                            {item.requiredTier}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavItem"
                      className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-lg"
                      initial={false}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                      aria-hidden="true"
                    />
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
    (group: NavGroup, _index: number) => {
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
                  "w-full justify-between p-2 h-auto font-medium text-sm min-h-[44px]",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "touch-manipulation", // Better touch handling
                  {
                    "bg-accent/50 text-accent-foreground": isActive,
                    "justify-center": collapsed,
                  }
                )}
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
                      {group.badge && (
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className="h-5 px-1.5 text-xs"
                        >
                          {group.badge}
                        </Badge>
                      )}
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
                    className="ml-2 space-y-2 border-l border-border pl-2.5"
                    role="list"
                    aria-label={`${group.title} navigation items`}
                  >
                    {group.items.map((_item, itemIndex) =>
                      renderNavItem(_item, group.id, itemIndex)
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
            >
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  {group.title}
                </div>
                {group.items.map((_item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleItemClick(_item, group.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      {
                        "bg-accent text-accent-foreground":
                          pathname === item.href,
                      }
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-4 px-1 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
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
      className={cn("space-y-3 min-w-fit max-w-xs", className)}
      role="navigation"
      aria-label="Main navigation"
    >
      <AnimatePresence initial={false}>
        {visibleGroups.map((group, _index) => renderNavGroup(group, _index))}
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
  onItemClickAction?: (_item: NavItem) => void;
  onCloseAction?: () => void;
}) {
  const handleItemClick = useCallback(
    (_item: NavItem) => {
      onItemClickAction?.(_item);
      onCloseAction?.();
    },
    [onItemClickAction, onCloseAction]
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-[60] rounded-t-xl border-t bg-background p-4 shadow-lg"
    >
      <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20 mb-4" />
      <div className="max-h-[60vh] overflow-y-auto">
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
