-- The acceptance ledger, and the two things a player is entitled to do with their
-- own data: take it away with them, and take it out of the game entirely.
--
-- Why any of this is in Postgres rather than in the browser: an acceptance is only
-- worth having if it can be *shown* later. GDPR art. 5(2) and art. 7(1) put the
-- burden of demonstrating it on the controller, and a flag in the player's own
-- localStorage demonstrates nothing — it is written by the party that would have
-- to be believed. So the ledger is server-side, append-only from the client's point
-- of view, and keyed to the account rather than to the device.
--
-- It records the *version* of each document as well as its id. "They accepted the
-- terms" is not a record; "they accepted the terms as they stood on 2026-07-31" is,
-- and it is the only form that survives the terms being rewritten. Versions live in
-- @3xl/shared's types/legal.type.ts (LEGAL_VERSIONS) and are the same strings the
-- reader sees at the head of the document.
--
-- Nothing else about the moment is kept — no IP address, no user agent. Those would
-- be personal data collected for no purpose the game has: what has to be provable is
-- which text was on screen and when it was agreed to, and both of those are here.
-- Collecting more "for the record" is the failure art. 5(1)(c) is about.
--
-- @3xl/backend creates these objects automatically alongside the other tables (see
-- ../src/routes/show-templates.ts), so you normally do NOT need to run this file —
-- it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- Every acceptance ever made, not the latest one. A player who accepted the terms
-- of 2026-07-31 and then the terms of 2027-03-02 has two rows, and the first is
-- still the answer to "what did they agree to when they signed up" — which is the
-- question that gets asked. The primary key is the triple, so re-ticking a box for
-- a version already accepted is a no-op rather than a second row.
create table if not exists public.legal_acceptances (
	user_id uuid not null references auth.users (id) on delete cascade,
	-- One of the ids in LegalDocumentId. Constrained here as well as in TypeScript
	-- because this table is the record and a typo'd id is a record of nothing.
	document text not null check (document in ('terms', 'privacy', 'cookies', 'attributions')),
	-- The version string as it stood on screen, e.g. '2026-07-31'.
	version text not null check (char_length(version) between 1 and 32),
	-- Whether, in the same act, they said they were old enough to play (see
	-- MINIMUM_AGE — sixteen, the strictest floor GDPR art. 8 lets a member state
	-- set, which is also comfortably over COPPA's thirteen). It sits on the
	-- acceptance rather than in a table of its own because it is not a separate
	-- event: the boxes are ticked together, and the attestation is only meaningful
	-- as of the moment the rest of it was agreed to.
	age_confirmed boolean not null default false,
	accepted_at timestamptz not null default now(),
	primary key (user_id, document, version)
);

create index if not exists legal_acceptances_user_idx
	on public.legal_acceptances (user_id, accepted_at desc);

-- Row-level security: a player may read their own acceptances — the settings sheet
-- shows them what they have agreed to and when — and may write none of them. The
-- only writer is the security-definer RPC below, so the ledger cannot be
-- back-dated, and a row cannot be deleted by the account it would be evidence
-- about. Retention is the account's: the cascade above takes the ledger with the
-- user when they erase themselves, which is right, because after erasure there is
-- no longer a data subject for it to be evidence about.
alter table public.legal_acceptances enable row level security;

drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own on public.legal_acceptances
	for select using (auth.uid() = user_id);

-- Record the caller's acceptance of one or more documents at named versions.
--
-- Takes the whole set in one call, as a {document: version} object, because that
-- is how it is ticked: the gate asks for the terms and the privacy notice together
-- and either both land or neither does. A partial acceptance would leave a player
-- half through a gate that will simply ask again.
--
-- security definer, like every other write in this schema, because the table takes
-- no client writes at all. What it enforces is that the row is the caller's own and
-- that the timestamp is the server's — the two things a browser must not be able to
-- choose about its own evidence.
create or replace function public.record_legal_acceptance(
	p_documents jsonb,
	p_age_confirmed boolean default false
)
returns setof public.legal_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_doc text;
	v_version text;
begin
	if v_uid is null then
		raise exception 'You must be signed in to record an acceptance.';
	end if;
	if p_documents is null or jsonb_typeof(p_documents) <> 'object' then
		raise exception 'A set of documents and versions is required.' using errcode = '22023';
	end if;

	for v_doc, v_version in select key, value #>> '{}' from jsonb_each(p_documents) loop
		if v_doc not in ('terms', 'privacy', 'cookies', 'attributions') then
			raise exception 'Unknown document: %', v_doc using errcode = '22023';
		end if;
		if v_version is null or btrim(v_version) = '' then
			raise exception 'A version is required for %', v_doc using errcode = '22023';
		end if;
		insert into public.legal_acceptances (user_id, document, version, age_confirmed)
			values (v_uid, v_doc, btrim(v_version), coalesce(p_age_confirmed, false))
			on conflict (user_id, document, version) do update
				-- Re-ticking an already-accepted version changes nothing except that
				-- an age attestation, once made, stays made.
				set age_confirmed = public.legal_acceptances.age_confirmed
					or coalesce(excluded.age_confirmed, false);
	end loop;

	return query
		select * from public.legal_acceptances a
		where a.user_id = v_uid
		order by a.accepted_at;
end;
$$;

grant execute on function public.record_legal_acceptance(jsonb, boolean) to authenticated;

-- Everything the game holds about the caller, in one JSON document.
--
-- This is GDPR art. 15 (a copy of the personal data) and art. 20 (in a structured,
-- commonly used, machine-readable format) answered in one place, and it is also the
-- CCPA "right to know". It is a function rather than a dozen client-side selects for
-- two reasons: several of these tables are readable only through views or not at all
-- under RLS, and a right of access has to answer for the *whole* of what is held,
-- which is a fact about the schema and belongs where the schema is.
--
-- It reaches into auth.users for the identity itself — the address the account signs
-- in with, when it was created, when it was last used — because that is personal data
-- the game holds and would otherwise be the one part of the answer that is missing.
-- Only the caller's own row, and only the fields that are theirs: no password hash
-- (there is none — sign-in is OAuth), no internal tokens.
--
-- What is deliberately NOT here: other players. A town the caller took names its
-- previous holder, a leaderboard names everyone; none of that is the caller's
-- personal data and a subject access request is not a way to read somebody else's.
create or replace function public.export_player_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_out jsonb;
begin
	if v_uid is null then
		raise exception 'You must be signed in to export your data.';
	end if;

	select jsonb_build_object(
		'exported_at', now(),
		'account', (
			select jsonb_build_object(
				'id', u.id,
				'email', u.email,
				'created_at', u.created_at,
				'last_sign_in_at', u.last_sign_in_at,
				'providers', u.raw_app_meta_data -> 'providers'
			)
			from auth.users u where u.id = v_uid
		),
		'profile', (
			select to_jsonb(p) from public.player_profiles p where p.user_id = v_uid
		),
		'legal_acceptances', coalesce((
			select jsonb_agg(to_jsonb(a) order by a.accepted_at)
			from public.legal_acceptances a where a.user_id = v_uid
		), '[]'::jsonb),
		'cards', coalesce((
			select jsonb_agg(to_jsonb(s) order by s.id)
			from public.character_spawns s where s.user_id = v_uid
		), '[]'::jsonb),
		'avatars', coalesce((
			select jsonb_agg(to_jsonb(av) order by av.granted_at)
			from public.player_avatars av where av.user_id = v_uid
		), '[]'::jsonb),
		'booster_claims', coalesce((
			select jsonb_agg(to_jsonb(bc) order by bc.claimed_at)
			from public.booster_claims bc where bc.user_id = v_uid
		), '[]'::jsonb),
		'booster_grants', coalesce((
			select jsonb_agg(to_jsonb(bg) order by bg.grant_date)
			from public.booster_grants bg where bg.user_id = v_uid
		), '[]'::jsonb),
		'combat_results', coalesce((
			select jsonb_agg(to_jsonb(cr) order by cr.fought_at)
			from public.combat_results cr where cr.user_id = v_uid
		), '[]'::jsonb),
		'battle', (
			select to_jsonb(b) from public.battles b where b.user_id = v_uid
		),
		'towns_held', coalesce((
			select jsonb_agg(to_jsonb(h) order by h.taken_at)
			from public.municipality_holders h where h.user_id = v_uid
		), '[]'::jsonb),
		'sieges', coalesce((
			select jsonb_agg(to_jsonb(si))
			from public.municipality_sieges si where si.user_id = v_uid
		), '[]'::jsonb),
		'challenges', coalesce((
			select jsonb_agg(to_jsonb(ch) order by ch.started_at)
			from public.municipality_challenges ch where ch.user_id = v_uid
		), '[]'::jsonb)
	) into v_out;

	return v_out;
end;
$$;

grant execute on function public.export_player_data() to authenticated;

-- Erase the caller's account and everything hanging off it — GDPR art. 17, and the
-- deletion right every US state privacy law has a version of.
--
-- One delete: every player-owned table in this schema references auth.users with
-- `on delete cascade`, so removing the user removes the profile, the cards, the
-- avatars, the badges, the fights, the boosters, the open battle, the sieges and the
-- ledger above. Towns the player held go with it too, which is the right outcome —
-- an erased account cannot go on occupying a municipality, and the town simply
-- becomes unheld for the next challenger.
--
-- It is genuinely a delete rather than a flag. There is no legal basis for keeping a
-- free game's play history against the wishes of the person it is about, and nothing
-- here is under a statutory retention duty: no payments are taken, so no invoice has
-- to be kept.
--
-- security definer because auth.users belongs to the auth schema and no client role
-- may touch it. The function's whole rule is `id = auth.uid()`: it takes no argument,
-- so there is no other account it could be pointed at.
create or replace function public.delete_player_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
begin
	if v_uid is null then
		raise exception 'You must be signed in to delete your account.';
	end if;
	delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_player_account() to authenticated;
