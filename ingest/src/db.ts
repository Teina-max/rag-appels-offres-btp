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

export async function getProjectIdByHint(hint: string): Promise<string> {
  const rows = await db`
    select id from projects where lower(name) like ${"%" + hint.toLowerCase() + "%"}
    order by created_at limit 1`;
  if (!rows.length) throw new Error(`No project matching "${hint}"`);
  return rows[0]!.id;
}

export interface Match {
  content: string;
  articleCode: string | null;
  page: number;
  similarity: number;
  lot: string | null;
  pieceType: string;
  fileName: string;
}

/**
 * Retrieve top chunks by cosine similarity, scoped to a project.
 * When `lot` is set, over-fetch then keep only that lot + shared pieces
 * (lot is null) — a hard scope filter, not a soft prompt hint.
 */
export async function matchChunks(
  embedding: number[],
  count: number,
  projectId: string,
  lot?: string | null,
): Promise<Match[]> {
  const vec = `[${embedding.join(",")}]`;
  const limit = lot ? count * 6 : count;
  const rows = await db`
    select c.content, c.article_code, c.page,
           1 - (c.embedding <=> ${vec}::vector) as similarity,
           d.lot, d.piece_type, d.file_name
    from chunks c
    join documents d on d.id = c.document_id
    where c.project_id = ${projectId}
    order by c.embedding <=> ${vec}::vector
    limit ${limit}`;
  const matches: Match[] = rows.map((r) => ({
    content: r.content,
    articleCode: r.article_code,
    page: r.page,
    similarity: Number(r.similarity),
    lot: r.lot,
    pieceType: r.piece_type,
    fileName: r.file_name,
  }));
  if (!lot) return matches;
  return matches.filter((m) => m.lot === lot || m.lot === null).slice(0, count);
}
