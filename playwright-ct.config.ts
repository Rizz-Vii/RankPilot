import { defineConfig } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  testDir: "./testing/ct",
  timeout: 60000,
  reporter: [["list"]],
  use: {
    // Explicitly point to the template dir (dev-server mode)
    ctTemplateDir: "playwright",
    ctViteConfig: {
      mode: "development",
      server: { port: 3100, middlewareMode: false },
      plugins: [react()],
      define: {
        "process.env.NODE_ENV": JSON.stringify("development"),
      },
      resolve: {
        alias: [
          // Regex guards for absolute module ids (some transforms emit absolute paths)
          {
            find: /\/src\/lib\/firebase\/connection-manager(\.ts|\.js)?$/,
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/connection-manager.ts"
            ),
          },
          {
            find: /\/src\/lib\/firebase\/index(\.ts|\.js)?$/,
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase.ts"
            ),
          },
          // Force critical Firebase modules to mocks first
          {
            find: path.resolve(
              __dirname,
              "src/lib/firebase/connection-manager.ts"
            ),
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/connection-manager.ts"
            ),
          },
          {
            find: path.resolve(__dirname, "src/lib/firebase/index.ts"),
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase.ts"
            ),
          },
          // Then match by module specifiers
          {
            find: "@/lib/firebase/connection-manager",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/connection-manager.ts"
            ),
          },
          {
            find: "@/lib/firebase/index",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase.ts"
            ),
          },
          {
            find: "@/lib/firebase",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase.ts"
            ),
          },
          {
            find: path.resolve(__dirname, "src/lib/firebase.ts"),
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase.ts"
            ),
          },
          {
            find: "@/hooks/useAuthGuard",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/useAuthGuard.ts"
            ),
          },
          {
            find: "@/context/AuthContext",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/AuthContext.tsx"
            ),
          },
          {
            find: "@/lib/services/enhanced-auth.service",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/enhanced-auth.service.ts"
            ),
          },
          {
            find: "@/lib/user-subscription-sync",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/user-subscription-sync.ts"
            ),
          },
          {
            find: "@/lib/dev-auth",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/dev-auth.ts"
            ),
          },
          {
            find: "next/navigation",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/next-navigation.ts"
            ),
          },
          {
            find: "next/image",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/next-image.tsx"
            ),
          },
          {
            find: "next/link",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/next-link.tsx"
            ),
          },
          {
            find: "firebase/auth",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase-auth.ts"
            ),
          },
          {
            find: "firebase/firestore",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase-firestore.ts"
            ),
          },
          {
            find: "firebase/functions",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase-functions.ts"
            ),
          },
          {
            find: "firebase/storage",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase-storage.ts"
            ),
          },
          {
            find: "firebase/analytics",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/firebase-analytics.ts"
            ),
          },
          {
            find: "react-google-recaptcha",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/recaptcha.tsx"
            ),
          },
          {
            find: "lucide-react",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/lucide-react.tsx"
            ),
          },
          {
            find: "framer-motion",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/framer-motion.tsx"
            ),
          },
          {
            find: "@/components/ui/loading-screen",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/loading-screen.tsx"
            ),
          },
          {
            find: "tailwind-merge",
            replacement: path.resolve(
              __dirname,
              "testing/ct/mocks/tw-merge.ts"
            ),
          },
          {
            find: "clsx",
            replacement: path.resolve(__dirname, "testing/ct/mocks/clsx.ts"),
          },
          // Finally, base alias: only map imports that start with '@/...' to src
          { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
        ],
      },
    },
  },
});
