// Historical patch: attempted to symlink @firebase internals to avoid ENOENT errors.
// Modern Firebase (v11+) exposes proper exports and does not require any patching.
// This script is now a NO-OP for firebase@>=11 to prevent breaking installs by clobbering @firebase.
const fs = require("fs");
const path = require("path");

function ensureSymlink(src, dest) {
  try {
    if (fs.existsSync(dest)) {
      const stat = fs.lstatSync(dest);
      if (stat.isSymbolicLink()) return; // already linked
      if (stat.isDirectory()) {
        // Check if directory already has the expected auth package; if not, replace with symlink
        const hasAuth = fs.existsSync(path.join(dest, "auth", "package.json"));
        if (hasAuth) return;
        fs.rmSync(dest, { recursive: true, force: true });
      } else {
        fs.unlinkSync(dest);
      }
    }
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // Create symlink/junction to the source directory
    fs.symlinkSync(src, dest, "dir");
    if (process.env.DEBUG || process.env.CI) {
      console.log(`[firebase-patch] Linked ${dest} -> ${src}`);
    }
  } catch (e) {
    console.warn(
      `[firebase-patch] Failed to link ${dest} -> ${src}: ${e && e.message}`
    );
  }
}

function run() {
  const root = process.cwd();
  const firebasePkg = path.join(
    root,
    "node_modules",
    "firebase",
    "package.json"
  );
  const _rootPkgJson = path.join(root, "package.json");
  const atFirebaseRoot = path.join(root, "node_modules", "@firebase");
  const nestedAtFirebase = path.join(
    root,
    "node_modules",
    "firebase",
    "node_modules",
    "@firebase"
  );
  if (!fs.existsSync(firebasePkg)) {
    if (process.env.DEBUG || process.env.CI) {
      console.log("[firebase-patch] Skipping: packages not installed.");
    }
    return;
  }

  // If using modern firebase, skip entirely
  try {
    const pkg = JSON.parse(fs.readFileSync(firebasePkg, "utf8"));
    const version = (pkg && pkg.version) || "";
    const major = parseInt(String(version).split(".")[0] || "0", 10);
    if (!isNaN(major) && major >= 11) {
      if (process.env.DEBUG || process.env.CI) {
        console.log(
          `[firebase-patch] Detected firebase@${version} (>=11). No patch needed.`
        );
      }
      return;
    }
  } catch {}

  // Legacy behavior below (firebase <11). Guard aggressively to avoid clobbering.
  // 1) Ensure ROOT @firebase -> nested firebase/node_modules/@firebase only if nested exists with content
  if (!fs.existsSync(atFirebaseRoot) && fs.existsSync(nestedAtFirebase)) {
    ensureSymlink(nestedAtFirebase, atFirebaseRoot);
  }

  // 2) Also ensure nested firebase/node_modules/@firebase -> root @firebase
  // Some tools expect sub-deps to resolve via firebase's own node_modules path.
  const firebaseNodeModules = path.join(
    root,
    "node_modules",
    "firebase",
    "node_modules"
  );
  const destAtFirebase = path.join(firebaseNodeModules, "@firebase");
  if (fs.existsSync(atFirebaseRoot)) {
    ensureSymlink(atFirebaseRoot, destAtFirebase);
  }

  // Also normalize hashed @firebase subpackages like ".firestore-<hash>" to "@firebase/firestore"
  // Some package managers produce hashed folders which break TS path/exports resolution.
  try {
    const entries = fs.readdirSync(atFirebaseRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name; // e.g. ".firestore-abc123" or "app-types" or "database"
      // Only handle hidden hashed folders like ".firestore-<hash>" and similar
      if (!name.startsWith(".")) continue;
      // Try to read its package.json to discover canonical package name
      const pkgJsonPath = path.join(atFirebaseRoot, name, "package.json");
      if (!fs.existsSync(pkgJsonPath)) continue;
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      } catch {
        continue;
      }
      const pkgName = typeof pkg?.name === "string" ? pkg.name : "";
      if (!pkgName.startsWith("@firebase/")) continue;
      const subdir = pkgName.split("/")[1]; // e.g. "firestore"
      if (!subdir) continue;
      const canonicalDir = path.join(atFirebaseRoot, subdir);
      ensureSymlink(path.join(atFirebaseRoot, name), canonicalDir);
    }
  } catch (e) {
    console.warn(
      `[firebase-patch] Failed to normalize @firebase subpackages: ${e && e.message}`
    );
  }
}

run();
