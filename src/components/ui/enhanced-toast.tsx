"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (message: string, options?: Partial<Toast>) => string;
  _error: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  info: (message: string, options?: Partial<Toast>) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
  position = "top-right",
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addToast = useCallback(
    (toastData: Omit<Toast, "id">) => {
      const id = generateId();
      const toast: Toast = {
        id,
        duration: defaultDuration,
        dismissible: true,
        persistent: false,
        ...toastData,
      };

      setToasts((prevToasts) => {
        const newToasts = [toast, ...prevToasts];
        // Limit number of toasts
        return newToasts.slice(0, maxToasts);
      });

      // Auto-remove toast after duration (if not persistent)
      if (!toast.persistent && toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }

      return id;
    },
    [defaultDuration, maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper methods for different toast types
  const success = useCallback(
    (message: string, options?: Partial<Toast>) => {
      return addToast({
        description: message,
        type: "success",
        ...options,
      });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: Partial<Toast>) => {
      return addToast({
        description: message,
        type: "error",
        duration: 7000, // Longer duration for errors
        ...options,
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: Partial<Toast>) => {
      return addToast({
        description: message,
        type: "warning",
        ...options,
      });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: Partial<Toast>) => {
      return addToast({
        description: message,
        type: "info",
        ...options,
      });
    },
    [addToast]
  );

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-center":
        return "top-4 left-1/2 -translate-x-1/2";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-center":
        return "bottom-4 left-1/2 -translate-x-1/2";
      default: // top-right
        return "top-4 right-4";
    }
  };

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    _error: error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div
        className={cn(
          "fixed z-50 flex flex-col gap-2 w-full max-w-sm",
          getPositionClasses()
        )}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastComponent
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

interface ToastComponentProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastComponent({ toast, onRemove }: ToastComponentProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case "success":
        return "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100";
      case "error":
        return "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100";
      case "warning":
        return "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100";
      case "info":
        return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100";
      default:
        return "border-border bg-background text-foreground";
    }
  };

  const handleRemove = () => {
    onRemove(toast.id);
  };

  // Auto-remove logic with hover pause
  useEffect(() => {
    if (toast.persistent || !toast.duration || toast.duration <= 0) return;

    let timeoutId: NodeJS.Timeout;

    if (!isHovered) {
      timeoutId = setTimeout(() => {
        handleRemove();
      }, toast.duration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [toast.duration, toast.persistent, isHovered]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: "spring", duration: 0.4 }}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm",
        getColorClasses()
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90">{toast.description}</div>
        )}
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toast.action.onClick}
            className="h-auto p-0 text-xs font-medium underline-offset-4 hover:underline"
          >
            {toast.action.label}
          </Button>
        )}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="h-auto w-auto p-1 opacity-70 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Progress Bar (for timed toasts) */}
      {!toast.persistent && toast.duration && toast.duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-lg"
          initial={{ width: "100%" }}
          animate={{ width: isHovered ? "100%" : "0%" }}
          transition={{
            duration: isHovered ? 0 : toast.duration / 1000,
            ease: "linear",
          }}
        />
      )}
    </motion.div>
  );
}

// Hook for simple toast usage without context
export function useSimpleToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, ...toast };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 toasts

    if (!toast.persistent && toast.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration || 5000);
    }

    return id;
  }, []);

  return { toasts, addToast };
}
