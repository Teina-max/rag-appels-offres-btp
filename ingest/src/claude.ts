import { requireEnv } from "./env";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

/** Non-streaming Claude call. Temperature 0 for reproducible grounded answers. */
export async function askClaude(system: string, user: string, maxTokens = 1024): Promise<string> {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("");
}
