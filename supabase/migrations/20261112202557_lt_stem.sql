-- The stem of one Lithuanian word, as the database's own text search gives it
-- (ADR-0002). Kinds of work match on these whole-word stems, never substrings.
-- "kelių" gives "kel", "kelionių" gives "kelion". No stop words are removed.
create function public.lt_stem(word text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select (tsvector_to_array(pg_catalog.to_tsvector('pg_catalog.lithuanian', word)))[1]
$$;
