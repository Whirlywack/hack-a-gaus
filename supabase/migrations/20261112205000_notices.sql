-- Notices: every Notice the open-notice feed gives, one row per Notice, written only by
-- the loader (loader/, run hourly by .github/workflows/load-notices.yml). A row is updated
-- when the feed changes it and is never deleted, because a followed tender must survive
-- past its deadline. Times are UTC; the feed's own times are Vilnius time.
create table public.notices (
  id             bigint primary key,
  kind           text not null,
  title          text,
  buyer_name     text,
  published_at   timestamptz,
  deadline_at    timestamptz,
  status         text,
  cpv_main       text,
  cpv_codes      text[] not null default '{}',
  procedure_type text,
  evaluation     text,
  in_lots        boolean,
  feed_type      text,
  date_invalid   boolean not null default false,
  first_seen_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint notices_kind_check check (
    kind in ('tender', 'market_consultation', 'dps', 'dps_contract', 'qualification_system', 'unknown')
  )
);

-- A Notice is never deleted: Follows point at it after its deadline has passed. The
-- refusal holds for every role, the loader's included. To remove a row on purpose, drop
-- these triggers in a migration that says why.
create function public.notices_refuse_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'notices are never deleted (a followed tender must survive past its deadline)'
    using errcode = 'restrict_violation';
end;
$$;

create trigger notices_refuse_delete
  before delete on public.notices
  for each row execute function public.notices_refuse_delete();

create trigger notices_refuse_truncate
  before truncate on public.notices
  for each statement execute function public.notices_refuse_delete();

revoke all on function public.notices_refuse_delete() from public, anon, authenticated;

comment on table public.notices is
  'Every Notice from the open-notice feed. Written only by the loader; updated, never deleted.';
comment on column public.notices.id is
  'The feed''s record id, which is also the portal''s resourceId for the notice page.';
comment on column public.notices.kind is
  'tender (a plain Public tender), market_consultation, dps (dynamic purchasing system), dps_contract (specific contract inside a DPS), qualification_system, or unknown. Only tender and market_consultation are shown in this build.';
comment on column public.notices.title is 'The title exactly as the Buyer wrote it.';
comment on column public.notices.buyer_name is
  'The Buyer''s name as the feed gives it (caName), sometimes with a trailing "(PV)".';
comment on column public.notices.deadline_at is
  'The bid deadline; for a Market consultation, the reply date. UTC.';
comment on column public.notices.status is
  'The feed''s status as published, e.g. Bid submission, Proposal Submission, Established, Evaluation, Awarded, Cancelled.';
comment on column public.notices.cpv_main is 'The first listed CPV code, taken as the main one.';
comment on column public.notices.cpv_codes is 'Every CPV code on the Notice, in feed order.';
comment on column public.notices.procedure_type is 'The procedure as the feed names it (procedure), e.g. Open, Simplified.';
comment on column public.notices.evaluation is 'How bids are judged: Lowest Price or MEAT (best price-quality ratio).';
comment on column public.notices.in_lots is 'Whether the contract is split into lots.';
comment on column public.notices.feed_type is 'The feed''s notice type (cftInvolves), kept to show where the kind came from.';
comment on column public.notices.date_invalid is
  'The feed sent a publication date or deadline that is not a real date; that date is stored as null.';
