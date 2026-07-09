#!/usr/bin/env bash
# Local Postgres + pgvector for development (free, no cloud). Requires Docker.
# Creates Supabase-compatible roles so the RLS migration applies unchanged
# locally and on Supabase cloud later.
set -euo pipefail

NAME=rag-ao-btp-db
DIR="$(cd "$(dirname "$0")/.." && pwd)"

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rag \
  -p 5433:5432 \
  pgvector/pgvector:pg17 >/dev/null

echo "waiting for postgres..."
until docker exec "$NAME" psql -U postgres -d rag -tc "select 1" >/dev/null 2>&1; do sleep 1; done

docker exec -i "$NAME" psql -U postgres -d rag >/dev/null <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
SQL

docker exec -i "$NAME" psql -U postgres -d rag -v ON_ERROR_STOP=1 < "$DIR/supabase/migrations/0001_init.sql" >/dev/null

echo "✅ local DB ready: postgres://postgres:postgres@localhost:5433/rag"
echo "   add it as DATABASE_URL in ~/.secrets/rag-ao-btp.env"
