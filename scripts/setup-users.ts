/**
 * Setup Script for Initial Users
 * Run this script to set up specific users with subscription tiers
 */

import { setupSpecificUsers } from "../src/lib/user-setup";

async function main() {
  console.log("🚀 Starting user setup...");

  try {
    await setupSpecificUsers();
    console.log("✅ User setup completed successfully!");

    console.log("\n📋 Summary:");
    console.log("- abbas_ali_rizvi@hotmail.com: Free tier (5 audits/month)");
    console.log(
      "- abba7254@gmail.com: Starter tier (50 audits/month, 3 months paid)"
    );
    console.log("\n🎯 Next steps:");
    console.log("- Users can now log in and access tier-appropriate features");
    console.log(
      "- Tool restrictions will be enforced based on subscription level"
    );
    console.log("- Usage limits will be tracked in Firestore");
  } catch (_error) {
    console.error("❌ User setup failed:", _error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { main as setupUsers };
