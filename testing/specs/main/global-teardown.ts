/**
 * Global teardown for Playwright tests
 * Cleans up resources after all tests complete
 */
import fs from "fs";
import path from "path";

export default async function globalTeardown() {
  console.log("🧹 Running global teardown...");

  // Attempt to terminate spawned dev server (if any)
  if (process.env.KEEP_DEV_SERVER) {
    console.log("⏭️  KEEP_DEV_SERVER set; skipping dev server termination.");
  } else {
    const pidFile = path.resolve(
      process.cwd(),
      "test-results/.dev-server.json"
    );
    if (fs.existsSync(pidFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(pidFile, "utf-8"));
        const pid = data.pid as number | undefined;
        if (pid) {
          console.log(
            `🔻 Attempting to terminate spawned dev server PID ${pid}...`
          );
          try {
            process.kill(pid, "SIGTERM");
            console.log("✅ Sent SIGTERM to dev server.");
          } catch (e: unknown) {
            const msg =
              e && typeof e === "object" && "message" in e
                ? String((e as { message?: unknown }).message)
                : String(e);
            console.warn("⚠️ Failed to SIGTERM dev server:", msg);
          }
        }
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : String(e);
        console.warn("⚠️ Could not parse dev server PID file:", msg);
      }
    }
  }

  console.log("✅ Global teardown completed");
}
