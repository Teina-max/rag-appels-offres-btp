# RAG appels d'offres BTP

> Assistant IA qui **répond de façon sourcée** sur les pièces d'un appel d'offres de travaux, et **détecte les incohérences entre lots** avant la remise d'offre — les « trous dans la raquette » qu'un chiffrage laisse passer.

Projet de démonstration open-source : un système RAG documentaire *production-grade* sur un vrai corpus de marchés publics, avec grounding strict, citations, et une **suite d'évaluation chiffrée**. Développé en *building public*.

## Le problème

Sur un appel d'offres BTP, chaque lot (maçonnerie, plâtrerie, menuiseries, électricité…) a son CCTP et son DPGF. Les **limites de prestation entre lots** sont dispersées dans des centaines de pages. Une prestation oubliée à l'interface de deux lots — ou décrite deux fois — se paie en avenant ou en perte de marge. NotebookLM répond à des questions, mais ne sait pas **réconcilier les lots entre eux**.

## Ce que fait le système

1. **Q&A sourcé** sur le dossier : chaque réponse est fondée uniquement sur les extraits du dossier, avec citations `[n]` cliquables. Si l'info n'y est pas, le système le dit (pas d'hallucination).
2. **Détection d'incohérences** en deux passes :
   - **Déterministe** — jointure CCTP ↔ DPGF par code d'article (poste chiffré sans prescription, prescription sans poste…).
   - **Sémantique** — rapprochement des énoncés d'interface entre lots (embeddings + qualification LLM) : trou de fourniture, doublon, contradiction.

## Architecture

```
PDF (pièces écrites) ──► extraction (pdftotext -layout) ──► sanitize (NFKC) ──► chunking
                                                                                    │
                              ┌─────────────────────────────────────────────────────┤
                              ▼                                                       ▼
                    embeddings Voyage ──► pgvector (HNSW)              extraction structurée (CCTP articles, DPGF postes)
                              │                                                       │
                              ▼                                                       ▼
              retrieval + grounding strict (Claude, citations)      détection incohérences (déterministe + sémantique)
```

## Stack

- **Runtime** : Bun + TypeScript
- **Base** : Supabase (PostgreSQL + pgvector, index HNSW, RLS) — hébergement EU
- **Embeddings** : Voyage AI (`voyage-3-large`, 1024d)
- **LLM** : Claude Sonnet
- **Démo** : Next.js (UI minimale : chat sourcé + panneau incohérences)

## Évaluation

La fiabilité se mesure. Le corpus sert de base à deux gold sets (`eval/gold/`) :

- **Q&A** : questions → réponses attendues, matching *token-set*, précision / rappel.
- **Détection** : incohérences plantées + cas négatifs, métrique orientée **précision** (un faux positif détruit la confiance).

> Métriques publiées ici au fur et à mesure. *(section en construction)*

## Corpus

Vrai corpus de marchés publics (pièces écrites uniquement, pas de plans d'architecte). Provenance, licence et cadre juridique : **[`SOURCES.md`](./SOURCES.md)**.

## Statut

Building public — avancement :

- [x] Corpus réel constitué (2 DCE, 8 pièces, 144 pages)
- [x] Pipeline extraction + sanitize + chunking (371 chunks, 94 % avec code article)
- [x] Schéma DB (pgvector + HNSW + RPC + RLS)
- [x] Embeddings Voyage + ingestion en base (371 chunks vectorisés)
- [x] Retrieval + Q&A sourcé (grounding strict, citations, filtre lot, anti-hallucination)
- [ ] Détection d'incohérences (déterministe + sémantique)
- [ ] Suite d'évaluation + métriques
- [ ] UI démo déployée

## Lancer localement

Prérequis : [Bun](https://bun.sh), `poppler` (`brew install poppler`), et Docker.

```bash
# 1. Inspecter l'extraction/chunking (aucune clé requise)
cd ingest && bun install && bun run inspect

# 2. Base Postgres + pgvector locale (gratuit, sans cloud)
bash scripts/db-local.sh
# → renseigner DATABASE_URL + VOYAGE_API_KEY + ANTHROPIC_API_KEY
#   dans ~/.secrets/rag-ao-btp.env (voir .env.example)

# 3. Ingérer le corpus (embeddings Voyage → pgvector)
cd ingest && bun run ingest

# 4. Poser une question sourcée
bun run ask "Quels travaux de plâtrerie sont prévus ?" --project coupvray --lot LOT03
```
