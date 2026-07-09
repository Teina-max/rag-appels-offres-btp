#!/usr/bin/env bun
// Grounded Q&A over the corpus. Run: bun run ask "question" [--project coupvray] [--lot LOT03]
import { embedQuery } from "./embed";
import { matchChunks, getProjectIdByHint, db } from "./db";
import { askClaude } from "./claude";

const SENTINEL = "Je n'ai pas trouvé cette information dans les pièces du dossier.";

const SYSTEM = `Tu es un assistant d'analyse d'appels d'offres BTP.
Tu réponds UNIQUEMENT à partir des extraits numérotés fournis.
INTERDICTION d'inventer une valeur, une référence, une quantité ou une prescription qui n'apparaît pas littéralement dans les extraits.
Cite chaque affirmation avec [n], où n renvoie au numéro de l'extrait utilisé.
Si l'information n'est pas dans les extraits, réponds exactement : "${SENTINEL}"`;

const args = process.argv.slice(2);
let projectHint = "coupvray";
let lot: string | null = null;
const questionParts: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project") projectHint = args[++i]!;
  else if (args[i] === "--lot") lot = args[++i]!.toUpperCase();
  else questionParts.push(args[i]!);
}
const question = questionParts.join(" ") || "Quels travaux de peinture sont prévus ?";

const projectId = await getProjectIdByHint(projectHint);
const embedding = await embedQuery(question);
const matches = await matchChunks(embedding, 8, projectId, lot);

console.log(`\n❓ ${question}${lot ? `  [${lot}]` : ""}\n`);

if (!matches.length) {
  console.log(SENTINEL);
  await db.end();
  process.exit(0);
}

const extracts = matches
  .map(
    (m, i) =>
      `[${i + 1}] (${m.lot ?? "commun"}, ${m.pieceType}, p.${m.page}${m.articleCode ? `, art.${m.articleCode}` : ""}) : ${m.content}`,
  )
  .join("\n\n");

const answer = await askClaude(SYSTEM, `Question : ${question}\n\nExtraits :\n${extracts}`);
console.log(answer);

console.log(`\n— Extraits fournis (retrieval) —`);
matches.forEach((m, i) =>
  console.log(
    `[${i + 1}] ${m.fileName} · ${m.lot ?? "commun"} · p.${m.page}${m.articleCode ? ` · art.${m.articleCode}` : ""} · sim=${m.similarity.toFixed(3)}`,
  ),
);
await db.end();
