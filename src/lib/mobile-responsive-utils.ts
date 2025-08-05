"use client";

import { useEffect, useState } from "react";

/**
 * Mobile Responsive Utilities
 * A collection of hooks and utilities for responsive mobile design
 */

// Type definitions for Navigator with connection property
interface NetworkConnection extends EventTarget {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
}

interface NavigatorWithMSTouch extends Navigator {
  msMaxTouchPoints?: number;
}

// Standard breakpoints based on Tailwind CSS defaults
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to check if the current viewport is mobile sized
 * @param maxWidth - Maximum width to consider as mobile (defaults to md/768px)
 */
export function useIsMobile(maxWidth: Breakpoint = "md") {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoints[maxWidth]);
    };

    // Set initial state on mount
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile);

    // Clean up the event listener
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, [maxWidth]);

  return isMobile;
}

/**
 * Hook to get current viewport size and corresponding breakpoint
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    breakpoint: "xs" as Breakpoint,
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine current breakpoint
      let currentBreakpoint: Breakpoint = "xs";

      if (width >= breakpoints["2xl"]) {
        currentBreakpoint = "2xl";
      } else if (width >= breakpoints.xl) {
        currentBreakpoint = "xl";
      } else if (width >= breakpoints.lg) {
        currentBreakpoint = "lg";
      } else if (width >= breakpoints.md) {
        currentBreakpoint = "md";
      } else if (width >= breakpoints.sm) {
        currentBreakpoint = "sm";
      }

      setViewport({ width, height, breakpoint: currentBreakpoint });
    };

    // Set initial viewport on mount
    updateViewport();

    // Add event listener for window resize
    window.addEventListener("resize", updateViewport);

    // Clean up the event listener
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return viewport;
}

/**
 * Hook to monitor and manage network connection status
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    online: true,
    downlink: 10, // Default to high speed before detection
    effectiveType: "unknown",
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const nav = navigator as NavigatorWithConnection;

      setStatus({
        online: navigator.onLine,
        downlink: nav.connection?.downlink || 10,
        effectiveType: nav.connection?.effectiveType || "unknown",
        saveData: nav.connection?.saveData || false,
      });
    };

    updateNetworkStatus();

    // Listen for online/offline events
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Listen for connection changes if supported
    const navWithConnection = navigator as NavigatorWithConnection;
    if (navWithConnection.connection) {
      navWithConnection.connection.addEventListener(
        "change",
        updateNetworkStatus
      );
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);

      const navWithConnection = navigator as NavigatorWithConnection;
      if (navWithConnection.connection) {
        navWithConnection.connection.removeEventListener(
          "change",
          updateNetworkStatus
        );
      }
    };
  }, []);

  return status;
}

/**
 * Hook to detect touch-capable devices
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const detectTouch = () => {
      setIsTouch(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as NavigatorWithMSTouch).msMaxTouchPoints || 0) > 0
      );
    };

    detectTouch();
  }, []);

  return isTouch;
}

/**
 * Hook to apply adaptive loading based on device capabilities
 * @param initialState - Whether the element is initially loaded
 * @param mobileDeferral - Whether to defer loading on mobile devices
 */
export function useAdaptiveLoading(
  initialState = false,
  mobileDeferral = true
) {
  const [isLoaded, setIsLoaded] = useState(initialState);
  const isMobile = useIsMobile();

  useEffect(() => {
    // If mobile and deferral is enabled, use intersection observer for lazy loading
    if (isMobile && mobileDeferral) {
      const onIntersection: IntersectionObserverCallback = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
          }
        });
      };

      const observer = new IntersectionObserver(onIntersection, {
        rootMargin: "200px", // Load before it's visible
        threshold: 0.01,
      });

      const target = document.getElementById("adaptive-load-trigger");
      if (target) {
        observer.observe(target);
      }

      return () => {
        if (target) {
          observer.unobserve(target);
        }
      };
    } else {
      // On desktop, load immediately
      setIsLoaded(true);
    }
  }, [isMobile, mobileDeferral]);

  return isLoaded;
}

/**
 * Responsive font size calculator for dynamic typography
 * @param baseSize - Base font size in pixels
 * @param scale - Scale factor for different breakpoints (0.85 makes fonts 15% smaller on mobile)
 */
export function useResponsiveFont(baseSize: number, scale: number = 0.85) {
  const isMobile = useIsMobile();
  return isMobile ? `${baseSize * scale}px` : `${baseSize}px`;
}

/**
 * Helper function to create breakpoint-specific classes
 * @param className - Base className to apply
 * @param breakpointClasses - Object containing breakpoint-specific classes
 * Example: responsiveClasses('p-4', { sm: 'p-2', md: 'p-6' })
 * Result: 'p-4 sm:p-2 md:p-6'
 */
export function responsiveClasses(
  className: string,
  breakpointClasses: Partial<Record<Breakpoint, string>>
): string {
  return Object.entries(breakpointClasses).reduce(
    (classes, [breakpoint, value]) => `${classes} ${breakpoint}:${value}`,
    className
  );
}

/**
 * Utility to check and handle orientation changes
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );

  useEffect(() => {
    const updateOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? "portrait" : "landscape");
    };

    // Set initial orientation
    updateOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", updateOrientation);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Network-aware data fetching for mobile
 * @param options - Configuration options
 */
export function useNetworkAwareFetching(
  options = { enableSaveData: true, enableOfflineDetection: true }
) {
  const [networkStatus, setNetworkStatus] = useState({
    online: true,
    saveData: false,
    effectiveType: "unknown",
  });

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        online: navigator.onLine,
      }));
    };

    // Check data saver preference if available
    const updateConnectionInfo = () => {
      const connection = (navigator as NavigatorWithConnection).connection;

      if (connection) {
        setNetworkStatus({
          online: navigator.onLine,
          saveData: connection.saveData || false,
          effectiveType: connection.effectiveType || "unknown",
        });
      }
    };

    // Set initial values
    updateOnlineStatus();

    if (options.enableSaveData && "connection" in navigator) {
      updateConnectionInfo();
      const navWithConnection = navigator as NavigatorWithConnection;
      navWithConnection.connection?.addEventListener(
        "change",
        updateConnectionInfo
      );
    }

    if (options.enableOfflineDetection) {
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);
    }

    // Cleanup
    return () => {
      if (options.enableSaveData && "connection" in navigator) {
        const navWithConnection = navigator as NavigatorWithConnection;
        navWithConnection.connection?.removeEventListener(
          "change",
          updateConnectionInfo
        );
      }

      if (options.enableOfflineDetection) {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      }
    };
  }, [options.enableSaveData, options.enableOfflineDetection]);

  return networkStatus;
}

/**
 * Helper for adaptive image loading based on device and network capabilities
 */
export function getAdaptiveImageProps(
  src: string,
  mobileSrc?: string,
  options = {
    enableSaveData: true,
    sizeFactor: 0.5, // Reduce image size by 50% on slow connections
  }
): { src: string; loading: "lazy" | "eager"; quality?: number } {
  // Check for network conditions
  const connection = (navigator as NavigatorWithConnection).connection;
  const isSlowConnection =
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g";
  const isSaveData = options.enableSaveData && connection?.saveData;

  // Determine source
  let imageSrc = src;
  if (mobileSrc && window.innerWidth < breakpoints.md) {
    imageSrc = mobileSrc;
  }

  // Determine quality
  let quality = 100;
  if (isSlowConnection || isSaveData) {
    quality = Math.round(100 * options.sizeFactor);
  }

  // Determine loading strategy
  const loading = isSlowConnection ? "lazy" : "eager";

  return {
    src: imageSrc,
    loading,
    quality,
  };
}
