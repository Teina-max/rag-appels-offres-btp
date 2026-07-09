import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SECRETS_PATH = join(homedir(), ".secrets", "rag-ao-btp.env");

/**
 * Load secrets from ~/.secrets/rag-ao-btp.env (out of repo, chmod 600) into
 * process.env without overriding vars already set. Secrets are never committed;
 * see .env.example for the expected keys.
 */
export function loadSecrets(): void {
  if (!existsSync(SECRETS_PATH)) return;
  for (const line of readFileSync(SECRETS_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

// Auto-load on import so modules that read env at import time (e.g. db.ts) work
// regardless of ES module evaluation order.
loadSecrets();
