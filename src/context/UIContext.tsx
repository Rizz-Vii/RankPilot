"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface Feedback {
  message: string;
  type: "success" | "error" | "info" | "warning";
  id: string;
}

interface UIContextType {
  isNavigating: boolean;
  setIsNavigating: (_value: boolean) => void;
  lastFocusedElement: HTMLElement | null;
  setLastFocusedElement: (_element: HTMLElement | null) => void;
  isMounted: boolean;
  feedback: Feedback[];
  addFeedback: (message: string, type: Feedback["type"]) => void;
  removeFeedback: (id: string) => void;
  isProcessing: boolean;
  setIsProcessing: (_value: boolean) => void;
  scrollToTop: () => void;
  scrollToElement: (elementId: string) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastFocusedElement, setLastFocusedElement] =
    useState<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const addFeedback = useCallback((message: string, type: Feedback["type"]) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFeedback((prev) => [...prev, { message, type, id }]);

    // Auto-remove feedback after 5 seconds
    setTimeout(() => {
      removeFeedback(id);
    }, 5000);
  }, []);

  const removeFeedback = useCallback((id: string) => {
    setFeedback((prev) => prev.filter((_item) => item.id !== id));
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (_element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  return (
    <UIContext.Provider
      value={{
        isNavigating,
        setIsNavigating,
        lastFocusedElement,
        setLastFocusedElement,
        isMounted,
        feedback,
        addFeedback,
        removeFeedback,
        isProcessing,
        setIsProcessing,
        scrollToTop,
        scrollToElement,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
