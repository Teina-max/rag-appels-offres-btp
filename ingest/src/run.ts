#!/usr/bin/env bun
// Ingest the corpus: for each PDF, extract -> chunk -> embed (Voyage) -> insert.
// Idempotent per project (wipe + re-insert). Run: bun run ingest
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSecrets } from "./env";
import { pdfToPages } from "./extract";
import { chunkPages } from "./chunk";
import { embedBatch } from "./embed";
import { db, getOrCreateProject, wipeProject, insertDocument, insertChunks } from "./db";

loadSecrets();

const CORPUS = join(import.meta.dir, "..", "..", "corpus", "raw");

// Per-source metadata. piece_type is the default for a source folder; Cuzieu
// combines CCTP + DPGF in a single document, Coupvray ships CCTP per lot.
const SOURCES: Record<string, { project: string; buyer: string; pieceType: string }> = {
  coupvray: { project: "AO Coupvray — Aménagement combles mairie", buyer: "Mairie de Coupvray (77)", pieceType: "CCTP" },
  cuzieu: { project: "AO Cuzieu — École", buyer: "Commune de Cuzieu (42)", pieceType: "CCTP-DPGF" },
};

function parseLot(fileName: string): string | null {
  const m = fileName.toUpperCase().match(/LOT[-\s]?(\d{1,2})/);
  return m ? `LOT${m[1]!.padStart(2, "0")}` : null;
}

for (const [group, meta] of Object.entries(SOURCES)) {
  const dir = join(CORPUS, group);
  const projectId = await getOrCreateProject(meta.project, meta.buyer);
  await wipeProject(projectId);

  const pdfs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  for (const pdf of pdfs) {
    const pages = await pdfToPages(join(dir, pdf));
    const chunks = chunkPages(pages);
    const lot = parseLot(pdf);
    const documentId = await insertDocument(projectId, {
      lot,
      pieceType: meta.pieceType,
      fileName: pdf,
      pageCount: pages.length,
    });
    const embeddings = await embedBatch(chunks.map((c) => c.content), "document");
    await insertChunks(
      documentId,
      projectId,
      chunks.map((c, i) => ({ ...c, embedding: embeddings[i]! })),
    );
    console.log(`${group}/${pdf} — lot=${lot ?? "—"} · ${chunks.length} chunks`);
  }
}

const [row] = await db`select count(*)::int as count from chunks`;
console.log(`\n✅ ${row!.count} chunks en base`);
await db.end();
