/** @type {import('next').NextConfig} */

const isDevelopment = process.env.NODE_ENV === 'development';
const isFirebaseDeployment = process.env.FIREBASE_DEPLOY === 'true';

const nextConfig = {
    // Core configuration
    reactStrictMode: true,
    productionBrowserSourceMaps: false,

    // Suppress console output during Firebase deployment
    compiler: {
        removeConsole: isFirebaseDeployment ? {
            exclude: ['error']
        } : false
    },

    // Quiet mode for deployment
    eslint: {
        ignoreDuringBuilds: isFirebaseDeployment
    },

    typescript: {
        ignoreBuildErrors: false
    },

    // Logging configuration
    logging: {
        fetches: {
            fullUrl: isDevelopment && !isFirebaseDeployment
        }
    },

    // Optimize for deployment
    swcMinify: true,

    // Environment variables
    env: {
        CUSTOM_KEY: 'rankpilot-production',
        BUILD_TIME: new Date().toISOString(),
    },

    // Redirect configuration
    async redirects() {
        return [
            {
                source: '/home',
                destination: '/dashboard',
                permanent: true,
            },
        ];
    },

    // Headers configuration  
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        _key: 'X-Content-Type-Options',
                        _value: 'nosniff',
                    },
                    {
                        _key: 'X-Frame-Options',
                        _value: 'DENY',
                    },
                    {
                        _key: 'X-XSS-Protection',
                        _value: '1; mode=block',
                    },
                ],
            },
        ];
    },

    // Webpack configuration for clean builds
    webpack: (config: unknown, { buildId, dev, isServer, defaultLoaders, webpack }: unknown) => {
        // Suppress webpack warnings during deployment
        if (isFirebaseDeployment) {
            config.stats = 'errors-only';
            config.infrastructureLogging = {
                level: 'error'
            };
        }

        return config;
    },

    // Experimental features
    experimental: {
        // Disable verbose logging during deployment
        logging: {
            level: isFirebaseDeployment ? 'error' : 'verbose'
        }
    }
};

module.exports = nextConfig;
