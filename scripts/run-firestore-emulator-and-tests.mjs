#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";

function startEmulator() {
  const child = spawn(
    "npx",
    [
      "firebase",
      "emulators:start",
      "--only",
      "firestore",
      "--project",
      process.env.FIREBASE_PROJECT_ID || "demo-rankpilot",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    }
  );

  child.on("error", (err) => {
    console.error("[emulator] failed to start", err);
  });

  return child;
}

async function waitForEmulatorReady(child, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let ready = false;
    let exited = false;
    const timer = setTimeout(() => {
      if (!ready) {
        reject(new Error("Firestore emulator did not become ready in time"));
      }
    }, timeoutMs);

    const onData = (buf) => {
      const txt = buf.toString();
      // Heuristics based on firebase-tools logs
      if (
        txt.includes("All emulators ready") ||
        txt.includes("Firestore Emulator logging to") ||
        txt.includes("Firestore Emulator running")
      ) {
        ready = true;
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve(true);
      }
    };

    child.stdout.on("data", onData);
    const onStderr = (buf) => {
      const txt = buf.toString();
      // Also treat stderr logs as readiness signals (firebase-tools may write to stderr)
      if (
        txt.includes("All emulators ready") ||
        txt.includes("Firestore Emulator logging to") ||
        txt.includes("Firestore Emulator running")
      ) {
        ready = true;
        clearTimeout(timer);
        child.stderr.off("data", onStderr);
        resolve(true);
        return;
      }
      if (txt.toLowerCase().includes("error")) {
        console.error("[emulator]", txt.trim());
      }
    };
    child.stderr.on("data", onStderr);

    // Fallback: actively poll the port for readiness in case logs change
    const host = "127.0.0.1";
    const port = parseInt(process.env.FIRESTORE_EMULATOR_PORT || "8080", 10);
    const start = Date.now();
    const poll = () => {
      if (ready) return; // Already ready via logs
      if (Date.now() - start > timeoutMs) return; // timer will reject
      const socket = net.createConnection({ host, port }, () => {
        ready = true;
        clearTimeout(timer);
        socket.end();
        resolve(true);
      });
      socket.on("error", () => {
        setTimeout(poll, 500);
      });
    };
    poll();

    const onExit = (code) => {
      exited = true;
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`Firestore emulator exited early with code ${code}`));
      }
    };
    child.once("exit", onExit);
  });
}

async function runTestsWithEnv() {
  // Point rules tests to local emulator
  const env = { ...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
  const test = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "test:unit:firebase"],
    { stdio: "inherit", env }
  );
  const [code] = await once(test, "exit");
  if (code !== 0) {
    throw new Error(`Unit tests failed with code ${code}`);
  }
}

async function main() {
  const emu = startEmulator();
  let shuttingDown = false;
  const cleanup = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      if (!emu.killed) emu.kill("SIGINT");
    } catch {}
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  try {
    await waitForEmulatorReady(emu);
  } catch (err) {
    console.error(String(err?.message || err));
    cleanup();
    process.exit(1);
  }

  try {
    await runTestsWithEnv();
  } catch (err) {
    console.error(String(err?.message || err));
    cleanup();
    process.exit(1);
  }

  cleanup();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
