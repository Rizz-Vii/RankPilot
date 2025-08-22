#!/usr/bin/env node

/**
 * Firebase Secret Manager Setup Script
 *
 * This script helps you set up the required secrets in Firebase Secret Manager
 * that are needed for the deployment to work properly.
 *
 * Run with: npx ts-node scripts/setup-firebase-secrets.ts
 */

import { execSync } from "child_process";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

interface Secret {
  name: string;
  description: string;
  example?: string;
}

const requiredSecrets: Secret[] = [
  {
    name: "STRIPE_SECRET_KEY",
    description: "Stripe Secret Key (starts with sk_test_ or sk_live_)",
    example: "sk_test_...",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    description: "Stripe Webhook Endpoint Secret (starts with whsec_)",
    example: "whsec_...",
  },
  {
    name: "GEMINI_API_KEY",
    description: "Google Gemini API Key",
    example: "AIza...",
  },
  {
    name: "GOOGLE_API_KEY",
    description: "Google Cloud API Key",
    example: "AIza...",
  },
  {
    name: "OPENAI_API_KEY",
    description: "OpenAI API Key (starts with sk-)",
    example: "sk-proj-...",
  },
  {
    name: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
    description: "reCAPTCHA Site Key (public)",
    example: "6Le...",
  },
  {
    name: "RECAPTCHA_SECRET_KEY",
    description: "reCAPTCHA Secret Key (private)",
    example: "6Le...",
  },
];

const PROJECT_ID = "rankpilot-h3jpc";

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkFirebaseAuth(): Promise<boolean> {
  try {
    execSync("firebase projects:list", { stdio: "pipe" });
    return true;
  } catch {
    console.error("❌ Firebase CLI not authenticated.");
    console.error("Please run: firebase login");
    return false;
  }
}

async function secretExists(secretName: string): Promise<boolean> {
  try {
    execSync(`gcloud secrets describe ${secretName} --project=${PROJECT_ID}`, {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

async function createSecret(
  secretName: string,
  secretValue: string
): Promise<void> {
  try {
    // Create the secret
    console.log(`📝 Creating secret ${secretName}...`);
    execSync(
      `echo "${secretValue}" | gcloud secrets create ${secretName} --data-file=- --project=${PROJECT_ID}`,
      { stdio: "pipe" }
    );
    console.log(`✅ Secret ${secretName} created successfully`);
  } catch (e: unknown) {
    console.error(`❌ Failed to create secret ${secretName}:`, e);
  }
}

async function updateSecret(
  secretName: string,
  secretValue: string
): Promise<void> {
  try {
    console.log(`📝 Updating secret ${secretName}...`);
    execSync(
      `echo "${secretValue}" | gcloud secrets versions add ${secretName} --data-file=- --project=${PROJECT_ID}`,
      { stdio: "pipe" }
    );
    console.log(`✅ Secret ${secretName} updated successfully`);
  } catch (e: unknown) {
    console.error(`❌ Failed to update secret ${secretName}:`, e);
  }
}

async function setupSecret(secret: Secret): Promise<void> {
  console.log(`\n🔑 Setting up ${secret.name}`);
  console.log(`📋 ${secret.description}`);
  if (secret.example) {
    console.log(`💡 Example format: ${secret.example}`);
  }

  const exists = await secretExists(secret.name);
  if (exists) {
    console.log(`📋 Secret ${secret.name} already exists`);
    const update = await askQuestion("Do you want to update it? (y/N): ");
    if (update.toLowerCase() !== "y") {
      console.log(`⏭️ Skipping ${secret.name}`);
      return;
    }
  }

  const value = await askQuestion(`Enter ${secret.name}: `);
  if (!value.trim()) {
    console.log(`⏭️ Skipping ${secret.name} (empty value)`);
    return;
  }

  if (exists) {
    await updateSecret(secret.name, value.trim());
  } else {
    await createSecret(secret.name, value.trim());
  }
}

async function enableSecretManagerAPI(): Promise<void> {
  try {
    console.log("🔧 Enabling Secret Manager API...");
    execSync(
      `gcloud services enable secretmanager.googleapis.com --project=${PROJECT_ID}`,
      { stdio: "pipe" }
    );
    console.log("✅ Secret Manager API enabled");
  } catch (e: unknown) {
    console.error(`❌ Failed to enable Secret Manager API:`, e);
  }
}

async function checkGCloudAuth(): Promise<boolean> {
  try {
    execSync(
      'gcloud auth list --filter=status:ACTIVE --format="value(account)"',
      { stdio: "pipe" }
    );
    return true;
  } catch (e: unknown) {
    console.error("❌ Google Cloud CLI not authenticated.", e);
    console.error("Please run: gcloud auth login");
    return false;
  }
}

async function setGCloudProject(): Promise<void> {
  try {
    console.log(`🔧 Setting Google Cloud project to ${PROJECT_ID}...`);
    execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: "pipe" });
    console.log("✅ Project set successfully");
  } catch (e: unknown) {
    console.error(`❌ Failed to set project:`, e);
  }
}

async function listExistingSecrets(): Promise<void> {
  try {
    console.log("\n📋 Existing secrets in Firebase Secret Manager:");
    const output = execSync(`gcloud secrets list --project=${PROJECT_ID}`, {
      encoding: "utf8",
    });
    console.log(output);
  } catch (e: unknown) {
    console.error("❌ Could not list existing secrets", e);
  }
}

async function main(): Promise<void> {
  console.log("🚀 Firebase Secret Manager Setup");
  console.log("==================================\n");

  // Check prerequisites
  console.log("🔍 Checking prerequisites...");

  const firebaseAuth = await checkFirebaseAuth();
  if (!firebaseAuth) {
    process.exit(1);
  }

  const gcloudAuth = await checkGCloudAuth();
  if (!gcloudAuth) {
    process.exit(1);
  }

  await setGCloudProject();
  await enableSecretManagerAPI();
  await listExistingSecrets();

  console.log("\n🔑 Setting up required secrets...");
  console.log(
    "Note: These secrets are required for Firebase deployment to work."
  );

  // Process each secret
  for (const secret of requiredSecrets) {
    await setupSecret(secret);
  }

  console.log("\n✅ Secret setup complete!");
  console.log("\n📋 Next steps:");
  console.log(
    "1. Make sure the same secrets are added to GitHub repository secrets"
  );
  console.log("2. Run deployment: firebase deploy");
  console.log("3. Or push to master branch to trigger auto-deployment");

  rl.close();
}

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  rl.close();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
  rl.close();
  process.exit(1);
});

main().catch(() => {
  console.error("❌ Script failed:");
  rl.close();
  process.exit(1);
});
