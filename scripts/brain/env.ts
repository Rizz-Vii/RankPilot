// Brain env hydration: load ALL KEY=VALUE pairs from .env.local that are not already present.
// Future proof: brain can access any new variable without code change. Never overwrites existing process.env.
import fs from "fs";

export function hydrateBrainEnv() {
  const candidate = ".env.local";
  try {
    if (!fs.existsSync(candidate)) return;
    const content = fs.readFileSync(candidate, "utf8");
    for (const rawLine of content.split(/\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key] !== undefined) continue; // don't clobber runtime-injected values
      let val = rawVal.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* silent */
  }
}

export default { hydrateBrainEnv };
