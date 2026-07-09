#!/usr/bin/env bun
// Dry-run inspector: extract + chunk every PDF in corpus/raw and print stats.
// Proves the extraction/chunking pipeline works on the real corpus without any
// cloud dependency (no embeddings, no DB). Run: bun run inspect
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pdfToPages } from "./extract";
import { chunkPages } from "./chunk";

const CORPUS = join(import.meta.dir, "..", "..", "corpus", "raw");

let totalPages = 0;
let totalChunks = 0;
let totalWithCode = 0;

const groups = readdirSync(CORPUS, { withFileTypes: true }).filter((d) => d.isDirectory());
for (const group of groups) {
  const dir = join(CORPUS, group.name);
  const pdfs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  for (const pdf of pdfs) {
    const pages = await pdfToPages(join(dir, pdf));
    const chunks = chunkPages(pages);
    const withCode = chunks.filter((c) => c.articleCode).length;
    totalPages += pages.length;
    totalChunks += chunks.length;
    totalWithCode += withCode;
    console.log(`${group.name}/${pdf}`);
    console.log(`  ${pages.length} pages · ${chunks.length} chunks · ${withCode} with article code`);
  }
}

console.log(`\nTotal: ${totalPages} pages · ${totalChunks} chunks · ${totalWithCode} with article code`);
