import { fixAbbaUser, fixAllTestUsers } from "../src/lib/admin-user-management";

async function main() {
  console.log("🚀 Starting user subscription fix...");

  try {
    // Fix the specific user mentioned in the issue
    console.log("1️⃣ Fixing abba7254@gmail.com...");
    await fixAbbaUser();

    // Also fix all test users to ensure consistency
    console.log("2️⃣ Fixing all test users for consistency...");
    await fixAllTestUsers();

    console.log("\n✅ User subscription fix completed successfully!");
    console.log("\n📋 Summary:");
    console.log("- abba7254@gmail.com: Starter tier (50 audits/month)");
    console.log("- Status: Active with 3 months paid in advance");
    console.log("- Payment history: 3 successful payments of $29 each");
    console.log("- Next billing date: 3 months from today");
    console.log("- abbas_ali_rizvi@hotmail.com: Free tier (5 audits/month)");

    console.log("\n🎯 Next steps:");
    console.log(
      "- User can now log in and will be properly recognized as Starter subscriber"
    );
    console.log("- Subscription data will sync automatically on login");
    console.log("- All subscription features should work correctly");
  } catch (_error) {
    console.error("❌ User subscription fix failed:", _error);
    process.exit(1);
  }
}

// Run the fix
main();
