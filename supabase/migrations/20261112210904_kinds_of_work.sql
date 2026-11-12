-- Kinds of work and matching (ticket #7, ADR-0002).
--
-- A notice matches a Kind of work when any of its CPV codes falls in one of
-- the kind's 5-digit groups, or when its title holds an include word and its
-- main code is in the same 2-digit division as the kind. Exclude words remove
-- word matches only; code-exclude words drop code matches. Words are compared
-- as whole-word stems from the Lithuanian text search, on both sides.

-- The words of a text, as written and in order. A word is a run of letters;
-- everything else separates words. Letters typed as a base letter plus a
-- combining mark are joined first (NFC), and the invisible marks that sit
-- inside a word (soft hyphen, zero-width joiners, word joiner, BOM) are dropped.
--
-- Splitting here, rather than leaving it to the text search parser, keeps
-- words apart that the parser would glue into one token it does not stem:
-- "gatvių/kelių" (a file path), "g.Kelio" (a host name), "kelio5".
create function public.lt_words(t text)
returns text[]
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select coalesce(pg_catalog.array_agg(m[1] order by o), '{}')
  from pg_catalog.regexp_matches(
    pg_catalog.translate(pg_catalog.normalize(t, 'NFC'), U&'\00AD\200C\200D\2060\FEFF', ''),
    '([[:alpha:]]+)',
    'g'
  ) with ordinality as r(m, o)
$$;

-- The stems of every word in a text, from the Lithuanian text search. No stop
-- words are removed. Both a title and a kind's words go through this.
create function public.lt_stems(t text)
returns text[]
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select pg_catalog.tsvector_to_array(
    pg_catalog.to_tsvector('pg_catalog.lithuanian', pg_catalog.array_to_string(public.lt_words(t), ' '))
  )
$$;

-- True when every element is one word: a run of letters, as lt_words splits
-- a title. A kind's word of two words, a hyphen or punctuation could never
-- match a title word, so it is refused when the kind is stored.
create function public.lt_single_words(words text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select coalesce(pg_catalog.bool_and(coalesce(w ~ '^[[:alpha:]]+$', false)), true)
  from pg_catalog.unnest(words) as w
$$;

create table public.kinds_of_work (
  id uuid primary key default gen_random_uuid(),
  -- Lithuanian, as shown on screen.
  name text not null check (pg_catalog.btrim(name) <> ''),
  -- 5-digit CPV groups, such as 45233; at least one.
  cpv_groups text[] not null check (
    pg_catalog.array_position(cpv_groups, null) is null
    and pg_catalog.array_to_string(cpv_groups, ',') ~ '^[0-9]{5}(,[0-9]{5})*$'
  ),
  include_words text[] not null default '{}' check (public.lt_single_words(include_words)),
  exclude_words text[] not null default '{}' check (public.lt_single_words(exclude_words)),
  code_exclude_words text[] not null default '{}' check (public.lt_single_words(code_exclude_words)),
  origin text not null check (origin in ('hand_checked', 'model_proposed')),
  -- Tendered Contracts of 3,000 EUR or more in the 12 months of the pull of
  -- 11 November 2026, and one real Contract title with its id: fixed values
  -- for the hand-checked kinds.
  contract_count integer check (contract_count >= 0),
  example_title text,
  example_contract text
);

-- Public procurement data: everyone may read the hand-checked kinds, and no
-- User writes any kind. A model-proposed kind belongs to the Workspace it was
-- proposed for (ticket #22 adds that link and its read rule); until then only
-- the service role sees one.
alter table public.kinds_of_work enable row level security;

create policy "Hand-checked kinds of work are public"
on public.kinds_of_work
for select
to anon, authenticated
using (origin = 'hand_checked');

revoke all on table public.kinds_of_work from anon, authenticated;
grant select on table public.kinds_of_work to anon, authenticated;

-- Match one notice against a set of Kinds of work, as a Trade does: the
-- notice matches when it matches any of them.
--
-- Takes the notice's title, its main CPV code and all its CPV codes. Codes may
-- carry their check digit ("45233252-0"). With no main code, the first listed
-- code is the main one (ADR-0002); the main code counts as one of the codes.
--
-- Returns whether it matched, the kind that matched, and what matched: the
-- code ('code', and the notice's code as given, trimmed) or the word ('word',
-- and the first title word that matched, as written). A code match is
-- reported before a word match; among kinds that matched the same way, the
-- first in kind_ids wins.
--
-- A kind id that does not exist, or that the caller may not see, is an error:
-- a kind silently left out would hide the notices it should catch.
create function public.match_kinds(
  kind_ids uuid[],
  title text,
  main_cpv text,
  cpv_codes text[],
  out matched boolean,
  out kind_id uuid,
  out matched_by text,
  out matched_on text
)
language plpgsql
stable
parallel safe
set search_path = ''
as $$
declare
  ids uuid[] := coalesce(kind_ids, '{}');
  codes text[] := array(
    select pg_catalog.btrim(c)
    from pg_catalog.unnest(pg_catalog.array_prepend(main_cpv, cpv_codes)) with ordinality as u(c, o)
    where pg_catalog.btrim(c) <> ''
    order by o
  );
  title_words text[] := coalesce(public.lt_words(title), '{}');
  title_stems text[] := coalesce(public.lt_stems(title), '{}');
  missing uuid;
  include_stems text[];
begin
  select i into missing
  from pg_catalog.unnest(ids) as i
  where i is not null and not exists (select 1 from public.kinds_of_work k where k.id = i)
  limit 1;
  if found then
    raise exception 'no Kind of work with id %', missing using errcode = 'no_data_found';
  end if;

  -- A code match: the first kind with a code in one of its groups, and the
  -- first such code, unless the title holds one of the kind's code-exclude words.
  select k.id, hit.c into kind_id, matched_on
  from pg_catalog.unnest(ids) with ordinality as u(id, ord)
  join public.kinds_of_work k on k.id = u.id
  cross join lateral (
    select c from pg_catalog.unnest(codes) with ordinality as v(c, o)
    where pg_catalog.left(c, 5) = any(k.cpv_groups)
    order by o
    limit 1
  ) hit
  where not (title_stems && public.lt_stems(pg_catalog.array_to_string(k.code_exclude_words, ' ')))
  order by u.ord
  limit 1;
  if found then
    matched := true;
    matched_by := 'code';
    return;
  end if;

  -- A word match: the first kind whose division holds the main code and whose
  -- include words are in the title, unless the title holds an exclude word.
  select k.id, s.include_stems into kind_id, include_stems
  from pg_catalog.unnest(ids) with ordinality as u(id, ord)
  join public.kinds_of_work k on k.id = u.id
  cross join lateral (
    select public.lt_stems(pg_catalog.array_to_string(k.include_words, ' ')) as include_stems
  ) s
  where pg_catalog.left(codes[1], 2) = any(array(select pg_catalog.left(g, 2) from pg_catalog.unnest(k.cpv_groups) g))
    and title_stems && s.include_stems
    and not (title_stems && public.lt_stems(pg_catalog.array_to_string(k.exclude_words, ' ')))
  order by u.ord
  limit 1;
  if not found then
    matched := false;
    return;
  end if;

  select w into matched_on
  from pg_catalog.unnest(title_words) with ordinality as t(w, o)
  where public.lt_stems(w) && include_stems
  order by o
  limit 1;
  matched := true;
  matched_by := 'word';
end;
$$;

-- Match one notice against one Kind of work. Same arguments and answer as
-- match_kinds, for a single kind.
create function public.match_kind(
  kind_id uuid,
  title text,
  main_cpv text,
  cpv_codes text[],
  out matched boolean,
  out matched_by text,
  out matched_on text
)
language sql
stable
parallel safe
set search_path = ''
as $$
  select m.matched, m.matched_by, m.matched_on
  from public.match_kinds(array[match_kind.kind_id], match_kind.title, match_kind.main_cpv, match_kind.cpv_codes) m
$$;
