#!/usr/bin/env bun
// One-off: wipe all corpus data so a fresh ingest yields a clean export.
// Destructive — needs DATABASE_URL. Run: bun run reset
import { db } from "./db";

await db`truncate table findings, chunks, cctp_articles, dpgf_postes, documents, projects restart identity cascade`;
console.log("✅ Base vidée (projects / documents / chunks / findings…)");
await db.end();
