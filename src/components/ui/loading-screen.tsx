// src/components/ui/loading-screen.tsx
"use client";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingScreenProps {
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export default function LoadingScreen({
  fullScreen = false,
  text = "Loading...",
  className = "",
}: LoadingScreenProps) {
  const inlineContent = (
    <div className="w-full max-w-xs p-4 space-y-4 text-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Rocket className="w-12 h-12 text-primary mx-auto" />
      </motion.div>

      <h2 className="text-md font-headline text-muted-foreground">{text}</h2>

      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );

  const fullScreenLoaderContent = (
    <div className="w-full max-w-md p-8 space-y-8 text-center">
      <motion.div
        animate={{
          y: [0, -15, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Rocket className="w-20 h-20 text-primary mx-auto" />
      </motion.div>

      <h2 className="text-xl font-headline">{text}</h2>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm text-foreground font-body"
        data-testid="loading-screen"
      >
        {fullScreenLoaderContent}
      </div>
    );
  }

  return (
    <Card
      className={`mt-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 ${className}`}
    >
      <CardContent className="p-6 flex items-center justify-center">
        {inlineContent}
      </CardContent>
    </Card>
  );
}
