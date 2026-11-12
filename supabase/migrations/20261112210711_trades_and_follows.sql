-- Workspace data: Trades and Follows (ADR-0004). Copied from the old gaus
-- repo's 2001_workspace_features.sql, where profiles and the bid tracker
-- played these parts.

-- A named set of Kinds of work. A Workspace can have several; setup creates
-- the first, and nothing in this build creates another.
create table public.trades (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (pg_catalog.btrim(name) <> ''),
  created_at   timestamptz not null default now()
);
create index trades_workspace_idx on public.trades (workspace_id);

-- The Kinds of work in a Trade.
create table public.trade_kinds (
  trade_id uuid not null references public.trades (id) on delete cascade,
  kind_id  uuid not null,
  primary key (trade_id, kind_id)
);
-- For the foreign key to kinds_of_work that the follow-up below adds.
create index trade_kinds_kind_idx on public.trade_kinds (kind_id);

-- A Workspace's mark on a notice it keeps track of. One per Workspace and notice.
-- The Stage is the glossary's Watching, Preparing or Submitted (Stebiu, Rengiu,
-- Pateikiau) for a Public tender, and none for a Market consultation.
create table public.follows (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  notice_id    bigint not null,
  stage        text check (stage in ('watching', 'preparing', 'submitted')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, notice_id)
);

alter table public.trades      enable row level security;
alter table public.trade_kinds enable row level security;
alter table public.follows     enable row level security;

-- What a signed-in User may do. Visitors who are not signed in get nothing.
-- The service role gets nothing; jobs that read across Workspaces connect as
-- the database owner. Grants start from nothing, as in the workspaces
-- migration, and every grant below has a policy that keeps it to the User's
-- own Workspace.
revoke all on public.trades, public.trade_kinds, public.follows from anon, authenticated, service_role;

-- Trades and their Kinds of work: read only. Setup writes the one Trade
-- through create_first_trade below, and nothing lets a User change it after
-- (the Account overlay, #21, shows Trades read-only).
grant select on public.trades, public.trade_kinds to authenticated;

create policy trades_select on public.trades
  for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

-- trade_kinds has no workspace_id of its own, so it is scoped through its Trade.
create policy trade_kinds_select on public.trade_kinds
  for select to authenticated
  using (trade_id in (
    select t.id from public.trades t where t.workspace_id in (select private.user_workspace_ids())));

-- Follows (#18): follow a notice (insert), set its Stage (update), stop
-- following it (delete). The column grants keep a Follow on its Workspace and
-- its notice: only the Stage can change, and created_at is the database's own.
grant select, delete on public.follows to authenticated;
grant insert (workspace_id, notice_id, stage) on public.follows to authenticated;
grant update (stage) on public.follows to authenticated;

create policy follows_select on public.follows
  for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy follows_insert on public.follows
  for insert to authenticated
  with check (workspace_id in (select private.user_workspace_ids()));

create policy follows_update on public.follows
  for update to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

create policy follows_delete on public.follows
  for delete to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

-- Setup (#12) ends here: once the code is confirmed, the ticked Kinds of work
-- become the Workspace's one Trade, in a single call from the signed-in User.
-- Returns the new Trade's id. It refuses a second Trade (unique_violation) and
-- a Trade with no Kind of work.
--
-- It is the only way a User writes a Trade or its Kinds of work, so it runs as
-- its owner (security definer). It takes no Workspace: it writes only into the
-- caller's own, found from auth.uid(), so it cannot reach another one. The lock
-- on the Workspace row makes two calls at once create one Trade, not two.
create function public.create_first_trade(trade_name text, kind_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_workspace uuid;
  new_trade uuid;
begin
  select m.workspace_id into caller_workspace
  from public.workspace_members m
  where m.user_id = (select auth.uid());
  if caller_workspace is null then
    raise exception 'only a User of a Workspace can create a Trade' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(pg_catalog.cardinality(pg_catalog.array_remove(kind_ids, null)), 0) = 0 then
    raise exception 'a Trade needs a Kind of work' using errcode = 'check_violation';
  end if;

  perform 1 from public.workspaces w where w.id = caller_workspace for update;
  if exists (select 1 from public.trades t where t.workspace_id = caller_workspace) then
    raise exception 'this Workspace already has a Trade' using errcode = 'unique_violation';
  end if;

  insert into public.trades (workspace_id, name)
  values (caller_workspace, trade_name)
  returning id into new_trade;
  insert into public.trade_kinds (trade_id, kind_id)
  select distinct new_trade, k from pg_catalog.unnest(kind_ids) as k where k is not null;
  return new_trade;
end;
$$;
revoke all on function public.create_first_trade(text, uuid[]) from public, anon, service_role;
grant execute on function public.create_first_trade(text, uuid[]) to authenticated;

-- Still to come. Kinds of work (#7) and notices (#6) are being built at the same
-- time as this ticket, so their tables do not exist yet and these are left out
-- on purpose. A small follow-up adds them once all three tickets are on main:
--
-- - trade_kinds.kind_id references kinds_of_work (id), and a Trade may link
--   only to a Kind of work its Workspace can see: a hand-checked one or one
--   proposed for that Workspace, never another Workspace's. create_first_trade
--   runs as its owner and so bypasses the kinds' read rule: the check belongs
--   in the function (or a trigger on trade_kinds), not in a policy.
-- - follows.notice_id references notices (id).
-- - A Follow has a Stage only when its notice is a Public tender: a trigger,
--   since a check cannot read the notices table.
