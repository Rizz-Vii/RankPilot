// Creates a local symlink so that Next.js resolution from `firebase/*` can find `@firebase/*`
// under node_modules/firebase/node_modules, avoiding ENOENT errors for @firebase/auth.
// Safe on Linux/macOS; on Windows, Node will create a junction for directories.
const fs = require('fs');
const path = require('path');

function ensureSymlink(src, dest) {
    try {
        if (fs.existsSync(dest)) {
            const stat = fs.lstatSync(dest);
            if (stat.isSymbolicLink()) return; // already linked
            if (stat.isDirectory()) {
                // Check if directory already has the expected auth package; if not, replace with symlink
                const hasAuth = fs.existsSync(path.join(dest, 'auth', 'package.json'));
                if (hasAuth) return;
                fs.rmSync(dest, { recursive: true, force: true });
            } else {
                fs.unlinkSync(dest);
            }
        }
        // Ensure parent directory exists
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        // Create symlink/junction to the source directory
        fs.symlinkSync(src, dest, 'dir');
        if (process.env.DEBUG || process.env.CI) {
            console.log(`[firebase-patch] Linked ${dest} -> ${src}`);
        }
    } catch (e) {
        console.warn(`[firebase-patch] Failed to link ${dest} -> ${src}: ${e && e.message}`);
    }
}

function run() {
    const root = process.cwd();
    const firebasePkg = path.join(root, 'node_modules', 'firebase', 'package.json');
    const atFirebaseRoot = path.join(root, 'node_modules', '@firebase');
    if (!fs.existsSync(firebasePkg) || !fs.existsSync(atFirebaseRoot)) {
        if (process.env.DEBUG || process.env.CI) {
            console.log('[firebase-patch] Skipping: packages not installed.');
        }
        return;
    }

    const firebaseNodeModules = path.join(root, 'node_modules', 'firebase', 'node_modules');
    const destAtFirebase = path.join(firebaseNodeModules, '@firebase');
    ensureSymlink(atFirebaseRoot, destAtFirebase);
}

run();
