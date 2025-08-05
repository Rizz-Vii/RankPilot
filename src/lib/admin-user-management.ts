import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  type UpdateData,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminUserUpdate {
  email: string;
  tier: "free" | "starter" | "professional" | "enterprise";
  status: "free" | "active" | "canceled" | "past_due";
  monthsToAdd?: number;
  paymentHistoryMonths?: number;
}

/**
 * Admin function to update any user's subscription
 */
export async function adminUpdateUserSubscription(
  update: AdminUserUpdate
): Promise<void> {
  try {
    console.log(`🔧 Admin updating subscription for ${update.email}...`);

    // Find user by email first
    const userId = await findUserByEmail(update.email);

    if (!userId) {
      throw new Error(`User not found with email: ${update.email}`);
    }

    // Calculate dates
    const currentDate = new Date();
    const nextBillingDate = new Date(currentDate);
    if (update.monthsToAdd) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + update.monthsToAdd);
    }

    // Create payment history if specified
    const paymentHistory = [];
    if (update.paymentHistoryMonths && update.tier !== "free") {
      for (let i = update.paymentHistoryMonths; i > 0; i--) {
        const paymentDate = new Date(currentDate);
        paymentDate.setMonth(paymentDate.getMonth() - i);

        paymentHistory.push({
          amount: getPlanPrice(update.tier),
          currency: "usd",
          date: paymentDate,
          status: "paid",
          description: `${capitalize(update.tier)} Plan - Monthly`,
          invoiceId: `inv_admin_${Date.now()}_${i}`,
          paymentMethod: "card_***4242",
        });
      }
    }

    // Prepare update data
    const updateData: UpdateData<DocumentData> = {
      subscriptionStatus: update.status,
      subscriptionTier: update.tier,
      updatedAt: serverTimestamp(),
    };

    // Add billing data for paid plans
    if (update.tier !== "free" && update.status === "active") {
      updateData.stripeCustomerId = `cus_admin_${userId.slice(0, 8)}`;
      updateData.stripeSubscriptionId = `sub_admin_${userId.slice(0, 8)}`;
      updateData.nextBillingDate = nextBillingDate;
      updateData.currentPeriodEnd = nextBillingDate;
      updateData.cancelAtPeriodEnd = false;
    }

    // Add payment history if created
    if (paymentHistory.length > 0) {
      updateData.paymentHistory = paymentHistory;
    }

    // Update subscription metadata
    updateData.subscriptionMetadata = {
      planType: update.tier,
      billingCycle: update.tier === "free" ? null : "monthly",
      subscriptionStartDate:
        paymentHistory.length > 0 ? paymentHistory[0].date : currentDate,
      customerSince:
        paymentHistory.length > 0 ? paymentHistory[0].date : currentDate,
      lifetimeValue: paymentHistory.reduce(
        (sum, payment) => sum + payment.amount,
        0
      ),
      lastAdminUpdate: currentDate,
      isTestCustomer: true,
    };

    // Update the user document
    await updateDoc(doc(db, "users", userId), updateData);

    console.log(
      `✅ Successfully updated ${update.email} to ${update.tier} (${update.status})`
    );

    return;
  } catch (_error) {
    console.error("❌ Error updating user subscription:", _error);
    throw _error;
  }
}

/**
 * Find user ID by email address
 */
async function findUserByEmail(email: string): Promise<string | null> {
  try {
    // Query users collection by email
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    return null;
  } catch (_error) {
    console.error("Error finding user by email:", _error);
    return null;
  }
}

/**
 * Get plan price by tier
 */
function getPlanPrice(tier: string): number {
  const prices: Record<string, number> = {
    free: 0,
    starter: 29,
    professional: 79,
    enterprise: 199,
  };
  return prices[tier] || 0;
}

/**
 * Capitalize string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Quick function to fix the specific user mentioned in the request
 */
export async function fixAbbaUser(): Promise<void> {
  await adminUpdateUserSubscription({
    email: "abba7254@gmail.com",
    tier: "starter",
    status: "active",
    monthsToAdd: 3, // 3 months paid in advance
    paymentHistoryMonths: 3, // 3 months of payment history
  });
}

/**
 * Batch function to fix all test users
 */
export async function fixAllTestUsers(): Promise<void> {
  console.log("🔄 Fixing all test users...");

  const testUsers = [
    {
      email: "abba7254@gmail.com",
      tier: "starter" as const,
      status: "active" as const,
      monthsToAdd: 3,
      paymentHistoryMonths: 3,
    },
    {
      email: "abbas_ali_rizvi@hotmail.com",
      tier: "free" as const,
      status: "free" as const,
      monthsToAdd: 0,
      paymentHistoryMonths: 0,
    },
  ];

  for (const user of testUsers) {
    try {
      await adminUpdateUserSubscription(user);
    } catch (_error) {
      console.error(`Failed to fix user ${user.email}:`, _error);
    }
  }

  console.log("✅ All test users fixed!");
}
