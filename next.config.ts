import type { NextConfig } from "next";
// Enable bundle analyzer when ANALYZE=true (ESM import)
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// Check if this is a Firebase deployment build
const isFirebaseDeployment = process.env.FIREBASE_DEPLOY === 'true';

const baseConfig: NextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // ESLint/TS settings
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: false,
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
    // Handle Handlebars
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), handlebars: "handlebars/dist/handlebars.min.js" };

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
          '**/.git/**',
          '**/.next/**',
          '**/node_modules/**',
          'backups/**',
          'cache/**',
          'sessions/**',
          'testing/results/**',
          'testing/reports/**'
        ],
      };
    }

    // Firebase deployment optimizations
    if (isFirebaseDeployment) {
      // Suppress webpack stats in Firebase builds
      config.stats = "errors-only";
    }

    // Reduce noisy critical dependency warnings from dynamic requires in optional instrumentation libs
    // (e.g., @opentelemetry/instrumentation used via genkit). This does not affect bundling correctness.
    // See: https://webpack.js.org/configuration/module/#moduleexprcontextcritical
    // and https://webpack.js.org/configuration/other-options/#ignorewarnings
    // Safely set exprContextCritical=false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.module as any) = config.module || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.module as any).exprContextCritical = false;
    // Ignore specific noisy warning: "Critical dependency: the request of a dependency is an expression"
    // originating from optional OpenTelemetry dynamic requires pulled in by genkit tracing.
    const otelCriticalPredicate = (warning: unknown) => {
      // webpack 5 Warning type shape guard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = warning as any;
      return (
        typeof w?.message === 'string' &&
        w.message.includes('Critical dependency: the request of a dependency is an expression') &&
        /@opentelemetry\/instrumentation/.test(String(w?.module?.resource || w?.moduleName || ''))
      );
    };
    // Merge with existing ignoreWarnings entries
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      otelCriticalPredicate,
    ];

    return config;
  },  // Experimental features
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
          const fbProj = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.web.app`;
          const fbApp = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
          const customDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
          [fbProj, fbApp, customDomain].filter(Boolean).forEach((h) => list.add(String(h)));
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
  compress: true,
  // All security and CSP headers are consolidated in src/middleware.ts to avoid duplication.
};

const nextConfig = withBundleAnalyzer({
  ...baseConfig,
  modularizeImports: {
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    'lodash-es': {
      transform: 'lodash-es/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
      skipDefaultConversion: true,
    },
    'react-icons/fa': {
      // Import only the used FontAwesome icons to avoid bundling the whole pack
      transform: 'react-icons/fa/{{member}}',
    },
  },
});

export default nextConfig;
