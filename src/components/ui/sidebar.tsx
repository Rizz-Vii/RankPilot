"use client";

import React, {
  ReactNode,
  CSSProperties,
  ForwardedRef,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  forwardRef,
} from "react";
import { Slot, SlotProps } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "./sidebar.css";

// --- Constants ---
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "18rem";
const SIDEBAR_WIDTH_MOBILE = "20rem";
const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// --- Context ---
type SidebarContextType = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  pinned: boolean;
  setPinned: (pinned: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  isUserMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  hydrated: boolean;
};

// Adjusted context to be non-null initially, or handle null in useSidebar
const SidebarContext = createContext<SidebarContextType | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

// --- Provider ---
type SidebarProviderProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Remove style prop to prevent inline styles
};

const SidebarProvider = forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = false,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = useState(false);
    const [open, setOpen] = useState(defaultOpen && !isMobile);
    const [pinned, setPinned] = useState(defaultOpen && !isMobile);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      try {
        const cookie = document.cookie
          .split(";")
          .find((c) => c.trim().startsWith(`${SIDEBAR_COOKIE_NAME}=`));

        if (cookie) {
          const value = cookie.split("=")[1];
          const newPinned = value === "pinned";
          setPinned(newPinned);
          setOpen(newPinned); // A pinned sidebar should always be open initially
        } else {
          const initialPinned = defaultOpen && !isMobile;
          setPinned(initialPinned);
          setOpen(initialPinned);
        }
      } catch (error) {
        const initialPinned = defaultOpen && !isMobile;
        setPinned(initialPinned);
        setOpen(initialPinned);
      } finally {
        setHydrated(true);
      }
    }, [isMobile, defaultOpen]);

    // Sync with controlled prop
    useEffect(() => {
      if (openProp !== undefined) {
        setOpen(openProp);
      }
    }, [openProp]);

    // Sync with cookie
    useEffect(() => {
      if (hydrated && !isMobile) {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${pinned ? "pinned" : "collapsed"}; max-age=${SIDEBAR_COOKIE_MAX_AGE}; path=/`;
      }
    }, [pinned, isMobile, hydrated]);

    // Helper to toggle the sidebar.
    const toggleSidebar = useCallback(() => {
      if (isMobile) {
        setOpenMobile((current) => !current);
      } else {
        const newPinned = !pinned;
        setPinned(newPinned);
        setOpen(newPinned); // Pinning opens it, unpinning collapses it immediately.
      }
    }, [isMobile, setOpen, setOpenMobile, pinned, setPinned]);

    // Adds a keyboard shortcut to toggle the sidebar.
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return; // ignore while typing
        }
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        pinned,
        setPinned,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        isUserMenuOpen,
        setUserMenuOpen,
        hydrated,
      }),
      [
        state,
        open,
        setOpen,
        pinned,
        setPinned,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        isUserMenuOpen,
        hydrated,
      ]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            className={cn("group/sidebar-wrapper sidebar-wrapper", className)}
            ref={ref as any} // Cast ref to any
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    // Use ComponentPropsWithoutRef to easily remove ref from the type
    side?: "left" | "right";
  }
>(({ side = "left", className, children, ...props }, ref) => {
  const {
    isMobile,
    state,
    setOpen,
    openMobile,
    setOpenMobile,
    pinned,
    isUserMenuOpen,
    hydrated,
  } = useSidebar();

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (!pinned && mounted) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!pinned && !isUserMenuOpen && mounted) {
      setOpen(false);
    }
  };

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className={cn(
            "w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
            "sidebar-sheet-content-mobile"
          )}
          side={side}
          ref={ref as any} // Cast ref to any
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      ref={ref as any} // Cast ref to any
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group sticky top-0 z-40 h-screen flex-shrink-0 bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out flex flex-col",
        state === "expanded"
          ? "w-[var(--sidebar-width)]"
          : "w-[var(--sidebar-width-icon)]",
        className
      )}
      data-state={state}
      {...props}
    >
      {children}
    </aside>
  );
});
Sidebar.displayName = "Sidebar";

const SidebarTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> // Use ComponentPropsWithoutRef
>(({ className, onClick, ...props }, ref) => {
  const { isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar();

  if (isMobile) {
    return (
      <Button
        ref={ref as any} // Cast ref to any
        variant="ghost"
        size="icon"
        className={cn("md:hidden", className)}
        onClick={() => setOpenMobile(!openMobile)}
        {...props}
      >
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  }

  return (
    <Button
      ref={ref as any} // Cast ref to any
      variant="ghost"
      size="icon"
      className={cn("hidden md:flex", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarHeader = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  // Use ComponentPropsWithoutRef
  return (
    <div
      ref={ref as any} // Cast ref to any
      data-sidebar="header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  // Use ComponentPropsWithoutRef
  return (
    <div
      ref={ref as any} // Cast ref to any
      data-sidebar="footer"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  // Use ComponentPropsWithoutRef
  return (
    <div
      ref={ref as any} // Cast ref to any
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

type SidebarMenuProps = {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
};

const SidebarMenu = forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({ asChild = false, className, children }, ref) => {
    const Comp = asChild ? Slot : "ul";

    return (
      <Comp
        ref={ref as any}
        data-sidebar="menu"
        className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      >
        {children}
      </Comp>
    );
  }
);

SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = motion.create(
  forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
    ({ className, ...props }, ref) => (
      <li
        ref={ref}
        data-sidebar="menu-item"
        className={cn("group/menu-item relative", className)}
        {...props}
      />
    )
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[state=collapsed]:!p-0 group-data-[state=collapsed]:justify-center",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-10 text-sm",
        sm: "h-9 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type SidebarMenuButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">, // Omit ref, variant, and size
  "ref" | "variant" | "size"
> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  };

const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref as any} // Cast ref to any
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          sidebarMenuButtonVariants({ variant, size }),
          "[&_svg]:size-5",
          className
        )}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

// Assuming SidebarMenuLink is also intended, as it was in previous versions.
// If not, it can be removed. I'll include it with fixes for consistency.
type SidebarMenuLinkProps = Omit<
  React.ComponentPropsWithoutRef<"a">, // Omit ref, variant, and size
  "ref" | "variant" | "size"
> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  };

const SidebarMenuLink = forwardRef<HTMLAnchorElement, SidebarMenuLinkProps>(
  (
    {
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const { isMobile, state } = useSidebar();

    const link = (
      <a
        ref={ref as any} // Cast ref to any
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          sidebarMenuButtonVariants({ variant, size }),
          "hover:no-underline [&_svg]:size-5",
          className
        )}
        {...props}
      />
    );

    if (!tooltip) {
      return link;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    );
  }
);
SidebarMenuLink.displayName = "SidebarMenuLink";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuLink, // Ensure SidebarMenuLink is also exported if used
  useSidebar,
};
