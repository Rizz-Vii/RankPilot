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
      allowedOrigins: ["localhost:3000"],
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
            _key: "X-DNS-Prefetch-Control",
            _value: "on",
          },
          {
            _key: "Permissions-Policy",
            _value: "payment=(), microphone=(), camera=(), geolocation=(), interest-cohort=()"
          },
          {
            _key: "Strict-Transport-Security",
            _value: "max-age=31536000; includeSubDomains",
          },
          {
            _key: "X-Frame-Options",
            _value: "SAMEORIGIN",
          },
          {
            _key: "X-Content-Type-Options",
            _value: "nosniff",
          },
          {
            _key: "Referrer-Policy",
            _value: "origin-when-cross-origin",
          },
          {
            _key: "Content-Security-Policy",
            _value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' " +
              "https://apis.google.com " +
              "https://*.firebaseapp.com " +
              "https://*.firebase.com " +
              "https://js.stripe.com " +
              "https://*.paypal.com " +
              "https://www.paypal.com " +
              "https://www.google.com " +
              "https://www.gstatic.com " +
              "https://www.googletagmanager.com " +
              "https://www.google-analytics.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' _data: https:; " +
              "connect-src 'self' " +
              "https://*.firebaseapp.com " +
              "https://*.firebase.com " +
              "https://www.google-analytics.com " +
              "https://*.googleapis.com " +
              "https://api.stripe.com " +
              "https://*.paypal.com " +
              "https://www.paypal.com; " +
              "frame-src 'self' " +
              "https://*.firebaseapp.com " +
              "https://*.firebase.com " +
              "https://js.stripe.com " +
              "https://*.stripe.com " +
              "https://*.paypal.com " +
              "https://www.google.com; " +
              "object-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
