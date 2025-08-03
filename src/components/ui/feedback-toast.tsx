"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { useUI } from "@/context/UIContext";

const iconMap = {
  success: CheckCircle,
  _error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "bg-success text-success-foreground",
  _error: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

export function FeedbackToast() {
  const { feedback, removeFeedback } = useUI();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {feedback.map(({ message, type, id }) => {
          // Map 'error' to '_error' for compatibility with iconMap and colorMap
          const mappedType = type === "error" ? "_error" : type;
          const Icon = iconMap[mappedType];
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`
                ${colorMap[mappedType]}
                rounded-lg shadow-lg p-4 pr-12
                flex items-center gap-3 relative
                cursor-pointer
              `}
              onClick={() => removeFeedback(id)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFeedback(id);
                }}
                className="absolute right-2 top-2 hover:opacity-80"
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
