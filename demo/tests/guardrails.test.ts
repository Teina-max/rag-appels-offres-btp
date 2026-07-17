import { describe, expect, test } from "bun:test";
import { MAX_QUESTION_LENGTH, cacheGet, cacheSet, checkRateLimits, normalizeQuestion } from "../src/lib/guardrails";

describe("guardrails", () => {
  test("normalizes questions for cache keys", () => {
    expect(normalizeQuestion("  Quels   ESSAIS  ")).toBe("quels essais");
  });

  test("exposes the question length limit used by the API contract", () => {
    expect(MAX_QUESTION_LENGTH).toBe(300);
  });

  test("allows a burst below the per-IP limit then blocks", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimits("ip-burst", now + i).ok).toBe(true);
    }
    const blocked = checkRateLimits("ip-burst", now + 100);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toContain("Réessayez");
  });

  test("frees the per-IP window after an hour", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) checkRateLimits("ip-window", now + i);
    expect(checkRateLimits("ip-window", now + 61 * 60 * 1000).ok).toBe(true);
  });

  test("cache keeps values and evicts oldest beyond capacity", () => {
    cacheSet("first", { answer: "a" });
    for (let i = 0; i < 100; i++) cacheSet(`key-${i}`, { answer: String(i) });
    expect(cacheGet("first")).toBeUndefined();
    expect(cacheGet("key-99")).toEqual({ answer: "99" });
  });
});
