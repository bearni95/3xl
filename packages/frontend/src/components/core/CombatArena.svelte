<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import MugenBoard from '$components/core/MugenBoard.svelte';
	import Icon from '$components/core/Icon.svelte';
	import { cellScreenY, combatColorHex } from '$utils/mugen/mugen-board';
	import type {
		BoardCharacter,
		BoardGrid,
		MugenBoard as MugenBoardEngine,
		PlacedCharacter
	} from '$utils/mugen/mugen-board';
	import type { Hex } from '$utils/mugen/hex';
	import type { Manifest } from '$utils/mugen/mugen-player';
	import {
		actionLabel,
		CombatController,
		COMBAT_ACTIONS,
		MAX_CHARGES,
		RIVAL_RANKS,
		type CombatAction,
		type CombatState,
		type FighterView,
		type FighterSeed
	} from '$services/combat.controller';
	import type { CombatReport, CombatReward, TerritoryResult } from '$types/combat.type';
	import {
		COMPOUND_COLORS,
		DEFAULT_COLOR,
		type CharacterDefinition,
		type CharacterMove,
		type CombatColor
	} from '$types/character-definition.type';
	import { characters as availableCharacters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { rosterModalOpen } from '$services/rosterModal';
	import { spawnService } from '$services/spawn.service';
	import { teamService, TEAM_SIZE, type Team } from '$services/team.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import { DEFAULT_SPAWN_STAT, SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
	import { combatStatsFromStat } from '$utils/spawn/stat';

	// The opponent's team when this is a challenge: synthetic OG spawns (see
	// `ogTeamSpawns`). When a full team (TEAM_SIZE) is supplied the red (CPU) side
	// fields it; otherwise the CPU mirrors the player's own team (the classic match).
	export let ogTeam: CharacterSpawn[] = [];
	// The challenged town's name, shown in the header. Null outside a challenge.
	export let ogName: string | null = null;
	// The challenged town's geojson feature id, when there is territory at stake.
	// Reported with the fight so a win banks a siege win against the town's sitting
	// team; null for a fight that decides nothing on the map.
	export let ogLocationId: string | null = null;
	// The town's turnover as the map saw it when the fight opened — 0 for a town
	// still on its seeded OG team. Reported so the server can tell a win against the
	// sitting team from one against a team that has since been replaced.
	export let ogTurnover = 0;
	// Who occupies the town right now, shown in the header. Null while it is still on
	// its seeded OG team.
	export let ogHolderName: string | null = null;
	// When true the arena renders a close control to walk out of a fight in progress
	// (used when hosted in a modal, e.g. the map page). `close` is dispatched either
	// way — a decided fight closes itself.
	export let closable = false;

	// `territory` fires once the server has settled what a finished fight did to the
	// town, so the host (the map) can reload the occupancy it is drawing.
	const dispatch = createEventDispatcher<{ close: void; territory: TerritoryResult }>();
	function close(): void {
		dispatch('close');
	}

	// The glyph each order is given, from the game-icons.net set in @3xl/assets:
	// energy gathering to charge, a sword to shoot, a shield to defend.
	const ACTION_ICONS: Record<CombatAction, string> = {
		charge: 'lorc/rolling-energy',
		shoot: 'lorc/broadsword',
		defend: 'lorc/bordered-shield'
	};

	const characterById = new Map(availableCharacters.map((option) => [option.id, option]));

	// The blue side is the player's active team; the red side (the CPU) either mirrors
	// it or, in a challenge, fields the supplied OG team. Both draw from the roster's
	// active team — there is no in-board picker.
	const authStatus = authService.status;
	const profile = authService.profile;
	const teamStore = teamService.store;
	const spawns = spawnService.spawns;

	// The signed-in player, or null. Colours (and the team's characters) come from
	// this player's Supabase spawns, so playing requires being signed in.
	$: currentUserId = $authStatus === AuthStatus.SignedIn && $profile ? String($profile.id) : null;

	// The active team, and whether it's ready to play (all TEAM_SIZE slots filled).
	$: activeTeam = $teamStore.teams.find((team: Team) => team.id === $teamStore.activeTeamId) ?? null;
	$: teamMembers = (activeTeam?.memberIds ?? []).filter((id): id is string => Boolean(id));
	$: teamReady = teamMembers.length === TEAM_SIZE;
	$: playable = !!currentUserId && teamReady;

	// A full OG team means the red side fields it instead of mirroring the player's.
	$: challengeReady = ogTeam.length === TEAM_SIZE;

	// character id → rarity tier from Supabase `character_templates`, character id →
	// its related show names, and geojson feature id → municipality name — the same
	// three sources the roster/claim cards read, so the cards drawn outside the board
	// grid show their rarity badge, show and claim place (not just name and stats).
	let rarityByCharacter = new Map<string, number>();
	let showNamesByCharacter = new Map<string, string[]>();
	let municipalityNames: Map<string, string> | null = null;

	// Load the player's spawns once signed in, so their rolled colours are available.
	// Rarities, show names and place names load alongside, so the outside-grid cards
	// can show them.
	let loadedForUser: string | null = null;
	let spawnsLoaded = false;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		spawnsLoaded = false;
		void spawnService.loadSpawns(currentUserId).then(() => (spawnsLoaded = true));
		void spawnService.loadRarities().then((rarities) => (rarityByCharacter = rarities));
		void spawnService.loadCharacterShowNames().then((names) => (showNamesByCharacter = names));
		void loadMunicipalityNames();
	}

	// Resolve geojson feature ids to municipality names for the cards' place labels.
	// Optional — a missing/failed layer just falls back to the Ultramar sentinel.
	async function loadMunicipalityNames(): Promise<void> {
		try {
			const response = await fetch('/data/geo/municipis.json');
			const municipalities = (await response.json()) as GeoJSON.FeatureCollection;
			municipalityNames = locationAdapter.municipalityNames(municipalities);
		} catch {
			municipalityNames = null;
		}
	}

	// A spawn's claim place, resolved from its geojson location id (the Ultramar
	// sentinel and any unresolved id read as Ultramar) — mirrors the roster.
	function locationNameFor(id: string | null | undefined): string {
		if (id && id !== ULTRAMAR_ID) {
			const name = municipalityNames?.get(id);
			if (name) return name;
		}
		return ULTRAMAR.municipality;
	}

	// Every fieldable spawn by id: the player's own claimed spawns plus (in a
	// challenge) the synthetic OG spawns, so both sides' slots resolve here.
	$: spawnById = new Map(
		([...$spawns, ...ogTeam] as CharacterSpawn[]).map((spawn) => [spawn.id, spawn])
	);

	// Slots 0–2 are the red (CPU) grid, 3–5 the blue (player) grid. In a challenge the
	// red side fields the town's OG team; otherwise the CPU mirrors the player's team.
	$: slots = playable
		? challengeReady
			? [...ogTeam.map((spawn) => spawn.id), ...teamMembers]
			: [...teamMembers, ...teamMembers]
		: [];

	// Where each side stands, listed top→bottom on screen — which is also the
	// left→right order the board draws that side's cards in, and therefore the order
	// the fighters are seeded and shown in. The rivals open on the board's central
	// column (the ground the controller walks them back off, rank by rank, as they
	// fall); the player's team holds the far column of its own half, facing them.
	const RIVAL_CELLS: Hex[] = RIVAL_RANKS[0];
	const PLAYER_CELLS: Hex[] = [
		{ q: 2, r: -4 },
		{ q: 2, r: -3 },
		{ q: 2, r: -2 }
	];

	// The two sides can field the SAME spawn line-up (a mirror match), so a bare spawn
	// id is not unique across the board. Every board actor / fighter is identified by a
	// per-side instance id (`error:<spawnId>`); the underlying spawn (for its assets,
	// definition, colour and stat) is recovered via spawnById. Without this, id lookups
	// (board actors, the combat controller) collide between the two sides and combat
	// never starts.
	function instanceId(side: 'error' | 'info', spawnId: string): string {
		return `${side}:${spawnId}`;
	}

	function spawnIdOf(id: string): string {
		return id.slice(id.indexOf(':') + 1);
	}

	function characterIdOf(basePath: string): string {
		const segments = basePath.split('/').filter(Boolean);
		return segments[segments.length - 2] ?? segments[segments.length - 1] ?? '';
	}

	function boardCharacter(
		spawnId: string,
		side: 'error' | 'info',
		spawns: Map<string, CharacterSpawn>,
		rarities: Map<string, number>,
		showNames: Map<string, string[]>,
		names: Map<string, string> | null
	): BoardCharacter {
		const spawn = spawns.get(spawnId);
		const option = (spawn && characterById.get(spawn.characterId)) ?? availableCharacters[0];
		const stat = spawn?.stat ?? DEFAULT_SPAWN_STAT;
		return {
			id: instanceId(side, spawnId),
			basePath: option.basePath,
			animation: 'idle',
			// The spawn's rolled colour fills this fighter's charge meter on the board.
			combatColor: spawn?.color,
			// The display card drawn outside the grid (rival above, player below): the
			// idle art loads from basePath, and the attributes mirror the board's
			// derivation from the rolled stat. Rarity, show and claim place come from the
			// same three Supabase/geo sources the roster and claim cards read
			// (`showNames`/`names` are passed so the reactive build re-runs — and the
			// board remounts — once those layers load).
			card: {
				label: option.label,
				basePath: option.basePath,
				faceUrl: null,
				color: spawn?.color ?? SpawnColor.Red,
				rarity: spawn ? (rarities.get(spawn.characterId) ?? null) : null,
				showName: spawn ? (showNames.get(spawn.characterId)?.join(', ') || null) : null,
				locationName: spawn ? locationNameFor(spawn.locationId) : null,
				spawnedAt: spawn?.createdAt ?? null,
				...combatStatsFromStat(stat)
			}
		};
	}

	// Each side's hexes take the colour of that side's leader — the team's first slot
	// (ids[0] on the left, ids[3] on the right). Falls back to the classic red/blue if
	// the leader has no rolled colour yet.
	function leaderColorHex(
		leaderId: string,
		spawns: Map<string, CharacterSpawn>,
		fallback: number
	): number {
		const color = spawns.get(leaderId)?.color;
		return color ? combatColorHex(color) : fallback;
	}

	// Left: the rival line on the central column; right: the player's team on the far
	// column of its own half. Each side's first slot leads (it is the grid's own
	// character, the rest are extras) and stands on the topmost cell, so team order and
	// the board's left→right card order are one and the same. Rebuilt whenever a slot
	// or a spawn changes. `spawns` is passed in explicitly so Svelte's legacy reactive
	// tracking sees the spawn map as a dependency of `grids`.
	function buildGrids(
		ids: string[],
		spawns: Map<string, CharacterSpawn>,
		rarities: Map<string, number>,
		showNames: Map<string, string[]>,
		names: Map<string, string> | null
	): [BoardGrid, BoardGrid] {
		const half = (side: 'error' | 'info', offset: number, cells: Hex[], fallback: number) => ({
			color: leaderColorHex(ids[offset], spawns, fallback),
			character: {
				...boardCharacter(ids[offset], side, spawns, rarities, showNames, names),
				...cells[0]
			},
			extras: cells.slice(1).map((cell, i) => ({
				...boardCharacter(ids[offset + 1 + i], side, spawns, rarities, showNames, names),
				...cell
			}))
		});
		return [
			half('error', 0, RIVAL_CELLS, 0xff0000),
			half('info', 3, PLAYER_CELLS, 0x2563eb)
		];
	}

	$: grids = buildGrids(slots, spawnById, rarityByCharacter, showNamesByCharacter, municipalityNames);
	// Remounts the Pixi board (and thus repositions everyone) on any slot change,
	// spawn-colour change (so home cells repaint once colours load), spawn-stat change
	// (so the outside-grid cards repaint), or rarity/show/place load (so the cards gain
	// their badge, show and location once those sources resolve). A finished fight
	// never restarts in place — the arena closes — so there is nothing else to key on.
	$: boardKey = `${slots.join(',')}:${slots
		.map((id) => `${spawnById.get(id)?.color ?? ''}/${spawnById.get(id)?.stat ?? ''}`)
		.join(
			','
		)}:${rarityByCharacter.size}:${showNamesByCharacter.size}:${municipalityNames?.size ?? 0}`;

	// One badge per character on the board, in board order (red half then blue).
	// Static display info (name, face, colour, moves); the live combat state (charges,
	// orders, who is down) lives in the CombatController store.
	interface Badge {
		id: string;
		basePath: string;
		side: 'error' | 'info';
		name: string;
		face: string | null;
		/** The moves this character's JSON definition declares, in declared order. */
		moves: CharacterMove[];
		/** The character's combat color — its Supabase spawn colour, and the whole of
		 * what it does differently in a fight. */
		color: CombatColor;
		/** The character's Supabase spawn gameplay stat (1..10). */
		stat: number;
		/**
		 * Top→bottom screen position of the character's cell on the canvas (arbitrary
		 * units that increase downward; only the ordering matters). Used to lay the
		 * cards out left→right in the order the characters stand top-of-board first,
		 * matching the canvas card band.
		 */
		gridY: number;
	}

	// One side's characters in line-up order: sorted by where they stand top→bottom on
	// the board, which is exactly the left→right order the canvas draws that side's
	// cards in. The controller is seeded in this order, and it is the order the rivals
	// hold their ranks in as they are pushed back — so keep the sort here in step with
	// the board's own card ordering (`collectCards`).
	function rosterFor(
		characters: PlacedCharacter[],
		side: 'error' | 'info'
	): Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] {
		return characters
			.map((c) => ({
				id: c.id as string,
				basePath: c.basePath,
				side,
				// Vertical on-screen position of the cell, so the cards can be laid out
				// left→right in the order the characters stand top-of-board first.
				gridY: cellScreenY(c.q, c.r)
			}))
			.sort((a, b) => a.gridY - b.gridY);
	}

	let badges: Badge[] = [];
	let board: MugenBoardEngine | null = null;
	let controller: CombatController | null = null;
	let state: CombatState | null = null;
	let unsubscribe: (() => void) | null = null;

	// Live combat state keyed by fighter id, for quick lookup while rendering.
	$: combatById = new Map((state?.fighters ?? []).map((fighter) => [fighter.id, fighter]));

	// Each side's badges, laid out left-to-right by where the characters stand
	// top→bottom on the board (highest-on-canvas first). `badges` is referenced
	// directly so Svelte's legacy reactive tracking sees it as a dependency of
	// `lineups`.
	$: lineups = [orderByCell('error', badges), orderByCell('info', badges)];

	function orderByCell(side: 'error' | 'info', list: Badge[]): Badge[] {
		return list.filter((badge) => badge.side === side).sort((a, b) => a.gridY - b.gridY);
	}

	function onBoardReady(engine: MugenBoardEngine): void {
		board = engine;
		controller?.attachBoard(engine);
	}

	// Bumped on every setup() call so a stale in-flight load can't clobber a
	// newer roster after the line-up changes mid-fetch.
	let setupToken = 0;

	// (Re)build the fight from the current slots: load each participant's manifest and
	// definition and hand a fresh CombatController the fighters. Runs whenever the
	// playable line-up changes.
	async function setup(): Promise<void> {
		const token = ++setupToken;
		const currentGrids = buildGrids(
			slots,
			spawnById,
			rarityByCharacter,
			showNamesByCharacter,
			municipalityNames
		);
		const roster: Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] = [
			...rosterFor(
				[currentGrids[0].character as PlacedCharacter, ...(currentGrids[0].extras ?? [])],
				'error'
			),
			...rosterFor(
				[currentGrids[1].character as PlacedCharacter, ...(currentGrids[1].extras ?? [])],
				'info'
			)
		];

		const loaded = await Promise.all(
			roster.map(async (entry) => {
				// `entry.id` is the per-side instance id (`error:<spawnId>`); recover the
				// spawn (its rolled colour and stat) and the character id (which keys the
				// definition JSON) from it, falling back to the basePath-derived id.
				const spawn = spawnById.get(spawnIdOf(entry.id));
				const characterId = spawn?.characterId ?? characterIdOf(entry.basePath);
				const [manifestRes, defRes] = await Promise.all([
					fetch(`${entry.basePath}/manifest.json`),
					fetch(`/data/characters/${characterId}/definition.json`)
				]);
				const manifest: Manifest = await manifestRes.json();
				const definition: Partial<CharacterDefinition> = defRes.ok ? await defRes.json() : {};
				// Combat colour comes from the spawn; only if a slot somehow has no spawn
				// colour do we fall back to the definition's compound colour (or DEFAULT_COLOR).
				const color: CombatColor =
					(spawn?.color as CombatColor) ??
					(COMPOUND_COLORS.includes(definition.color!) ? definition.color! : DEFAULT_COLOR);
				// Face: the portrait the definition picked in /admin/characters, else
				// the manifest's default. Both resolve to a file under the char's frames.
				// Gameplay stat comes from the spawn; a slot with no spawn stat reads as
				// the default (like legacy spawns).
				const stat: number = spawn?.stat ?? DEFAULT_SPAWN_STAT;
				const faceFile = definition.face || manifest.face?.file || null;
				return {
					...entry,
					name: manifest.name,
					face: faceFile ? `${entry.basePath}/${faceFile}` : null,
					moves: definition.moves ?? [],
					color,
					stat
				};
			})
		);
		if (token !== setupToken) return;

		badges = loaded;

		// Hand the fighters to the combat controller and wire its store. Nothing but the
		// colour changes how a fighter plays; the rolled stat only supplies the order a
		// turn's bullets land in (SPD) and the HP pool a survivor is reported to have
		// come through whole, which is what the experience award is weighed by.
		const seeds: FighterSeed[] = badges.map((badge) => {
			const { spd, hp } = combatStatsFromStat(badge.stat);
			return {
				id: badge.id,
				// The spawn behind the instance id, so a won fight can be reported for
				// experience against the actual `character_spawns` rows fielded.
				spawnId: spawnIdOf(badge.id),
				name: badge.name,
				side: badge.side,
				color: badge.color,
				moves: badge.moves,
				spd,
				hpPool: hp
			};
		});
		unsubscribe?.();
		controller = new CombatController(seeds);
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
	}

	// The controller whose result has already been reported, so the award fires
	// exactly once per game.
	let reportedFor: CombatController | null = null;

	// Report the fight the moment it is decided. Both `state` and `controller` are
	// named here so Svelte's legacy reactive tracking sees them as dependencies.
	$: void reportOutcome(state, controller);

	// The player's fighters back in the order the team was built — slots 3–5, i.e. the
	// roster's team order. The line-up the controller hands over is the board's
	// top→bottom order, which the placement above keeps in step with the team's; this
	// pins that down, because a captured town freezes the reported line-up verbatim as
	// its garrison and the map's panel then draws the town's team from it.
	function inTeamOrder(fighters: CombatReport['fighters']): CombatReport['fighters'] {
		const fielded = slots.slice(TEAM_SIZE);
		if (fielded.length === 0) return fighters;
		const rank = new Map(fielded.map((spawnId, index) => [spawnId, index]));
		return [...fighters].sort(
			(a, b) => (rank.get(a.spawnId) ?? fielded.length) - (rank.get(b.spawnId) ?? fielded.length)
		);
	}

	// A decided fight is over: report it, then leave. There is nothing left to play
	// on the board, so the arena closes itself rather than putting a dialog over it.
	// The close waits on the report so the host still gets the `territory` event —
	// that is what redraws the town — and a report that fails closes just the same:
	// the server is the ledger, and it simply banked nothing.
	async function reportOutcome(
		current: CombatState | null,
		ctrl: CombatController | null
	): Promise<void> {
		if (!current?.outcome || !ctrl || reportedFor === ctrl) return;
		reportedFor = ctrl;
		const report = ctrl.report();
		if (report) {
			try {
				// The amount — and whether the town changed hands — are the server's to
				// decide; this only states what happened and which town it happened over.
				const reward: CombatReward | null = await authService.reportCombat({
					...report,
					fighters: inTeamOrder(report.fighters),
					locationId: ogLocationId,
					holderTurnover: ogTurnover
				});
				// Let the host redraw the town: a capture rewrites its team and its
				// turnover, and even a banked win moves the progress it shows.
				if (reward?.territory) dispatch('territory', reward.territory);
			} catch {
				// Nothing is drawn from the award any more, so a failed one costs nothing
				// but itself.
			}
		}
		close();
	}

	onMount(() => authService.init());

	onDestroy(() => unsubscribe?.());

	// (Re)build the fight whenever the playable line-up, its colours, or its stats
	// change. The key folds in each slot's character id and its resolved spawn
	// colour and stat, so the controller is rebuilt only on a real change — not on
	// every unrelated tick.
	$: fightKey =
		playable && spawnsLoaded
			? `${slots.join(',')}|${slots.map((id) => spawnById.get(id)?.color ?? '').join(',')}` +
				`|${slots.map((id) => spawnById.get(id)?.stat ?? '').join(',')}`
			: '';
	let lastFightKey = '';
	$: if (fightKey && fightKey !== lastFightKey) {
		lastFightKey = fightKey;
		void setup();
	}

</script>

<!-- A fighter's banked charges, as MAX_CHARGES pips filled left to right. A shot
     spends one, so this is also how many shots the fighter has in hand. -->
{#snippet charges(fighter: FighterView | undefined)}
	<div class="flex items-center justify-center gap-1" aria-label="charges">
		{#each Array.from({ length: MAX_CHARGES }) as _, i (i)}
			<span
				class={classNames('h-2 w-2 rounded-full border', {
					'border-base-content/40': true,
					'bg-base-content': (fighter?.charges ?? 0) > i,
					'bg-transparent': (fighter?.charges ?? 0) <= i
				})}
			></span>
		{/each}
	</div>
{/snippet}

{#snippet orderPicker(badge: Badge, fighter: FighterView | undefined)}
	{@const locked = state?.phase !== 'planning' || !!fighter?.down}
	<!-- An extra shot already taken stays clickable so it can be taken back, even on a
	     turn it could no longer be chosen from scratch. -->
	{@const bonusLocked = locked || (!fighter?.bonus && !fighter?.canBonus)}
	<div class="flex w-full flex-col gap-1">
		{@render charges(fighter)}
		<!-- The three orders as one row of glyphs. Nothing is written on them, so each
		     carries the order's name for anything that cannot see it.
		
		     An order that cannot be taken is disabled, never dropped — but disabling has
		     to be *seen*, and DaisyUI answers a disabled button by dropping its
		     foreground to a fifth of base-content. The glyph paints in that foreground
		     (that is the point of inlining it), so left alone a disabled order reads as
		     an empty slab rather than as an order that is out of reach. Hence the
		     explicit disabled colours: a plainly present button, plainly greyed. -->
		<div class="join w-full">
			{#each COMBAT_ACTIONS as action (action)}
				{@const unavailable = action === 'shoot' && !fighter?.canShoot}
				<button
					type="button"
					class={classNames(
						'btn join-item btn-lg min-w-0 flex-1 px-0',
						'disabled:!bg-base-300 disabled:!text-base-content/60',
						{
							'btn-primary': fighter?.action === action,
							'btn-neutral': fighter?.action !== action
						}
					)}
					aria-label={actionLabel(action)}
					disabled={locked || unavailable}
					on:click={() => controller?.setAction(badge.id, action)}
				>
					<Icon name={ACTION_ICONS[action]} classes="[&>svg]:size-6" />
				</button>
			{/each}
		</div>
		<!-- Red's extra shot. Only a colour that carries red can ever take it, and only
		     on a turn it is spending on something other than shooting, with a charge
		     left to pay for it — but it is drawn whatever the answer is, greyed out
		     rather than absent, so a fighter's picker is the same shape every turn and
		     the row of them never shifts under the cursor. -->
		<label
			class={classNames('flex items-center justify-center gap-1 text-[11px]', {
				'cursor-pointer': !bonusLocked,
				'opacity-60': bonusLocked
			})}
		>
			<input
				type="checkbox"
				class="checkbox checkbox-xs"
				checked={!!fighter?.bonus}
				disabled={bonusLocked}
				on:change={(event) => controller?.setBonus(badge.id, event.currentTarget.checked)}
			/>
			<span>Extra shot</span>
		</label>
	</div>
{/snippet}

<!-- What a rival is doing, once it stops being a secret. Their orders are committed
     at the same time as the player's, so until the turn plays out this reads as an
     unknown — guessing it is the game. -->
{#snippet rivalOrder(fighter: FighterView | undefined)}
	<div class="flex w-full flex-col gap-1">
		{@render charges(fighter)}
		<div
			class={classNames(
				'rounded-btn border px-2 py-1 text-center text-xs font-semibold',
				fighter?.down
					? 'border-base-300 text-base-content/40 line-through'
					: 'border-base-300 text-base-content/80'
			)}
		>
			{#if fighter?.down}
				Down
			{:else if fighter?.action}
				{actionLabel(fighter.action)}{#if fighter.bonus}&nbsp;+&nbsp;shot{/if}
			{:else}
				?
			{/if}
		</div>
	</div>
{/snippet}

<!-- A line-up laid out horizontally, above (CPU) or below (player) the board.
     Stays a single row on every screen — on mobile it scrolls sideways rather
     than wrapping the cards into a stack. The column width and the row's gap
     mirror the canvas card band (150px cards, 21px apart, centred), so each
     column sits directly under (or over) its card. -->
{#snippet row(list: Badge[], rival: boolean)}
	<div class="w-full overflow-x-auto">
		<div class="mx-auto flex w-max flex-row flex-nowrap items-start gap-[21px] px-2 text-sm">
			{#each list as badge (badge.id)}
				{@const fighter = combatById.get(badge.id)}
				<div
					class={classNames('flex w-[150px] shrink-0 flex-col items-center transition-opacity', {
						'opacity-40': fighter?.down
					})}
				>
					{#if rival}
						{@render rivalOrder(fighter)}
					{:else}
						{@render orderPicker(badge, fighter)}
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

<div class="flex w-full flex-col items-center gap-4">
	{#if (challengeReady && ogName) || closable}
		<div class="flex w-full items-center gap-2">
			{#if challengeReady && ogName}
				<!-- A town still on its seeded team is badged OG; one a player has taken
				     names its occupant instead, since that is whose team is being fought. -->
				<span class="badge badge-primary badge-sm font-bold">{ogHolderName ? 'HOLD' : 'OG'}</span>
				<span class="text-sm opacity-70">
					Challenging <span class="font-semibold">{ogName}</span>
					{#if ogHolderName}
						— held by <span class="font-semibold">{ogHolderName}</span>
					{/if}
				</span>
			{/if}
			{#if closable}
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm ml-auto"
					on:click={close}
					aria-label="Close"
				>
					✕
				</button>
			{/if}
		</div>
	{/if}

	{#if !authService.configured}
		<div class="alert alert-warning max-w-md text-sm">
			<span>Sign-in is unavailable — Supabase is not configured, so no team can be played.</span>
		</div>
	{:else if $authStatus === AuthStatus.Loading}
		<div class="flex justify-center py-12">
			<span class="loading loading-spinner loading-md"></span>
		</div>
	{:else if $authStatus !== AuthStatus.SignedIn}
		<div class="card max-w-md bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<h2 class="card-title">Sign in to play</h2>
				<p class="text-sm opacity-70">
					Your team fights with the characters you've claimed and the colours they rolled. Sign in
					to pick a team.
				</p>
				<button class="btn btn-primary btn-sm w-fit" on:click={() => signInPanelOpen.set(true)}>
					Sign in
				</button>
			</div>
		</div>
	{:else if !teamReady}
		<!-- Signed in, but there's no active team ready to field. -->
		<div class="card max-w-md bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<h2 class="card-title">No active team</h2>
				<p class="text-sm opacity-70">
					{#if !activeTeam}
						Create a team and set it as active on your roster to play.
					{:else}
						Your active team needs all {TEAM_SIZE} slots filled to play — finish it on your roster.
					{/if}
				</p>
				<!-- The roster is a modal over the map, not a page, so this raises it right
					over the arena rather than navigating out of the fight. -->
				<button
					class="btn btn-primary btn-sm w-fit"
					on:click={() => rosterModalOpen.set(true)}
				>
					Open roster
				</button>
			</div>
		</div>
	{:else}
		<!-- Full width on small screens (so the canvas can shrink to the viewport),
		     back to hugging its content from lg up. In panel mode (over the map) the
		     card is transparent so the map shows through behind the board; on its own
		     page it keeps the solid base card. -->
		<div
			class={classNames('card w-full min-w-0 lg:w-auto', {
				'bg-base-100 shadow-xl': !closable
			})}
		>
			<div class="card-body items-center gap-3">
				<!-- What the rivals are up to, above the board and over their own cards. -->
				{@render row(lineups[0], true)}
				<div class="flex w-full min-w-0 flex-col items-center gap-3">
					{#key boardKey}
						<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{/key}
				</div>
				<!-- The player's orders, as a row after the game canvas. -->
				{@render row(lineups[1], false)}
				{#if state}
					<div class="flex w-full flex-col items-center gap-2">
						<button
							type="button"
							class="btn btn-primary btn-wide"
							disabled={!state.ready}
							on:click={() => controller?.commit()}
						>
							{#if state.phase === 'resolving'}
								<span class="loading loading-spinner loading-xs"></span>
								Playing out turn {state.turn}
							{:else}
								Commit turn {state.turn}
							{/if}
						</button>
						<p class="text-center text-xs opacity-70">{state.status}</p>
						<!-- Every fighter acts at once, so what a turn amounted to takes more
						     than one line to say. -->
						{#if state.log.length > 0}
							<ul class="max-h-24 w-full max-w-md overflow-y-auto text-center text-xs opacity-60">
								{#each state.log as line, i (i)}
									<li>{line}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
