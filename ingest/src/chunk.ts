export interface Chunk {
  page: number; // 1-indexed
  content: string;
  articleCode: string | null;
  tokenCount: number; // rough estimate ≈ chars / 4
}

const MAX_CHARS = 1500;
const MIN_CHARS = 30;
// Hierarchical article numbering: 01.02, 2.1.3, 02.01.01 … (1 to 4 levels)
const ARTICLE_CODE = /\b(\d{1,3}(?:\.\d{1,3}){1,3})\b/;

/**
 * Chunk pages by accumulating lines up to MAX_CHARS.
 * Tracks the last seen article code (hierarchical numbering) so chunks can be
 * joined to DPGF line items in the deterministic detection pass. The code
 * carries across pages since a CCTP section can span several pages.
 */
export function chunkPages(pages: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let code: string | null = null;

  pages.forEach((pageText, pageIdx) => {
    const page = pageIdx + 1;
    let buf = "";
    let bufCode: string | null = code;

    const flush = () => {
      const content = buf.trim();
      if (content.length >= MIN_CHARS) {
        chunks.push({ page, content, articleCode: bufCode, tokenCount: Math.ceil(content.length / 4) });
      }
      buf = "";
      bufCode = code;
    };

    for (const line of pageText.split("\n")) {
      const match = line.match(ARTICLE_CODE);
      if (match) {
        code = match[1];
        if (buf.trim().length === 0) bufCode = code;
      }
      if (buf.length + line.length + 1 > MAX_CHARS) flush();
      buf += line + "\n";
    }
    flush();
  });

  return chunks;
}
