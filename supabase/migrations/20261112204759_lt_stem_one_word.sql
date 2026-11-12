-- lt_stem takes one word. Text search sorts the stems it finds, so for text of
-- several words (or a hyphenated word, which gives a stem per part) the first
-- stem was the alphabetically first one: "kelionių kelių" gave "kel". Such text
-- is now refused instead of quietly giving a wrong stem.
create or replace function public.lt_stem(word text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  stems text[] := pg_catalog.tsvector_to_array(pg_catalog.to_tsvector('pg_catalog.lithuanian', word));
begin
  if pg_catalog.cardinality(stems) > 1 then
    raise exception 'lt_stem takes one word, got "%"', word
      using errcode = 'invalid_parameter_value';
  end if;
  return stems[1];
end;
$$;
