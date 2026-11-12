-- The road Kinds of work and the hand-checked road Trade (ticket #7, spec
-- "The road Kinds of work").
--
-- The road kinds are the 5-digit CPV groups. Each stores its count and one
-- real Contract title from the pull of 11 November 2026: tendered Contracts of
-- 3,000 EUR or more signed 2025-11-11 to 2026-11-11 with a code in the group,
-- Small purchases left out (handoff-from-claude/data/market.json).
--
-- Kind 45233 has include words for the stems kel, šaligatv, žvyr, žvyrkel,
-- asfalt, trinkel, tak, stovėjim, parkavim and the exclude word apšvietim.
-- "gatv" is left out on purpose (ADR-0002). The other four match by code only.
-- The words are stored as words, not stems: both sides go through the same
-- Lithuanian stemming, and a bare stem such as "stovėjim" stems again to "stov".
--
-- The names are pending the operator's approval in the copy register
-- (src/copy/register.ts, keys kind.<group>); a test keeps the two equal.

insert into public.kinds_of_work
  (id, name, cpv_groups, include_words, exclude_words, origin, contract_count, example_title, example_contract)
values
  ('00000000-0000-4000-8000-000000045233', 'Keliai ir gatvės', array['45233'],
   array['kelias', 'šaligatvis', 'žvyras', 'žvyrkelis', 'asfaltas', 'trinkelė', 'takas', 'stovėjimas', 'parkavimas'],
   array['apšvietimas'], 'hand_checked',
   1468, 'Miežiškių sen. kelio Raguvėlė-Užuprūdžiai paprastasis remontas', '2008152295'),
  ('00000000-0000-4000-8000-000000045231', 'Vamzdynai ir kabelių linijos', array['45231'],
   '{}', '{}', 'hand_checked',
   404, 'Vandentiekio ir nuotekų šalinimo tinklų statyba Krakių mstl.', '2008189126'),
  ('00000000-0000-4000-8000-000000045232', 'Pagalbiniai vamzdynų darbai', array['45232'],
   '{}', '{}', 'hand_checked',
   308, 'Lietaus nuotakyno vamzdyno keitimas', '2008185852'),
  ('00000000-0000-4000-8000-000000045236', 'Sporto ir žaidimų aikštelės', array['45236'],
   '{}', '{}', 'hand_checked',
   94, 'Sporto aikštelių remonto darbai', '2008165051'),
  ('00000000-0000-4000-8000-000000045234', 'Geležinkeliai', array['45234'],
   '{}', '{}', 'hand_checked',
   48, 'Petrašiūnų elektrinės geležinkelio bėgių atstatymas ir remontas', '2008259824');

-- Hand-checked Trades: a named set of hand-checked Kinds of work that Setup
-- copies into a Workspace's own Trade (ticket #12). The five road kinds
-- together are the road Trade.
create table public.hand_checked_trade_kinds (
  trade text not null check (trade ~ '^[a-z]+$'),
  kind_id uuid not null references public.kinds_of_work (id),
  -- Display order within the Trade, from 1.
  position smallint not null check (position >= 1),
  primary key (trade, kind_id),
  unique (trade, position)
);

create index hand_checked_trade_kinds_kind_id_idx on public.hand_checked_trade_kinds (kind_id);

-- Public, like the hand-checked kinds it lists; no User writes it.
alter table public.hand_checked_trade_kinds enable row level security;

create policy "Hand-checked trades are public"
on public.hand_checked_trade_kinds
for select
to anon, authenticated
using (true);

revoke all on table public.hand_checked_trade_kinds from anon, authenticated;
grant select on table public.hand_checked_trade_kinds to anon, authenticated;

insert into public.hand_checked_trade_kinds (trade, kind_id, position)
values
  ('road', '00000000-0000-4000-8000-000000045233', 1),
  ('road', '00000000-0000-4000-8000-000000045231', 2),
  ('road', '00000000-0000-4000-8000-000000045232', 3),
  ('road', '00000000-0000-4000-8000-000000045236', 4),
  ('road', '00000000-0000-4000-8000-000000045234', 5);
