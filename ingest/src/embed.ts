import { requireEnv } from "./env";

const BATCH = 16;
const MAX_RETRIES = 6;
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

export type InputType = "document" | "query";

/** Embed texts in batches. Voyage free tier is rate-limited, so 429s are retried
 * with exponential backoff. */
export async function embedBatch(texts: string[], inputType: InputType): Promise<number[][]> {
  const key = requireEnv("VOYAGE_API_KEY");
  const model = process.env.VOYAGE_MODEL || "voyage-3-large";
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await embedOnce(texts.slice(i, i + BATCH), inputType, key, model)));
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], "query");
  return vec!;
}

async function embedOnce(
  input: string[],
  inputType: InputType,
  key: string,
  model: string,
  attempt = 0,
): Promise<number[][]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ input, model, input_type: inputType }),
  });

  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) throw new Error("Voyage 429: retries exhausted");
    const wait = Math.min(60_000, 2_000 * 1.5 ** attempt);
    await Bun.sleep(wait);
    return embedOnce(input, inputType, key, model, attempt + 1);
  }
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}
