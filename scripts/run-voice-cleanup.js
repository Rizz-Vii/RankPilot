#!/usr/bin/env node
/* Run voice holds cleanup using server admin DB (requires FIREBASE credentials in env) */
(async function main() {
  try {
    const cleanup =
      require("../src/lib/voice/holds-cleanup").cleanupExpiredHolds;
    if (!cleanup) {
      console.error("cleanup util not available");
      process.exit(2);
    }

    const limitArg = parseInt(process.argv[2] || "100", 10);
    const res = await cleanup({ limit: limitArg });
    console.log("cleanup result:", res);
    process.exit(res && res.ok ? 0 : 1);
  } catch (e) {
    console.error("cleanup failed", e);
    process.exit(3);
  }
})();
