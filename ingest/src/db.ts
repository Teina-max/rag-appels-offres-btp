import postgres from "postgres";
import { requireEnv } from "./env";

// prepare:false keeps this compatible with a serverless/pooled connection later.
export const db = postgres(requireEnv("DATABASE_URL"), { prepare: false });

export async function getOrCreateProject(name: string, buyer: string): Promise<string> {
  const existing = await db`select id from projects where name = ${name} limit 1`;
  if (existing.length) return existing[0]!.id;
  const [row] = await db`insert into projects (name, buyer) values (${name}, ${buyer}) returning id`;
  return row!.id;
}

/** Idempotent re-ingest: drop the project's documents (chunks cascade) and findings. */
export async function wipeProject(projectId: string): Promise<void> {
  await db`delete from documents where project_id = ${projectId}`;
  await db`delete from findings where project_id = ${projectId}`;
}

export interface DocumentMeta {
  lot: string | null;
  pieceType: string;
  fileName: string;
  pageCount: number;
}

export async function insertDocument(projectId: string, doc: DocumentMeta): Promise<string> {
  const [row] = await db`
    insert into documents (project_id, lot, piece_type, file_name, page_count)
    values (${projectId}, ${doc.lot}, ${doc.pieceType}, ${doc.fileName}, ${doc.pageCount})
    returning id`;
  return row!.id;
}

export interface ChunkRow {
  page: number;
  content: string;
  articleCode: string | null;
  tokenCount: number;
  embedding: number[];
}

export async function insertChunks(documentId: string, projectId: string, chunks: ChunkRow[]): Promise<void> {
  for (const c of chunks) {
    const vec = `[${c.embedding.join(",")}]`;
    await db`
      insert into chunks (document_id, project_id, article_code, page, content, token_count, embedding)
      values (${documentId}, ${projectId}, ${c.articleCode}, ${c.page}, ${c.content}, ${c.tokenCount}, ${vec}::vector)`;
  }
}
