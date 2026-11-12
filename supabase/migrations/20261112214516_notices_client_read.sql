-- What a client role (anon, authenticated, service_role) may read of public.notices.
-- Security review of ticket #6. 20261112205000_notices.sql is already applied to the
-- hosted database, so the change is made here.

-- Columns: a grant per column, not on the table, so a column added later (a raw feed
-- record, a contact field) stays unreadable until a migration grants it on purpose. The
-- table holds no contact details today: the stored text is the title, the Buyer's name
-- and code, and coded values; the feed's free-text description is not stored, and the
-- value on a Notice lives in loader.notice_values, which no client role can read.
-- Every current column is granted, because public.notice_is_open(n) and the Data API's
-- select=* read the whole row, which needs every column.
revoke select on public.notices from anon, authenticated, service_role;
grant select (
  id, kind, title, buyer_name, buyer_code, published_at, deadline_at, status,
  cpv_main, cpv_codes, procedure_type, evaluation, in_lots, feed_type, date_invalid,
  first_seen_at, updated_at
) on public.notices to anon, authenticated, service_role;

-- Rows: only the kinds shown in this build, a Public tender ('tender') and a Market
-- consultation. The other kinds are stored and never shown, and some of them
-- (framework_contract, invitation_only) are notices a general supplier cannot bid on,
-- so no screen, Data API call or MCP tool may return one, whatever filter it forgets.
-- A notice past its deadline stays readable: a followed tender must survive it.
-- service_role bypasses row-level security and still reads every kind (server-side).
drop policy "Notices are readable by everyone" on public.notices;
create policy "Shown kinds of Notice are readable by everyone"
  on public.notices for select
  to anon, authenticated
  using (kind in ('tender', 'market_consultation'));
