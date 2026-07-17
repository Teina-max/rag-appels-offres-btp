import { matchChunks, listProjects, type Match } from "@/lib/corpus";
import { MAX_QUESTION_LENGTH, cacheGet, cacheSet, checkRateLimits, normalizeQuestion } from "@/lib/guardrails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENTINEL = "Je n'ai pas trouvé cette information dans les pièces du dossier.";

// Same system prompt as ingest/src/ask.ts so the demo behaves exactly like the CLI.
const SYSTEM = `Tu es un assistant d'analyse d'appels d'offres BTP.
Tu réponds UNIQUEMENT à partir des extraits numérotés fournis.
INTERDICTION d'inventer une valeur, une référence, une quantité ou une prescription qui n'apparaît pas littéralement dans les extraits.
Cite chaque affirmation avec [n], où n renvoie au numéro de l'extrait utilisé.
Si l'information n'est pas dans les extraits, réponds exactement : "${SENTINEL}"`;

type AskPayload = { question: string; project?: string };

type AskResult = {
  answer: string;
  sources: Array<Pick<Match, "fileName" | "lot" | "page" | "articleCode" | "similarity">>;
};

function json(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parsePayload(value: unknown): AskPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.question !== "string") return null;
  const question = record.question.trim();
  if (question.length < 3 || question.length > MAX_QUESTION_LENGTH) return null;
  const project = typeof record.project === "string" && listProjects().includes(record.project)
    ? record.project
    : undefined;
  return { question, project };
}

async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("Missing VOYAGE_API_KEY");
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      input: [text],
      model: process.env.VOYAGE_MODEL || "voyage-3-large",
      input_type: "query"
    })
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0]!.embedding;
}

async function askClaude(user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((c) => c.type === "text" && c.text).map((c) => c.text).join("");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requête JSON invalide." }, 400);
  }

  const payload = parsePayload(body);
  if (!payload) {
    return json({ error: `Question requise (3 à ${MAX_QUESTION_LENGTH} caractères).` }, 400);
  }

  const cacheKey = `${payload.project ?? "all"}::${normalizeQuestion(payload.question)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return json(cached as object, 200);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimits(ip);
  if (!limit.ok) return json({ error: limit.reason }, 429);

  try {
    const embedding = await embedQuery(payload.question);
    const matches = matchChunks(embedding, 8, payload.project);

    const extracts = matches
      .map(
        (m, i) =>
          `[${i + 1}] (${m.lot ?? "commun"}, ${m.pieceType}, p.${m.page}${m.articleCode ? `, art.${m.articleCode}` : ""}) : ${m.content}`
      )
      .join("\n\n");

    const answer = await askClaude(`Question : ${payload.question}\n\nExtraits :\n${extracts}`);

    const result: AskResult = {
      answer,
      sources: matches.map((m) => ({
        fileName: m.fileName,
        lot: m.lot,
        page: m.page,
        articleCode: m.articleCode,
        similarity: Number(m.similarity.toFixed(3))
      }))
    };

    cacheSet(cacheKey, result);
    return json(result, 200);
  } catch (error) {
    console.error("ask failed", { error: error instanceof Error ? error.message : "unknown" });
    return json({ error: "Le service de démonstration est momentanément indisponible." }, 503);
  }
}
