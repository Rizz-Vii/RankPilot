#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Checks if all required environment variables are properly configured
 */

const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#")) {
        const [_key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const _value = valueParts.join("=").trim();
          process.env[key.trim()] = value;
        }
      }
    });

    console.log("📁 Loaded .env.local file");
  } else {
    console.log("⚠️  No .env.local file found");
  }
}

const requiredEnvVars = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "RECAPTCHA_SECRET_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const optionalEnvVars = ["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"];

function validateEnvironment() {
  console.log("🔍 Validating environment variables...\n");

  let allValid = true;
  const missing = [];
  const present = [];

  // Check required variables
  requiredEnvVars.forEach((varName) => {
    if (process.env[varName]) {
      present.push(varName);
      console.log(`✅ ${varName}: Present`);
    } else {
      missing.push(varName);
      console.log(`❌ ${varName}: Missing`);
      allValid = false;
    }
  });

  // Check optional variables
  console.log("\n📋 Optional variables:");
  optionalEnvVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Present`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
    }
  });

  console.log("\n📊 Summary:");
  console.log(
    `Present: ${present.length}/${requiredEnvVars.length} required variables`
  );

  if (missing.length > 0) {
    console.log(`Missing: ${missing.join(", ")}`);
    console.log("\n💡 To fix missing variables:");
    console.log("1. Copy .env.example to .env.local");
    console.log("2. Fill in the missing values");
    console.log("3. Restart your development server");
  }

  if (allValid) {
    console.log("\n🎉 All required environment variables are configured!");
  } else {
    console.log("\n🚨 Some required environment variables are missing.");
    process.exit(1);
  }
}

// Load environment and run validation
loadEnvFile();
validateEnvironment();
