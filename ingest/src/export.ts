#!/usr/bin/env bun
// Export the vectorized corpus from Postgres to demo/data/chunks.json — the exact
// shape the demo reads at runtime (see demo/src/lib/corpus.ts). Keeps the shipped
// corpus in sync with the DB. Run after ingest: bun run export
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db";

const rows = await db`
  select p.name as project, d.lot, d.piece_type as "pieceType", d.file_name as "fileName",
         c.page, c.article_code as "articleCode", c.content, c.embedding::text as embedding
  from chunks c
  join documents d on d.id = c.document_id
  join projects p on p.id = c.project_id
  order by p.name, d.file_name, c.page, c.id`;

// pgvector's text form is "[0.1,0.2,…]", already valid JSON.
const chunks = rows.map((r) => ({
  project: r.project as string,
  lot: r.lot as string | null,
  pieceType: r.pieceType as string,
  fileName: r.fileName as string,
  page: r.page as number | null,
  articleCode: r.articleCode as string | null,
  content: r.content as string,
  embedding: JSON.parse(r.embedding as string) as number[],
}));

const out = join(import.meta.dir, "..", "..", "demo", "data", "chunks.json");
writeFileSync(out, JSON.stringify(chunks));
console.log(`✅ ${chunks.length} chunks exportés -> ${out}`);
await db.end();
