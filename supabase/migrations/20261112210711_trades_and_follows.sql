-- Workspace data: Trades and Follows (ADR-0004). Copied from the old gaus
-- repo's 2001_workspace_features.sql, where profiles and the bid tracker
-- played these parts.

-- A named set of Kinds of work. A Workspace can have several.
create table public.trades (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
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

-- Trades and Follows: workspace-scoped, one policy per operation.
do $$
declare t text;
begin
  foreach t in array array['trades', 'follows'] loop
    execute format($p$create policy %I on public.%I for select to authenticated
      using (workspace_id in (select private.user_workspace_ids()));$p$, t || '_sel', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (workspace_id in (select private.user_workspace_ids()));$p$, t || '_ins', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (workspace_id in (select private.user_workspace_ids()))
      with check (workspace_id in (select private.user_workspace_ids()));$p$, t || '_upd', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (workspace_id in (select private.user_workspace_ids()));$p$, t || '_del', t);
  end loop;
end $$;

-- trade_kinds has no workspace_id of its own, so one policy scopes every
-- operation through its Trade's Workspace, as the old profile_cpv did.
create policy trade_kinds_all on public.trade_kinds for all to authenticated
  using (trade_id in (select id from public.trades where workspace_id in (select private.user_workspace_ids())))
  with check (trade_id in (select id from public.trades where workspace_id in (select private.user_workspace_ids())));

-- Grants start from nothing, as in the workspaces migration. Visitors who are
-- not signed in get nothing. A User may change only a Trade's name and a
-- Follow's Stage, so no row can be moved to another Workspace or notice.
revoke all on public.trades, public.trade_kinds, public.follows from anon, authenticated, service_role;
grant select, insert, delete on public.trades, public.trade_kinds, public.follows to authenticated;
grant update (name) on public.trades to authenticated;
grant update (stage) on public.follows to authenticated;

-- Still to come. Kinds of work (#7) and notices (#6) are being built at the same
-- time as this ticket, so their tables do not exist yet and these are left out
-- on purpose. A small follow-up adds them once all three tickets are on main:
--
-- - trade_kinds.kind_id references kinds_of_work (id), and a Trade may link
--   only to a Kind of work its Workspace can see: a shared one or one proposed
--   for that Workspace, never another Workspace's.
-- - follows.notice_id references notices (id).
-- - A Follow has a Stage only when its notice is a Public tender: a trigger,
--   since a check cannot read the notices table.
