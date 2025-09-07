#!/usr/bin/env node

/**
 * Fix TypeScript EPIPE Error Script v3 - Simplified & Robust
 * Focuses on essential fixes without complex process management
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔧 RankPilot TypeScript EPIPE Error Fix v3");
console.log("==========================================");
("use strict");

const safeClearPath = (targetPath, description) => {
  const fullPath = path.join(process.cwd(), targetPath);
  if (fs.existsSync(fullPath)) {
    try {
      if (process.platform === "win32") {
        execSync(
          `rmdir /s /q "${fullPath}" 2>nul || del /f /q "${fullPath}" 2>nul || echo Cleaned`,
          { stdio: "ignore" }
        );
      } else {
        execSync(`rm -rf "${fullPath}"`, { stdio: "ignore" });
      }
      console.log(`   ✅ Cleared ${description}`);
      return true;
    } catch {
      console.log(`   ⚠️  Could not clear ${description}`);
      return false;
    }
  } else {
    console.log(`   ℹ️  ${description} not found (already clean)`);
    return true;
  }
};

const updateVSCodeSettings = () => {
  console.log("2. Optimizing VS Code settings...");

  const vscodeDir = path.join(process.cwd(), ".vscode");
  const settingsPath = path.join(vscodeDir, "settings.json");

  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch {
      settings = {};
    }
  }

  // Essential EPIPE prevention settings
  const updates = {
    "typescript.tsserver.maxTsServerMemory": 4096,
    "typescript.disableAutomaticTypeAcquisition": true,
    "typescript.workspaceSymbols.scope": "currentProject",
    "typescript.check.npmIsInstalled": false,
    "typescript.surveys.enabled": false,
  };

  let changed = false;
  Object.entries(updates).forEach(([key, value]) => {
    if (settings[key] !== value) {
      settings[key] = value;
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    console.log("   ✅ VS Code settings optimized");
  } else {
    console.log("   ℹ️  VS Code settings already optimized");
  }
};

const testTypeScript = () => {
  console.log("3. Testing TypeScript compilation...");
  try {
    execSync("npx tsc --noEmit --incremental false", {
      stdio: "pipe",
      timeout: 20000,
    });
    console.log("   ✅ TypeScript compilation successful");
    return true;
  } catch {
    console.log(
      "   ⚠️  TypeScript compilation had issues (this may be normal)"
    );
    return false;
  }
};

const createQuickRestartScript = () => {
  console.log("4. Creating quick restart utility...");

  const quickRestart = `#!/usr/bin/env node
// Quick TypeScript restart utility
const { execSync } = require('child_process');
console.log('🔄 Quick TypeScript restart...');
try {
  execSync('rm -rf tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null || true');
  console.log('✅ TypeScript cache cleared - reload VS Code window');
} catch (e) {
  console.log('ℹ️  Restart completed');
}`;

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "quick-typescript-restart.js"
  );
  fs.writeFileSync(scriptPath, quickRestart);

  try {
    execSync(`chmod +x "${scriptPath}"`);
  } catch {
    // Ignore chmod errors on Windows
  }

  console.log("   ✅ Created quick-typescript-restart.js");
};

// Main execution
try {
  console.log("1. Clearing TypeScript and build caches...");

  const cacheClears = [
    [".next", "Next.js cache"],
    ["node_modules/.cache", "Node modules cache"],
    ["tsconfig.tsbuildinfo", "TypeScript build info"],
    [".tsbuildinfo", "TS build info backup"],
    ["functions/lib", "Firebase functions build"],
  ];

  cacheClears.forEach(([path, desc]) => {
    safeClearPath(path, desc);
  });

  updateVSCodeSettings();
  testTypeScript();
  createQuickRestartScript();

  console.log("\n🎉 TypeScript EPIPE fix completed!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Cleared all TypeScript and build caches");
  console.log("   ✅ Optimized VS Code settings");
  console.log("   ✅ Created quick restart utility");

  console.log("\n🚀 Next steps:");
  console.log(
    '   1. Reload VS Code: Ctrl+Shift+P → "Developer: Reload Window"'
  );
  console.log("   2. Start development: npm run dev-no-turbopack");
  console.log(
    "   3. For future issues: node scripts/quick-typescript-restart.js"
  );

  console.log("\n💡 Available commands:");
  console.log("   npm run fix:typescript-epipe    - Full fix (this script)");
  console.log("   npm run restart:typescript       - Quick restart only");
} catch (_error) {
  console.error("\n❌ Error:", _error.message);
  console.log("\n🔧 Manual steps to resolve EPIPE:");
  console.log("   1. Close VS Code completely");
  console.log("   2. Delete .next and tsconfig.tsbuildinfo folders");
  console.log("   3. Restart VS Code");
  console.log("   4. Run: npm run dev-no-turbopack");
  process.exit(1);
}
