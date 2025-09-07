// Emergency build script that skips type checking and ESLint
// Use only when standard build fails due to ESLint or TypeScript issues

const { execSync } = require("child_process");

function buildWithoutChecks() {
  console.log("🚨 Emergency build mode - skipping type checking and ESLint");
  console.log("⚠️  This should only be used for deployment emergencies");

  try {
    // Set environment variables to skip checks
    process.env.ESLINT_NO_DEV_ERRORS = "true";
    process.env.DISABLE_ESLINT = "true";
    process.env.TYPESCRIPT_NO_TYPE_CHECK = "true";

    console.log("🔧 Building with Next.js...");

    // Execute Next.js build with all checks disabled
    execSync(
      'cross-env NODE_OPTIONS="--max-old-space-size=8192" ESLINT_NO_DEV_ERRORS=true DISABLE_ESLINT=true next build',
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );

    console.log("✅ Emergency build completed successfully");
    console.log(
      "⚠️  Remember to fix ESLint and TypeScript issues before next deployment"
    );
  } catch (error) {
    console.error("❌ Emergency build failed:", error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  buildWithoutChecks();
}
