-- RAG appels d'offres BTP — initial schema
-- projects -> documents -> chunks(embedding) + structured tables + findings
-- Embedding dim: voyage-3-large = 1024. Change vector(N) everywhere if you
-- switch embedding model.

create extension if not exists vector;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  buyer text,                 -- public buyer, for source attribution
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  lot text,                   -- null = shared piece (CCAP / CCTC / RC)
  piece_type text not null,   -- CCTP | DPGF | CCAP | CCTC | RC | AE
  file_name text not null,
  page_count int not null default 0,
  created_at timestamptz not null default now()
);
create index documents_project_idx on documents(project_id);
create index documents_project_lot_idx on documents(project_id, lot);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  article_code text,
  page int,
  content text not null,
  token_count int not null default 0,
  embedding vector(1024),
  created_at timestamptz not null default now()
);
create index chunks_document_idx on chunks(document_id);
create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);

-- Structured extractions, kept apart from prose chunks so the deterministic
-- pass can join CCTP articles to DPGF line items by shared article code.
create table dpgf_postes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  lot text,
  code text,                  -- join key with cctp_articles.code
  designation text,
  unite text,
  quantite numeric,
  row_index int
);
create index dpgf_postes_lot_code_idx on dpgf_postes(lot, code);

create table cctp_articles (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  lot text,
  code text,
  prestation text,
  localisation text,
  specification text,
  page int
);
create index cctp_articles_lot_code_idx on cctp_articles(lot, code);

create table findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,         -- TROU | DOUBLON | CONTRADICTION
  severity text not null,     -- low | medium | high
  detection text not null,    -- deterministic | semantic
  title text not null,
  description text,
  source_a jsonb,
  source_b jsonb,
  gold_ref text,              -- link to an eval gold-set entry
  created_at timestamptz not null default now()
);
create index findings_project_idx on findings(project_id);

-- Retrieval RPC: cosine similarity, optional project scope.
create or replace function match_chunks(
  query_embedding vector(1024),
  match_count int default 8,
  filter_project uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  article_code text,
  page int,
  similarity float
)
language sql stable
as $$
  select c.id, c.document_id, c.content, c.article_code, c.page,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where filter_project is null or c.project_id = filter_project
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS: read for authenticated users, writes reserved to service_role (bypasses RLS).
alter table projects enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table dpgf_postes enable row level security;
alter table cctp_articles enable row level security;
alter table findings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['projects', 'documents', 'chunks', 'dpgf_postes', 'cctp_articles', 'findings']
  loop
    execute format('create policy %I_read on %I for select to authenticated using (true)', t, t);
  end loop;
end $$;
