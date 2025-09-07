#!/usr/bin/env node

/**
 * Fix TypeScript EPIPE Error Script
 * Resolves common TypeScript language server EPIPE errors
 */

"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔧 RankPilot TypeScript EPIPE Error Fix");
console.log("=====================================");

async function main() {
  try {
    // 1. Kill existing TypeScript processes (ignore if none found)
    console.log("1. Killing existing TypeScript processes...");
    try {
      // Prefer pkill where available; fall back silently if not present.
      execSync("pkill -f typescript || true", { stdio: "ignore" });
      console.log(
        "   ✓ TypeScript processes checked and terminated if found (pkill used)"
      );
    } catch {
      console.log(
        "   ℹ No TypeScript processes to terminate or pkill unavailable"
      );
    }

    // 2. Clear TypeScript cache
    console.log("2. Clearing TypeScript cache...");
    const cacheFiles = [
      ".next",
      "node_modules/.cache",
      "tsconfig.tsbuildinfo",
      ".tsbuildinfo",
    ];

    cacheFiles.forEach((file) => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        execSync(`rm -rf "${filePath}"`, { stdio: "ignore" });
        console.log(`   ✓ Removed ${file}`);
      }
    });

    // 3. Clean TypeScript build
    console.log("3. Cleaning TypeScript build...");
    try {
      execSync("npx tsc --build --clean", { stdio: "ignore" });
      console.log("   ✓ TypeScript build cleaned");
    } catch {
      console.log("   ℹ No TypeScript build to clean");
    }

    // 4. Verify VS Code settings
    console.log("4. Verifying VS Code settings...");
    const vscodeSettingsPath = path.join(
      process.cwd(),
      ".vscode",
      "settings.json"
    );
    if (fs.existsSync(vscodeSettingsPath)) {
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, "utf8"));
      } catch {
        console.warn(
          `   ⚠️ Could not parse ${vscodeSettingsPath} — proceeding with defaults`
        );
        settings = {};
      }

      // Check for EPIPE prevention settings
      const requiredSettings = {
        "typescript.tsserver.maxTsServerMemory": 3072,
        "typescript.disableAutomaticTypeAcquisition": true,
        "typescript.workspaceSymbols.scope": "currentProject",
      };

      let needsUpdate = false;
      for (const [key, value] of Object.entries(requiredSettings)) {
        if (settings[key] !== value) {
          settings[key] = value;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        fs.writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 4));
        console.log("   ✓ Updated VS Code settings");
      } else {
        console.log("   ✓ VS Code settings already optimized");
      }
    }

    // 5. Test TypeScript compilation
    console.log("5. Testing TypeScript compilation...");
    try {
      execSync("npx tsc --noEmit --incremental false", { stdio: "ignore" });
      console.log("   ✓ TypeScript compilation successful");
    } catch (error) {
      console.log("   ❌ TypeScript compilation failed");
      console.error("   Error:", error.message);
      process.exit(1);
    }

    console.log("\n🎉 TypeScript EPIPE error fix completed successfully!");
    console.log("\n📋 Next steps:");
    console.log(
      "   - Restart VS Code to reload the TypeScript language server"
    );
    console.log('   - Run "npm run build" to verify everything works');
    console.log('   - Run "npm run dev-no-turbopack" to start development');
  } catch (error) {
    console.error("\n❌ Error during TypeScript EPIPE fix:", error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("\n❌ Unexpected error:", error.message);
  process.exit(1);
});
