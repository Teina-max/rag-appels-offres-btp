import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listProjects, matchChunks, type Chunk } from "../src/lib/corpus";

const data = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "data", "chunks.json"), "utf8")
) as Chunk[];

describe("embedded corpus", () => {
  test("ships the full vectorized corpus", () => {
    expect(data.length).toBe(371);
    expect(data[0]!.embedding.length).toBe(1024);
    expect(listProjects().length).toBeGreaterThanOrEqual(2);
  });

  test("retrieves a chunk as its own best match", () => {
    const probe = data[42]!;
    const matches = matchChunks(probe.embedding, 3);
    expect(matches[0]!.content).toBe(probe.content);
    expect(matches[0]!.similarity).toBeGreaterThan(0.99);
  });

  test("respects the project filter", () => {
    const projects = listProjects();
    const matches = matchChunks(data[0]!.embedding, 8, projects[0]);
    for (const m of matches) expect(m.project).toBe(projects[0]);
  });

  test("returns at most the requested count, sorted by similarity", () => {
    const matches = matchChunks(data[7]!.embedding, 5);
    expect(matches.length).toBe(5);
    const sims = matches.map((m) => m.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
  });
});
