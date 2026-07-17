import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Chunk = {
  project: string;
  lot: string | null;
  pieceType: string;
  fileName: string;
  page: number | null;
  articleCode: string | null;
  content: string;
  embedding: number[];
};

export type Match = Omit<Chunk, "embedding"> & { similarity: number };

let corpus: Chunk[] | null = null;

function loadCorpus(): Chunk[] {
  if (!corpus) {
    const raw = readFileSync(join(process.cwd(), "data", "chunks.json"), "utf8");
    corpus = JSON.parse(raw) as Chunk[];
  }
  return corpus;
}

export function listProjects(): string[] {
  return [...new Set(loadCorpus().map((c) => c.project))].sort();
}

/**
 * Brute-force cosine top-k. Voyage embeddings are L2-normalized, so cosine
 * similarity is a plain dot product. 371 chunks x 1024 dims stays around a
 * millisecond per query; pgvector + HNSW (see supabase/migrations) is the
 * production path for larger corpora.
 */
export function matchChunks(queryEmbedding: number[], count = 8, project?: string): Match[] {
  const scored = loadCorpus()
    .filter((c) => !project || c.project === project)
    .map(({ embedding, ...rest }) => {
      let dot = 0;
      for (let i = 0; i < embedding.length; i++) dot += embedding[i]! * queryEmbedding[i]!;
      return { ...rest, similarity: dot };
    });

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, count);
}
