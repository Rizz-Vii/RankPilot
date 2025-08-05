"use client";

import React from "react";
import { useUI } from "@/context/UIContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

interface MainPanelProps {
  children?: React.ReactNode;
}

export function MainPanel({ children }: MainPanelProps) {
  const { isProcessing } = useUI();

  return (
    <motion.main
      className={`
        flex-1 flex flex-col min-h-0 overflow-y-auto
        bg-background px-4 py-6 md:px-6
        transition-opacity duration-200
        ${isProcessing ? "opacity-50" : "opacity-100"}
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 mx-auto w-full max-w-7xl">{children}</div>
    </motion.main>
  );
}
