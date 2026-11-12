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

-- Screens ask for the open Notices of one kind (tenders, Market consultations); about
-- 2,000 of the feed's ~83,000 are open at a time.
create index notices_kind_deadline_idx on public.notices (kind, deadline_at);

-- Whether a Notice is open: its deadline (or reply date) is still ahead, and its status
-- is not one the feed uses for a Notice that no longer takes bids or replies. A status
-- the loader has not seen counts as open, so a renamed status cannot empty the feed;
-- the deadline still bounds it. Statuses seen in the feed, 12 November 2026: open are
-- Bid submission (tenders), Proposal Submission (consultations), Established (DPS).
-- Usable from the Data API as a computed field: notices?select=*,notice_is_open
create function public.notice_is_open(n public.notices)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(n.deadline_at > pg_catalog.now(), false)
    and (n.status is null or n.status <> all (array[
      'Evaluation', 'Awaiting bid opening', 'Proposal Submission Closed',
      'Awarded', 'Concluded', 'Closed', 'Cancelled', 'Terminated'
    ]))
$$;
comment on function public.notice_is_open(public.notices) is
  'A Notice is open while its deadline or reply date is ahead and its status is not a closed one.';

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

-- The loader's own records live in their own schema, which the Data API does not expose
-- and which no client role can use.
create schema if not exists loader;
comment on schema loader is 'The notice loader''s own records. Not exposed through the Data API.';

-- One row per walk that finished: the freshness record. A walk that is refused (stale
-- tail, malformed feed, runaway) writes nothing here, so the newest row is always the
-- last good walk.
create table loader.walks (
  id                  bigint generated always as identity primary key,
  started_at          timestamptz not null,
  finished_at         timestamptz not null default now(),
  records             integer not null,
  skipped             integer not null,
  holes               integer[] not null default '{}',
  newest_published_at timestamptz
);
comment on table loader.walks is 'Every finished walk of the feed. The newest row says how fresh public.notices is.';
comment on column loader.walks.records is 'Records stored or confirmed in this walk.';
comment on column loader.walks.skipped is 'Records skipped for a missing or non-numeric id.';
comment on column loader.walks.holes is 'Pages still empty after one re-fetch, inside a run of later pages with data.';

-- The value on a Notice is stored but shown nowhere: it was filled on 8 of 15 test
-- notices and misleading on 2. It lives here, out of reach of every client role, so no
-- screen, API call or assistant can show it by accident.
create table loader.notice_values (
  notice_id       bigint primary key references public.notices (id),
  estimated_value numeric
);
comment on table loader.notice_values is
  'The estimated value on each Notice, in EUR, null when not stated. Stored, never shown.';

revoke all on loader.walks, loader.notice_values from public, anon, authenticated, service_role;

-- Notices are public procurement data: anyone may read them, and only the loader, which
-- connects as the tables' owner, writes them. The Data API roles get read access and
-- nothing else (TRUNCATE is not covered by row-level security, so it is revoked too).
alter table public.notices enable row level security;

create policy "Notices are readable by everyone"
  on public.notices for select
  to anon, authenticated
  using (true);

revoke all on public.notices from public, anon, authenticated, service_role;
grant select on public.notices to anon, authenticated, service_role;

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
