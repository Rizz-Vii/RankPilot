import type { NextConfig } from "next";

// Check if this is a Firebase deployment build
const isFirebaseDeployment = process.env.FIREBASE_DEPLOY === 'true';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checking during build for deployment
  typescript: {
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
    ],
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle Handlebars
    config.resolve.alias.handlebars = "handlebars/dist/handlebars.min.js";

    // Ignore specific Node.js only modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false, // Add other Node.js built-ins that might be used
      };
    }

    // Firebase deployment optimizations
    if (isFirebaseDeployment) {
      // Suppress webpack stats in Firebase builds
      config.stats = "errors-only";
    }

    return config;
  },  // Experimental features
  experimental: {
    // Configure server actions with proper options
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: (() => {
        const base = ["localhost:3000"];
        if (process.env.NODE_ENV !== "production") {
          const csName = process.env.CODESPACE_NAME;
          const csDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN; // e.g., app.github.dev
          const port = process.env.PORT || "3000";
          if (csName && csDomain) base.push(`${csName}-${port}.${csDomain}`);
        }
        return base;
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

  // Add custom headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value:
              process.env.NODE_ENV === "production"
                ? "payment=(), microphone=(), camera=(), geolocation=(), interest-cohort=()"
                : "payment=(self), microphone=(), camera=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            // Intentionally no CSP here; handled via middleware to avoid duplicates
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
