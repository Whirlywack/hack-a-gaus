-- Workspaces and their Users (ADR-0004). Copied from the old gaus repo's
-- 1001_workspace.sql, with these changes:
--
-- - The sign-up trigger is new. The old repo added members by hand.
-- - A User belongs to one Workspace, as the glossary says, so a membership is
--   keyed by its User. Several Users can still share a Workspace later.
--   Roles and invitations are out of scope, so the old role column is gone.
-- - The old name and is_demo columns are gone. Nothing in this build names a
--   Workspace or seeds demo ones, and a name filled in at sign-up would have
--   been the e-mail address.

create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index workspace_members_workspace_idx on public.workspace_members (workspace_id);

create schema if not exists private;
-- Policies call the helper below as the querying role, which needs usage on
-- the schema. The Data API does not serve the private schema.
grant usage on schema private to authenticated;

-- The Workspaces of the signed-in User. Every workspace-data policy calls it.
-- plpgsql, not sql, so the planner cannot inline it into a policy and re-enter
-- workspace_members' own policy; security definer so it reads the membership
-- table directly.
create function private.user_workspace_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select m.workspace_id from public.workspace_members m
    where m.user_id = (select auth.uid());
end;
$$;
revoke all on function private.user_workspace_ids() from public, anon;
grant execute on function private.user_workspace_ids() to authenticated;

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;

-- A User sees the Workspace they belong to. Workspaces are created only by the
-- sign-up trigger, so there is no insert, update or delete policy.
create policy workspaces_select on public.workspaces
  for select to authenticated
  using (id in (select private.user_workspace_ids()));

-- A User sees only their own membership (no helper, so no recursion).
create policy members_select on public.workspace_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Grants start from nothing, as the old 1005 did for its internal tables. New
-- public tables are no longer exposed to the Data API by default, but the local
-- image still grants every privilege, so the two would differ without this.
-- Visitors who are not signed in get nothing. A User may only read: the sign-up
-- trigger is the only way into a Workspace. The service role gets nothing; jobs
-- that read across Workspaces connect as the database owner.
revoke all on public.workspaces, public.workspace_members from anon, authenticated, service_role;
grant select on public.workspaces, public.workspace_members to authenticated;

-- A sign-up creates one Workspace with the new User as its only User.
--
-- Supabase Auth inserts the auth.users row as supabase_auth_admin, whose
-- search_path is auth and which cannot write these tables. So the function runs
-- as its owner (security definer), with an empty search_path and qualified
-- names. It reads only the new User's id: the e-mail address is copied nowhere.
--
-- If it raised an error the sign-up would fail, so it is kept to what cannot
-- fail: it runs after the insert (so the User row exists when the membership's
-- foreign key is checked) and uses no input but the id. Errors are not
-- swallowed: a sign-up let through without a Workspace would leave a User who
-- sees nothing and has no way to make one.
create function private.create_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace uuid;
begin
  insert into public.workspaces default values returning id into new_workspace;
  insert into public.workspace_members (user_id, workspace_id) values (new.id, new_workspace);
  return new;
end;
$$;
revoke all on function private.create_workspace_for_new_user() from public, anon, authenticated;

create trigger create_workspace_after_sign_up
  after insert on auth.users
  for each row execute function private.create_workspace_for_new_user();

-- Users who signed up before the trigger existed get their Workspace here.
do $$
declare
  existing_user uuid;
  new_workspace uuid;
begin
  for existing_user in select id from auth.users loop
    insert into public.workspaces default values returning id into new_workspace;
    insert into public.workspace_members (user_id, workspace_id) values (existing_user, new_workspace);
  end loop;
end $$;
