import { $ } from "bun";
import { sanitize } from "./sanitize";

/**
 * Extract a PDF as an array of pages (one string per page).
 * `pdftotext -layout` preserves the tabular layout — important for DPGF price
 * tables. Pages are split on the form-feed (\f) emitted by pdftotext.
 * Requires the `poppler` package (provides `pdftotext`).
 */
export async function pdfToPages(path: string): Promise<string[]> {
  const raw = await $`pdftotext -layout ${path} -`.text();
  return raw
    .split("\f")
    .map((page) => sanitize(page))
    .filter((page) => page.trim().length > 0);
}
