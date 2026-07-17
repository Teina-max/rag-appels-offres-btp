export const MAX_QUESTION_LENGTH = 300;
const PER_IP_LIMIT = 10;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_DAILY_LIMIT = 150;
const CACHE_MAX_ENTRIES = 100;

// In-memory state is per serverless instance: good enough as a first fence for
// a low-traffic demo. The hard backstop is the spend limit on the API keys.
const perIpHits = new Map<string, number[]>();
let dailyCount = { day: "", count: 0 };
const answerCache = new Map<string, unknown>();

export function normalizeQuestion(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, " ");
}

export function checkRateLimits(ip: string, now = Date.now()): { ok: true } | { ok: false; reason: string } {
  const today = new Date(now).toISOString().slice(0, 10);
  if (dailyCount.day !== today) dailyCount = { day: today, count: 0 };
  if (dailyCount.count >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, reason: "Le quota quotidien de la démo est atteint. Revenez demain, ou lancez la démo en local depuis le dépôt GitHub." };
  }

  const hits = (perIpHits.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW_MS);
  if (hits.length >= PER_IP_LIMIT) {
    return { ok: false, reason: "Limite de questions atteinte pour l'instant. Réessayez dans une heure." };
  }

  hits.push(now);
  perIpHits.set(ip, hits);
  dailyCount.count += 1;
  return { ok: true };
}

export function cacheGet(key: string): unknown | undefined {
  return answerCache.get(key);
}

export function cacheSet(key: string, value: unknown): void {
  if (answerCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = answerCache.keys().next().value;
    if (oldest !== undefined) answerCache.delete(oldest);
  }
  answerCache.set(key, value);
}
