import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Define expected quotas for each tier (ensures consistency with cleanup API)
const TIER_QUOTAS = {
  free: { monthlyAnalyses: 3, keywordTracking: 10, competitorTracking: 3 },
  starter: { monthlyAnalyses: 20, keywordTracking: 50, competitorTracking: 10 },
  professional: {
    monthlyAnalyses: 100,
    keywordTracking: 200,
    competitorTracking: 25,
  },
  enterprise: {
    monthlyAnalyses: 500,
    keywordTracking: 1000,
    competitorTracking: 100,
  },
  admin: { monthlyAnalyses: -1, keywordTracking: -1, competitorTracking: -1 }, // unlimited
};

interface UserSubscriptionSetup {
  email: string;
  tier: "starter" | "professional" | "enterprise";
  monthsPrepaid: number;
  testMode?: boolean;
}

export async function ensureUserSubscription(
  userId: string,
  userEmail: string
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      await setDoc(
        doc(db, "users", userId),
        {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`✅ User ${userEmail} already has subscription data`);
      return;
    }

    const testUserSetups: Record<string, UserSubscriptionSetup> = {
      "abba7254@gmail.com": {
        email: "abba7254@gmail.com",
        tier: "starter",
        monthsPrepaid: 3,
        testMode: true,
      },
      "abbas_ali_rizvi@hotmail.com": {
        email: "abbas_ali_rizvi@hotmail.com",
        tier: "starter",
        monthsPrepaid: 0,
        testMode: true,
      },
    };

    const userSetup = testUserSetups[userEmail.toLowerCase()];

    if (userSetup) {
      await createUserSubscription(userId, userSetup);
      console.log(`✅ Created subscription for test user: ${userEmail}`);
    } else {
      await createDefaultUser(userId, userEmail);
      console.log(`✅ Created free user: ${userEmail}`);
    }
  } catch (_error) {
    console.error("Error ensuring user subscription:", _error);
    throw error;
  }
}

async function createUserSubscription(
  userId: string,
  setup: UserSubscriptionSetup
): Promise<void> {
  const currentDate = new Date();
  const isFreeTier = setup.monthsPrepaid === 0;
  const paymentHistory = [];
  const nextBillingDate = new Date(currentDate);

  if (!isFreeTier) {
    for (let i = setup.monthsPrepaid; i > 0; i--) {
      const paymentDate = new Date(currentDate);
      paymentDate.setMonth(paymentDate.getMonth() - _i);
      paymentHistory.push({
        amount: getPlanPrice(setup.tier),
        currency: "usd",
        date: paymentDate,
        status: "paid",
        description: `${capitalize(setup.tier)} Plan - Monthly`,
        invoiceId: `inv_${Date.now()}_${i}`,
        paymentMethod: "card_***4242",
      });
    }
    nextBillingDate.setMonth(nextBillingDate.getMonth() + setup.monthsPrepaid);
  }

  const userData = {
    email: setup.email,
    subscriptionStatus: isFreeTier ? "free" : "active",
    subscriptionTier: isFreeTier ? "free" : setup.tier,
    role: "user",
    quotas: TIER_QUOTAS[isFreeTier ? "free" : setup.tier], // ✅ Ensure quotas are set
    displayName: extractDisplayName(setup.email),
    ...(setup.testMode &&
      !isFreeTier && {
        stripeCustomerId: `cus_test_${userId.slice(0, 8)}`,
        stripeSubscriptionId: `sub_test_${userId.slice(0, 8)}`,
      }),
    ...(setup.monthsPrepaid > 0 && {
      nextBillingDate: nextBillingDate,
      currentPeriodEnd: nextBillingDate,
      cancelAtPeriodEnd: false,
    }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    usage: {
      auditsThisMonth: 0,
      lastResetDate: new Date(),
    },
    ...(paymentHistory.length > 0 && { paymentHistory }),
    subscriptionMetadata: {
      planType: setup.tier,
      billingCycle: "monthly",
      subscriptionStartDate:
        paymentHistory.length > 0 ? paymentHistory[0].date : currentDate,
      trialEnd: null,
      customerSince:
        paymentHistory.length > 0 ? paymentHistory[0].date : currentDate,
      lifetimeValue: paymentHistory.reduce(
        (sum, payment) => sum + payment.amount,
        0
      ),
      isTestCustomer: setup.testMode || false,
    },
  };

  await setDoc(doc(db, "users", userId), userData);
}

async function createDefaultUser(userId: string, email: string): Promise<void> {
  const userData = {
    email: email,
    subscriptionStatus: "free",
    subscriptionTier: "free",
    role: "user",
    quotas: TIER_QUOTAS.free, // ✅ Ensure quotas are set for free users
    displayName: extractDisplayName(email),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    usage: {
      auditsThisMonth: 0,
      lastResetDate: new Date(),
    },
    subscriptionMetadata: {
      planType: "free",
      billingCycle: null,
      subscriptionStartDate: new Date(),
      trialEnd: null,
      customerSince: new Date(),
      lifetimeValue: 0,
      isTestCustomer: false,
    },
  };

  await setDoc(doc(db, "users", userId), userData);
}

function getPlanPrice(tier: string): number {
  const prices: Record<string, number> = {
    starter: 29,
    professional: 79,
    enterprise: 199,
  };
  return prices[tier] || 0;
}

function extractDisplayName(email: string): string {
  const localPart = email.split("@")[0];
  return localPart
    .replace(/[._-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function updateUserToStarter(
  userId: string,
  email: string,
  monthsPrepaid: number = 3
): Promise<void> {
  const setup: UserSubscriptionSetup = {
    email,
    tier: "starter",
    monthsPrepaid,
    testMode: true,
  };

  await createUserSubscription(userId, setup);
  console.log(
    `✅ Updated user ${email} to starter with ${monthsPrepaid} months prepaid`
  );
}
