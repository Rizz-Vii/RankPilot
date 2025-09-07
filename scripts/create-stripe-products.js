#!/usr/bin/env node

// 🚀 RankPilot Stripe Product & Price Creation Script
// Creates Stripe products and price IDs for Agency and Enterprise tiers

const Stripe = require("stripe");
require("dotenv").config({ path: ".env.local" });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

// RankPilot Tier Configurations
const TIER_CONFIGS = {
  agency: {
    name: "RankPilot Agency",
    description:
      "Professional SEO suite for agencies and teams with advanced NeuroSEO™ features",
    price: 9900, // $99.00 AUD in cents
    currency: "aud",
    interval: "month",
    features: [
      "500 NeuroSEO™ queries per month",
      "25 competitor analysis slots",
      "5 team members",
      "Priority email support",
      "Advanced AI visibility tracking",
      "Custom SEO reports",
      "White-label options",
    ],
    metadata: {
      tier: "agency",
      neuroSeoQueries: "500",
      competitors: "25",
      users: "5",
      support: "priority",
    },
  },
  enterprise: {
    name: "RankPilot Enterprise",
    description:
      "Complete enterprise SEO solution with unlimited NeuroSEO™ access and dedicated support",
    price: 29900, // $299.00 AUD in cents
    currency: "aud",
    interval: "month",
    features: [
      "Unlimited NeuroSEO™ queries",
      "Unlimited competitor tracking",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom AI model training",
      "API access & integrations",
      "SLA guarantee",
      "Custom deployment options",
    ],
    metadata: {
      tier: "enterprise",
      neuroSeoQueries: "unlimited",
      competitors: "unlimited",
      users: "unlimited",
      support: "dedicated",
    },
  },
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create Product and Price for a tier
async function createTierProduct(tierKey, config) {
  try {
    log(`\n🚀 Creating ${config.name}...`, "bright");

    // Create the product
    log("📦 Creating Stripe product...", "blue");
    const product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: {
        ...config.metadata,
        created_by: "RankPilot Setup Script",
        created_at: new Date().toISOString(),
        features: config.features.join(" | "), // Store features in metadata
      },
    });

    log(`✅ Product created: ${product.id}`, "green");

    // Create the price
    log("💰 Creating Stripe price...", "blue");
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: config.price,
      currency: config.currency,
      recurring: {
        interval: config.interval,
      },
      metadata: {
        ...config.metadata,
        product_name: config.name,
      },
    });

    log(`✅ Price created: ${price.id}`, "green");

    return {
      tier: tierKey,
      product: product,
      price: price,
      priceId: price.id,
    };
  } catch (error) {
    log(`❌ Error creating ${config.name}: ${error.message}`, "red");
    throw error;
  }
}

// Generate TypeScript configuration update
function generateTierUpdates(results) {
  log("\n📝 TypeScript Configuration Updates:", "cyan");
  log("==================================================", "cyan");

  log("\n// Update src/lib/stripe/subscription-management.ts:", "yellow");
  results.forEach((result) => {
    log(`    ${result.tier}: {`, "bright");
    log(`        name: '${TIER_CONFIGS[result.tier].name}',`);
    log(`        price: ${TIER_CONFIGS[result.tier].price / 100},`);
    log(
      `        priceId: '${result.priceId}', // ← NEW REAL PRICE ID`,
      "green"
    );
    log("        features: {");
    Object.entries(TIER_CONFIGS[result.tier].metadata).forEach(
      ([key, value]) => {
        if (key !== "tier") {
          const displayValue = isNaN(value) ? `'${value}'` : value;
          log(`            ${key}: ${displayValue},`);
        }
      }
    );
    log("        }");
    log("    },\n");
  });
}

// Generate environment variable updates
function generateEnvUpdates(results) {
  log("\n🔧 Environment Variable Updates:", "cyan");
  log("==================================================", "cyan");

  log("\n# Add to .env.local:", "yellow");
  results.forEach((result) => {
    log(`STRIPE_PRICE_${result.tier.toUpperCase()}=${result.priceId}`, "green");
  });
}

// Generate CLI test commands
function generateTestCommands(results) {
  log("\n🧪 Stripe CLI Test Commands:", "cyan");
  log("==================================================", "cyan");

  results.forEach((result) => {
    log(`\n# Test ${TIER_CONFIGS[result.tier].name} checkout:`, "yellow");
    log(`stripe checkout sessions create \\`, "green");
    log(`  --success-url="http://localhost:3000/success" \\`, "green");
    log(`  --cancel-url="http://localhost:3000/cancel" \\`, "green");
    log(`  --mode=subscription \\`, "green");
    log(`  --line-items="price=${result.priceId},quantity=1"`, "green");
  });
}

// Main execution function
async function main() {
  try {
    log(`\n🎯 RankPilot Stripe Product Creation Script`, "bright");
    log("==================================================", "bright");

    // Verify Stripe connection
    log("\n🔍 Verifying Stripe connection...", "blue");
    const account = await stripe.accounts.retrieve();
    log(`✅ Connected to Stripe account: ${account.id}`, "green");

    // Check if we're in test mode
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
    log(
      `🔧 Mode: ${isTestMode ? "TEST" : "LIVE"}`,
      isTestMode ? "yellow" : "red"
    );

    if (!isTestMode) {
      log(
        "⚠️  WARNING: You are in LIVE mode! This will create real products.",
        "red"
      );
      log("Press Ctrl+C to cancel or wait 5 seconds to continue...", "yellow");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Create products and prices for both tiers
    const results = [];

    for (const [tierKey, config] of Object.entries(TIER_CONFIGS)) {
      const result = await createTierProduct(tierKey, config);
      results.push(result);
    }

    // Generate configuration updates
    log("\n🎉 SUCCESS! All products and prices created.", "green");
    log("==================================================", "green");

    generateTierUpdates(results);
    generateEnvUpdates(results);
    generateTestCommands(results);

    // Summary table
    log("\n📊 Creation Summary:", "cyan");
    log("==================================================", "cyan");
    results.forEach((result) => {
      log(`${result.tier.toUpperCase()} TIER:`, "bright");
      log(`  Product ID: ${result.product.id}`);
      log(`  Price ID:   ${result.priceId}`, "green");
      log(
        `  Amount:     $${TIER_CONFIGS[result.tier].price / 100} ${TIER_CONFIGS[result.tier].currency.toUpperCase()}/month`
      );
      log("");
    });

    log("🚀 Ready to update your RankPilot configuration!", "bright");
  } catch (error) {
    log(`\n❌ Script failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

// Handle script arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  log("🚀 RankPilot Stripe Product Creation Script", "bright");
  log("\nUsage: node scripts/create-stripe-products.js [options]", "blue");
  log("\nOptions:", "yellow");
  log("  --help, -h     Show this help message");
  log("  --dry-run      Show what would be created without actually creating");
  log("\nThis script creates Stripe products and prices for:");
  log("  • Agency Tier: $99 AUD/month");
  log("  • Enterprise Tier: $299 AUD/month");
  process.exit(0);
}

if (args.includes("--dry-run")) {
  log("🔍 DRY RUN MODE - Showing what would be created:", "yellow");
  Object.entries(TIER_CONFIGS).forEach(([tier, config]) => {
    log(`\n${config.name}:`, "bright");
    log(`  Price: $${config.price / 100} ${config.currency.toUpperCase()}`);
    log(`  Features: ${config.features.length} features`);
    log(`  Description: ${config.description}`);
  });
  process.exit(0);
}

// Run the main function
main().catch(console.error);
