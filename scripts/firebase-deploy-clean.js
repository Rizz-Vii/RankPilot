#!/usr/bin/env node
/**
 * Clean Firebase deployment script
 * Suppresses console output that can interfere with Firebase CLI JSON parsing
 */

const originalConsole = {
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error,
};

// Store original process.stdout.write
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

// Override console methods during build
console.log = () => {};
console.warn = () => {};
console.info = () => {};

// Only allow critical errors through
console.error = (...args) => {
  // Only show critical Firebase/deployment errors
  const message = args.join(" ");
  if (
    message.includes("Firebase") ||
    message.includes("deployment") ||
    message.includes("Error:")
  ) {
    originalConsole.error(...args);
  }
};

// Override stdout/stderr to filter output
process.stdout.write = function (chunk, encoding, callback) {
  const str = chunk.toString();
  // Only allow Firebase CLI JSON output and critical messages
  if (
    (str.includes("{") && str.includes("}")) ||
    str.includes("Firebase") ||
    str.includes("Error")
  ) {
    return originalStdoutWrite.call(this, chunk, encoding, callback);
  }
  // Silently ignore other output
  if (typeof callback === "function") callback();
  return true;
};

process.stderr.write = function (chunk, encoding, callback) {
  const str = chunk.toString();
  // Only allow critical error messages
  if (str.includes("Error") || str.includes("Firebase")) {
    return originalStderrWrite.call(this, chunk, encoding, callback);
  }
  // Silently ignore warnings and non-critical output
  if (typeof callback === "function") callback();
  return true;
};

// Restore console on exit
process.on("exit", () => {
  Object.assign(console, originalConsole);
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  Object.assign(console, originalConsole);
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  process.exit(0);
});

console.log("Clean Firebase deployment script initialized");
