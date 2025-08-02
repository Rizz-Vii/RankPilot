// SIMPLE ADMIN FIX SCRIPT - Copy ALL of this into browser console

// Step 1: Define the admin utils (copy all this)
const adminUtils = {
    async diagnose() {
        console.log("🔍 Checking admin users...");
        try {
            const firestore = window.firebase?.firestore?.();
            if (!firestore) {
                console.error("❌ Please run this on your RankPilot app page");
                return;
            }

            const users = firestore.collection("users");
            const admins = await users.where("role", "==", "admin").get();

            console.log(`Found ${admins.size} admin users:`);

            admins.forEach((doc) => {
                const user = doc.data();
                console.log(`👤 ${user.email}`);
                console.log(`   Role: ${user.role || "not set"}`);
                console.log(`   Tier: ${user.subscriptionTier || "not set"}`);
                console.log(`   Status: ${user.subscriptionStatus || "not set"}`);
                console.log("");
            });

            const badTiers = await users.where("subscriptionTier", "==", "admin").get();
            if (badTiers.size > 0) {
                console.log(`⚠️ ${badTiers.size} users have bad tier="admin":`);
                badTiers.forEach((doc) => {
                    const user = doc.data();
                    console.log(`👤 ${user.email} - needs fixing`);
                });
            }

        } catch (_error) {
            console.error("Error:", _error);
        }
    },

    async fix(email) {
        console.log(`🔧 Fixing admin user: ${email}`);
        try {
            const firestore = window.firebase?.firestore?.();
            const users = firestore.collection("users");
            const userQuery = await users.where("email", "==", email).get();

            if (userQuery.empty) {
                console.log("❌ User not found");
                return;
            }

            const userDoc = userQuery.docs[0];
            const current = userDoc.data();

            console.log("Before:", {
                role: current.role,
                tier: current.subscriptionTier,
                status: current.subscriptionStatus
            });

            await userDoc.ref.update({
                role: "admin",
                subscriptionTier: "enterprise",
                subscriptionStatus: "active",
                updatedAt: new Date()
            });

            console.log("After: role=admin, tier=enterprise, status=active");
            console.log("✅ Fixed! Refresh your page now.");

        } catch (_error) {
            console.error("Error fixing user:", _error);
        }
    }
};

// Step 2: Make it available globally
window.adminUtils = adminUtils;

console.log(`
🚀 Admin Fix Script Loaded!

Now run these commands:
1. await adminUtils.diagnose()
2. await adminUtils.fix("admin@rankpilot.com")
`);
