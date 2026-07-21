#!/usr/bin/env bun
// Ingest the corpus: for each PDF, extract -> chunk -> embed (Voyage) -> insert.
// Idempotent per project (wipe + re-insert). Run: bun run ingest
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pdfToPages } from "./extract";
import { chunkPages } from "./chunk";
import { embedBatch } from "./embed";
import { db, getOrCreateProject, wipeProject, insertDocument, insertChunks } from "./db";

const CORPUS = join(import.meta.dir, "..", "..", "corpus", "raw");

// Per-source metadata. pieceType is the folder default; parsePieceType overrides
// it per file, since a single dossier can bundle a CCP/CCTP with its BPU price
// schedule. The BTP corpus (coupvray/cuzieu) stays in corpus/raw and is
// recoverable from git history — swap the entries below to re-ingest it.
const SOURCES: Record<string, { project: string; buyer: string; pieceType: string }> = {
  "camp-des-milles": { project: "AO Camp des Milles — Gardiennage et surveillance", buyer: "Fondation du Camp des Milles, Mémorial (13)", pieceType: "CCP" },
  "guyane-prefecture": { project: "AO Préfecture de Guyane — Surveillance et gardiennage", buyer: "Préfecture de la Guyane (973)", pieceType: "CCTP" },
  "grand-chambery": { project: "AO Grand Chambéry — Surveillance d'équipements sportifs", buyer: "Grand Chambéry (73)", pieceType: "CCTP" },
};

function parseLot(fileName: string): string | null {
  const m = fileName.toUpperCase().match(/LOT[-\s]?(\d{1,2})/);
  return m ? `LOT${m[1]!.padStart(2, "0")}` : null;
}

// Piece type from the file name, falling back to the folder default.
function parsePieceType(fileName: string, fallback: string): string {
  const f = fileName.toUpperCase();
  if (/\bBPU\b|BORDEREAU|DPGF/.test(f)) return "BPU";
  if (/\bCCAP\b/.test(f)) return "CCAP";
  if (/\bCCTP\b/.test(f)) return "CCTP";
  if (/\bCCP\b/.test(f)) return "CCP";
  if (/\bRC\b|REGLEMENT/.test(f)) return "RC";
  return fallback;
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
      pieceType: parsePieceType(pdf, meta.pieceType),
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
