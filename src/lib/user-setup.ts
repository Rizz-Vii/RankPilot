import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function setupSpecificUsers() {
  try {
    // Set up free user: abbas_ali_rizvi@hotmail.com
    const freeUserId = "free-user-abbas"; // This would normally be the Firebase Auth UID
    await setDoc(doc(db, "users", freeUserId), {
      email: "abbas_ali_rizvi@hotmail.com",
      subscriptionStatus: "free",
      subscriptionTier: "free",
      role: "user",
      displayName: "Abbas Ali",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usage: {
        auditsThisMonth: 0,
        lastResetDate: new Date(),
      },
    });

    // Set up starter user: abba7254@gmail.com (paid for next 3 months)
    const starterUserId = "starter-user-abba"; // This would normally be the Firebase Auth UID
    const currentDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3); // 3 months from now

    await setDoc(doc(db, "users", starterUserId), {
      email: "abba7254@gmail.com",
      subscriptionStatus: "active",
      subscriptionTier: "starter",
      role: "user",
      displayName: "Abba Ali",
      stripeCustomerId: "cus_test_starter_user",
      stripeSubscriptionId: "sub_test_starter_user",
      nextBillingDate: endDate,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usage: {
        auditsThisMonth: 12, // Example usage
        lastResetDate: new Date(),
      },
      paymentHistory: [
        {
          amount: 29,
          currency: "usd",
          date: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
          status: "paid",
          description: "Starter Plan - Monthly",
        },
        {
          amount: 29,
          currency: "usd",
          date: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
          status: "paid",
          description: "Starter Plan - Monthly",
        },
        {
          amount: 29,
          currency: "usd",
          date: new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
          status: "paid",
          description: "Starter Plan - Monthly",
        },
      ],
    });

    console.log("Successfully set up specific users with subscription tiers");
  } catch (_error) {
    console.error("Error setting up users:", _error);
  }
}

export const USER_EMAILS = {
  FREE_USER: "abbas_ali_rizvi@hotmail.com",
  STARTER_USER: "abba7254@gmail.com",
} as const;
