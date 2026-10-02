-- =============================================================
-- Chatbot RAG · base Supabase (Postgres + pgvector)
-- À exécuter une fois dans Supabase > SQL Editor.
-- =============================================================

create extension if not exists vector;

-- 1. Les chunks du livre -----------------------------------------
-- content   : en-tête (livre | partie › chapitre | section | page) + augmentations + passage
-- metadata  : book, book_id, part, chapter, chapter_title, section, section_title, page, chunk_id…
-- embedding : gemini-embedding-001, 3072 dimensions. Pas d'index HNSW : pgvector le limite à 2000
--             dimensions, et quelques centaines de chunks se cherchent très bien sans.
create table if not exists documents (
  id        bigserial primary key,
  content   text,
  metadata  jsonb,
  embedding vector(3072),
  fts       tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored
);

-- Ingestion reprenable : un chunk_id n'existe qu'une fois
create unique index if not exists documents_chunk_id_key on documents ((metadata->>'chunk_id'));
-- Recherche plein texte (mots-clés, entités, questions hypothétiques, texte du livre)
create index if not exists documents_fts_idx on documents using gin (fts);

-- Liste légère des chunks déjà indexés, lue par le nœud « Déjà indexés »
create or replace view indexed_chunks with (security_invoker = true) as
  select metadata->>'chunk_id' as chunk_id from documents;

-- 2. Mémoire du chatbot -------------------------------------------
create table if not exists chat_messages (
  id         bigserial primary key,
  session_id text not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on chat_messages (session_id, id);

-- 3. Sécurité -----------------------------------------------------
-- RLS sans policy : la clé publique « anon » ne lit ni n'écrit rien.
-- n8n passe par la clé service_role et par Postgres, non concernés.
alter table documents     enable row level security;
alter table chat_messages enable row level security;

-- 4. Recherche par le sens (nœud « Recherche », Supabase Vector Store) ----
create or replace function match_documents(
  query_embedding vector(3072),
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  select id, content, metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Recherche par les mots (nœud « Recherche mots-clés », Postgres) -----
-- Mots reliés par OU, classés par ts_rank_cd, avec le même filtre de métadonnées que la recherche vectorielle.
create or replace function keyword_search_filtre(
  query_text text,
  match_count int default 15,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, rank real)
language sql stable
set search_path = public
as $$
  with q as (
    select nullif(replace(plainto_tsquery('english', query_text)::text, '&', '|'), '')::tsquery as tsq
  )
  select d.id, d.content, d.metadata, ts_rank_cd(d.fts, q.tsq) as rank
  from documents d, q
  where q.tsq is not null and d.fts @@ q.tsq and d.metadata @> coalesce(filter, '{}'::jsonb)
  order by rank desc
  limit match_count;
$$;

-- Repartir de zéro (changer de livre) :
-- truncate table documents, chat_messages restart identity;
