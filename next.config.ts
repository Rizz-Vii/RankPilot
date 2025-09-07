import type { NextConfig } from "next";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Compiler, Configuration, ModuleOptions } from "webpack";
// Enable bundle analyzer when ANALYZE=true (ESM import)
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Check if this is a Firebase deployment build
const isFirebaseDeployment = process.env.FIREBASE_DEPLOY === "true";

const baseConfig: NextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,
  // Enable production source maps to correlate chunk IDs (e.g., 6215-*.js) with original source when debugging
  productionBrowserSourceMaps: true,

  // ESLint/TS settings
  eslint: {
    // Skip lint during build to avoid non-critical blockers in CI/framework builders
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checking during build for deployment
  typescript: {
    // Do not fail the production build on type errors; separate typecheck scripts handle this
    ignoreBuildErrors: true,
  },

  // Configure image domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Plugin to ensure legacy middleware manifest exists for deploy tools expecting it
    class EnsureMiddlewareManifestPlugin {
      apply(compiler: Compiler) {
        compiler.hooks.afterEmit.tap("EnsureMiddlewareManifestPlugin", () => {
          try {
            const outDir = (compiler &&
              compiler.options &&
              compiler.options.output &&
              compiler.options.output.path) as string | undefined;
            if (!outDir) return;
            const serverDir = outDir; // on server build this points to .next/server
            // 1) Ensure legacy middleware-manifest.json
            const middlewareManifestPath = path.join(
              serverDir,
              "middleware-manifest.json"
            );
            if (!fs.existsSync(middlewareManifestPath)) {
              const stub = {
                version: 1,
                middleware: {
                  "/": {
                    env: [],
                    files: [],
                    name: "middleware",
                    page: "/",
                    regexp: "^(?!/_next/|/static/|/favicon\\.ico).*$",
                  },
                },
                functions: {},
                sortedMiddleware: ["/"],
              };
              fs.mkdirSync(serverDir, { recursive: true });
              fs.writeFileSync(
                middlewareManifestPath,
                JSON.stringify(stub, null, 2)
              );
              console.log(
                "[EnsureMiddlewareManifestPlugin] Wrote minimal middleware-manifest.json"
              );
            }

            // NOTE: Do NOT emit pages-manifest.json for App Router-only apps.
            // Generating an empty pages-manifest in Next 15 can cause the builder
            // to attempt loading /_document, which doesn't exist in App Router.
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn("[EnsureMiddlewareManifestPlugin] Non-fatal:", msg);
          }
        });
      }
    }
    // Handle Handlebars
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      handlebars: "handlebars/dist/handlebars.min.js",
      // Firebase App Check is optional in dev/test. Alias only the public module path to a noop shim.
      // Avoid aliasing internal "@firebase/*" packages to prevent export shape mismatches at runtime.
      // Some environments attempt to resolve internal packages. Map them to safe public equivalents.
      // Intentionally do NOT alias internal '@firebase/*' packages; rely on installed packages.
      "firebase/app-check": path.resolve(
        __dirname,
        "src/lib/firebase/shims/app-check.js"
      ),
    };

    // Ignore specific Node.js only modules in browser
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false, // Add other Node.js built-ins that might be used
      };
    }

    // During development, ignore bulky folders that shouldn't trigger rebuilds
    if (dev) {
      const _cfg = config as { watchOptions?: Record<string, unknown> };
      _cfg.watchOptions = {
        ...(_cfg.watchOptions || {}),
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/node_modules/**",
          "backups/**",
          "cache/**",
          "sessions/**",
          "testing/results/**",
          "testing/reports/**",
        ],
      };
    }

    // Firebase deployment optimizations
    if (isFirebaseDeployment) {
      // Suppress webpack stats in Firebase builds
      config.stats = "errors-only";
    }

    // Add the manifest plugin on server build to aid external builders (e.g., Firebase frameworks)
    if (isServer) {
      (config as Configuration).plugins = config.plugins ?? [];
      config.plugins!.push(new EnsureMiddlewareManifestPlugin());
    }

    // Reduce noisy critical dependency warnings from dynamic requires in optional instrumentation libs
    // (e.g., @opentelemetry/instrumentation used via genkit). This does not affect bundling correctness.
    // See: https://webpack.js.org/configuration/module/#moduleexprcontextcritical
    // and https://webpack.js.org/configuration/other-options/#ignorewarnings
    // Safely set exprContextCritical=false
    config.module = {
      ...(config.module || ({} as ModuleOptions)),
      exprContextCritical: false,
    } as ModuleOptions;
    // Ignore specific noisy warning: "Critical dependency: the request of a dependency is an expression"
    // originating from optional OpenTelemetry dynamic requires pulled in by genkit tracing.
    const otelCriticalPredicate = (warning: unknown) => {
      // webpack 5 Warning type shape guard with safe index access
      const w = warning as
        | {
            message?: string;
            module?: { resource?: string };
            moduleName?: string;
          }
        | undefined;
      const resource = w?.module?.resource ?? w?.moduleName;
      return (
        typeof w?.message === "string" &&
        w.message.includes(
          "Critical dependency: the request of a dependency is an expression"
        ) &&
        /@opentelemetry\/instrumentation/.test(String(resource || ""))
      );
    };
    // Merge with existing ignoreWarnings entries
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      otelCriticalPredicate,
    ];

    return config;
  }, // Experimental features
  experimental: {
    // Configure server actions with proper options
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: (() => {
        const list = new Set<string>(["localhost:3000"]);
        if (process.env.NODE_ENV !== "production") {
          const csName = process.env.CODESPACE_NAME;
          const csDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN; // e.g., app.github.dev
          const port = process.env.PORT || "3000";
          if (csName && csDomain) list.add(`${csName}-${port}.${csDomain}`);
        } else {
          // Allow Firebase Hosting default domain and custom domain if provided
          const fbProj =
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
            (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
              `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.web.app`);
          const fbApp = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
          const customDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
          [fbProj, fbApp, customDomain]
            .filter(Boolean)
            .forEach((h) => list.add(String(h)));
        }
        return Array.from(list);
      })(),
    },
  },

  // Logging configuration for Firebase deployments
  ...(isFirebaseDeployment && {
    logging: {
      fetches: {
        fullUrl: false,
      },
    },
  }),

  // Timeouts and limits
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Configure HTTP compression
  // Disable built-in compression to avoid potential double-compression by upstream proxies/CDNs
  // (Firebase Hosting frameworks) which can truncate streamed RSC responses and trigger
  // client-side "Connection closed." errors.
  compress: false,
  // All security and CSP headers are consolidated in src/middleware.ts to avoid duplication.
};

const nextConfig = withBundleAnalyzer({
  ...baseConfig,
  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
    "lodash-es": {
      transform: "lodash-es/{{member}}",
    },
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
      skipDefaultConversion: true,
    },
    "react-icons/fa": {
      // Import only the used FontAwesome icons to avoid bundling the whole pack
      transform: "react-icons/fa/{{member}}",
    },
  },
});

export default nextConfig;
