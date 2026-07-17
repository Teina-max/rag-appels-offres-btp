# Démo web — RAG appels d'offres BTP

Interface publique du pipeline RAG : question libre sur le corpus, réponse fondée uniquement sur les pièces du dossier avec citations, refus explicite quand l'information n'existe pas.

## Comment elle fonctionne

- **Corpus embarqué** : `data/chunks.json` contient les 371 extraits vectorisés (Voyage `voyage-3-large`, 1024d) exportés du pipeline d'ingestion. À cette échelle, une similarité cosinus brute-force en mémoire répond en ~1 ms ; pgvector + HNSW (voir `supabase/migrations/`) est la voie production pour des corpora plus grands.
- **Même comportement que le CLI** : prompt système identique à `ingest/src/ask.ts` (grounding strict, citations `[n]`, phrase de refus imposée), embeddings de requête Voyage à la volée, réponse Claude à température 0.
- **Garde-fous** : question limitée à 300 caractères, 10 questions/heure par IP, plafond global quotidien, cache des réponses aux questions déjà posées, `max_tokens` borné. Le filet de sécurité final reste la limite de dépense configurée sur les clés API.

## Lancer localement

```bash
cd demo && bun install
# Clés dans l'environnement (voir ../.env.example) : VOYAGE_API_KEY, ANTHROPIC_API_KEY
bun run dev
```

Aucune base de données requise : le corpus vectorisé est committé.

## Tests

```bash
bun test:run
```

## Déploiement

Projet Vercel pointé sur ce dossier (`demo/`), avec `VOYAGE_API_KEY` et `ANTHROPIC_API_KEY` en variables d'environnement serveur. Aucun secret côté client.
