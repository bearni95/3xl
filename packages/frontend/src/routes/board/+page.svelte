<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import MugenBoard from '$components/core/MugenBoard.svelte';
	import { cellScreenY, combatColorHex } from '$utils/mugen/mugen-board';
	import type {
		BoardCharacter,
		BoardGrid,
		MugenBoard as MugenBoardEngine,
		PlacedCharacter
	} from '$utils/mugen/mugen-board';
	import type { Manifest } from '$utils/mugen/mugen-player';
	import {
		CombatController,
		type CombatState,
		type Fighter,
		type FighterSeed
	} from '$services/combat.controller';
	import {
		COMPOUND_COLORS,
		DEFAULT_COLOR,
		type CharacterDefinition,
		type CharacterMove,
		type CombatColor
	} from '$types/character-definition.type';
	import { throwableColors } from '$utils/color/compare';
	import { characters as availableCharacters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { spawnService } from '$services/spawn.service';
	import { teamService, TEAM_SIZE, type Team } from '$services/team.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import {
		DEFAULT_SPAWN_STAT,
		SpawnColor,
		type CharacterSpawn
	} from '$types/character-spawn.type';
	import { combatStatsFromStat } from '$utils/spawn/stat';
	import type { CardModel } from '$utils/card/card-model.type';

	// Filled button styling per combat color (the player's clickable buttons).
	const colorFill: Record<CombatColor, string> = {
		red: 'bg-red-500 hover:bg-red-600 border-red-500 text-white',
		blue: 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white',
		yellow: 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black',
		purple: 'bg-purple-500 hover:bg-purple-600 border-purple-500 text-white',
		orange: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white',
		green: 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
	};

	const characterById = new Map(availableCharacters.map((option) => [option.id, option]));


	// The blue side is the player's active team; the red side (the CPU) is a 1:1
	// copy of it. Both are driven entirely by the roster's active team — there is
	// no in-board picker anymore.
	const authStatus = authService.status;
	const profile = authService.profile;
	const teamStore = teamService.store;
	const spawns = spawnService.spawns;

	// The signed-in player, or null. Colours (and the team's characters) come from
	// this player's Supabase spawns, so playing requires being signed in.
	$: currentUserId =
		$authStatus === AuthStatus.SignedIn && $profile ? String($profile.id) : null;

	// The active team, and whether it's ready to play (all TEAM_SIZE slots filled).
	$: activeTeam =
		$teamStore.teams.find((team: Team) => team.id === $teamStore.activeTeamId) ?? null;
	$: teamMembers = (activeTeam?.memberIds ?? []).filter((id): id is string => Boolean(id));
	$: teamReady = teamMembers.length === TEAM_SIZE;
	$: playable = !!currentUserId && teamReady;

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

	// spawn id → the spawn itself. Teams reference spawns (not characters), so each
	// team slot fights with its own rolled colour and stat — even when two slots hold
	// the same character claimed twice.
	$: spawnById = new Map(($spawns as CharacterSpawn[]).map((spawn) => [spawn.id, spawn]));

	// Slots 0–2 are the red (CPU) grid, 3–5 the blue (player) grid; the CPU line-up
	// mirrors the player's active team exactly.
	$: slots = playable ? [...teamMembers, ...teamMembers] : [];

	// Fixed hexes the two non-centre characters of each side idle on.
	const extraCells: Record<'error' | 'info', { q: number; r: number }[]> = {
		error: [
			{ q: -1, r: 0 },
			{ q: -1, r: -3 }
		],
		info: [
			{ q: 1, r: -4 },
			{ q: 1, r: -1 }
		]
	};

	// The two sides field the SAME spawn line-up (the CPU mirrors the player's team),
	// so a bare spawn id is not unique across the board. Every board actor / fighter
	// is identified by a per-side instance id (`error:<spawnId>`); the underlying
	// spawn (for its character assets, definition, colour and stat) is recovered via
	// spawnById. Without this, id lookups (board actors, the combat controller)
	// collide between the two sides and combat never starts.
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
			// The spawn's rolled colour fills this fighter's HP bar on the board.
			combatColor: spawn?.color,
			// The display card drawn outside the grid (rival above, player below): the
			// idle art loads from basePath, and the combat attributes mirror the board's
			// derivation from the rolled stat (ATK = stat, DEF its complement, SPD = ATK − 1,
			// HP attribute = DEF + 1, the number of d4 rolled for the pool). Rarity, show and claim place come from the same three
			// Supabase/geo sources the roster and claim cards read (`showNames`/`names` are
			// passed so the reactive build re-runs — and the board remounts — once those
			// layers load).
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

	// Each side's hexes take the colour of that side's leader — the team's first slot,
	// which stands as the movable centre character (ids[0] on the left, ids[3] on the
	// right). Falls back to the classic red/blue if the leader has no rolled colour yet.
	function leaderColorHex(
		leaderId: string,
		spawns: Map<string, CharacterSpawn>,
		fallback: number
	): number {
		const color = spawns.get(leaderId)?.color;
		return color ? combatColorHex(color) : fallback;
	}

	// Left: leader-coloured grid with its movable centre plus two idling extras; right:
	// likewise. Rebuilt whenever a picker slot or a spawn changes. `spawns` is passed in
	// explicitly so Svelte's legacy reactive tracking sees the spawn map as a dependency
	// of `grids`.
	function buildGrids(
		ids: string[],
		spawns: Map<string, CharacterSpawn>,
		rarities: Map<string, number>,
		showNames: Map<string, string[]>,
		names: Map<string, string> | null
	): [BoardGrid, BoardGrid] {
		return [
			{
				color: leaderColorHex(ids[0], spawns, 0xff0000),
				character: boardCharacter(ids[0], 'error', spawns, rarities, showNames, names),
				extras: extraCells.error.map((cell, i) => ({
					...boardCharacter(ids[1 + i], 'error', spawns, rarities, showNames, names),
					...cell
				}))
			},
			{
				color: leaderColorHex(ids[3], spawns, 0x2563eb),
				character: boardCharacter(ids[3], 'info', spawns, rarities, showNames, names),
				extras: extraCells.info.map((cell, i) => ({
					...boardCharacter(ids[4 + i], 'info', spawns, rarities, showNames, names),
					...cell
				}))
			}
		];
	}

	$: grids = buildGrids(slots, spawnById, rarityByCharacter, showNamesByCharacter, municipalityNames);
	// Bumped by "Play again" so the Pixi board remounts with a clean slate.
	let gameKey = 0;
	// Remounts the Pixi board (and thus repositions everyone) on any slot change,
	// spawn-colour change (so home cells repaint once colours load), spawn-stat change
	// (so the outside-grid cards repaint), rarity/show/place load (so the cards gain
	// their badge, show and location once those sources resolve), or restart.
	$: boardKey = `${slots.join(',')}:${slots
		.map((id) => `${spawnById.get(id)?.color ?? ''}/${spawnById.get(id)?.stat ?? ''}`)
		.join(',')}:${rarityByCharacter.size}:${showNamesByCharacter.size}:${municipalityNames?.size ?? 0}:${gameKey}`;

	// One badge per character on the board, in board order (red half then blue).
	// Static display info (name, face, compound color, moves); the live combat
	// state (HP, selection, defeat) lives in the CombatController store.
	interface Badge {
		id: string;
		basePath: string;
		side: 'error' | 'info';
		name: string;
		face: string | null;
		/** The moves this character's JSON definition declares, in declared order. */
		moves: CharacterMove[];
		/** The character's combat color — its Supabase spawn colour. */
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

	// Start cells of the two movable centre characters (they're placed by the engine,
	// not the grid config — mirror mugen-board's start() here so the cards can line up
	// with where each character stands on the board).
	const centerCells: Record<'error' | 'info', { q: number; r: number }> = {
		error: { q: -2, r: -1 },
		info: { q: 2, r: -3 }
	};

	function rosterFor(
		characters: (BoardCharacter | PlacedCharacter)[],
		side: 'error' | 'info'
	): Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] {
		return characters.map((c) => {
			const cell = 'q' in c ? { q: c.q, r: c.r } : centerCells[side];
			return {
				id: c.id as string,
				basePath: c.basePath,
				side,
				// Vertical on-screen position of the cell, so the cards can be laid out
				// left→right in the order the characters stand top-of-board first.
				gridY: cellScreenY(cell.q, cell.r)
			};
		});
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
		return list
			.filter((badge) => badge.side === side)
			.sort((a, b) => a.gridY - b.gridY);
	}

	function onBoardReady(engine: MugenBoardEngine): void {
		board = engine;
		controller?.attachBoard(engine);
	}

	// Bumped on every setup() call so a stale in-flight load can't clobber a
	// newer roster after the user changes a picker slot mid-fetch.
	let setupToken = 0;

	// (Re)build the fight from the current slots: load each participant's
	// manifest and definition and hand a fresh CombatController the fighters.
	// Runs on mount and again whenever a picker slot changes.
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
			...rosterFor([currentGrids[0].character, ...(currentGrids[0].extras ?? [])], 'error'),
			...rosterFor([currentGrids[1].character, ...(currentGrids[1].extras ?? [])], 'info')
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

		// Hand the fighters to the combat controller and wire its store.
		const seeds: FighterSeed[] = badges.map((badge) => {
			// Combat attributes: ATK, its DEF complement and SPD (ATK − 1), with ATK and DEF
			// clamped to 1..9. HP (DEF + 1) is rolled at battle start inside the controller.
			const { atk, def, spd } = combatStatsFromStat(badge.stat);
			return {
				id: badge.id,
				name: badge.name,
				side: badge.side,
				color: badge.color,
				moves: badge.moves,
				atk,
				def,
				spd
			};
		});
		unsubscribe?.();
		controller = new CombatController(seeds);
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
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

	function selectColor(id: string, color: CombatColor): void {
		controller?.selectColor(id, color);
	}

	// Restart from the endgame modal: remount the board and rebuild the fight.
	function playAgain(): void {
		gameKey += 1;
		void setup();
	}

	// Endgame modal copy, keyed by outcome.
	const outcomeTitles: Record<string, string> = {
		win: 'Victory!',
		lose: 'Defeat',
		draw: 'Draw'
	};
</script>

{#snippet moveButtons(badge: Badge, combat: Fighter | undefined, areaLocked: boolean)}
	<!-- One button per color the character can throw, stacked vertically and full
	     width: the character's own color first, then the colors it mixes into. The
	     active button marks the current choice. Only the player picks colours — the
	     rival fights on its pre-rolled defaults and has no picker. -->
	<div class="join join-vertical w-full">
		{#each throwableColors(badge.color) as color (color)}
			<button
				type="button"
				class={classNames('btn join-item btn-sm btn-block capitalize', colorFill[color], {
					'ring-2 ring-base-content ring-inset': combat?.moveColor === color
				})}
				disabled={areaLocked}
				on:click={() => selectColor(badge.id, color)}
			>
				{color}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet badgeCard(badge: Badge)}
	{@const combat = combatById.get(badge.id)}
	{@const areaLocked = !!combat?.disabled || state?.phase !== 'selecting'}
	<!-- Only the colour picker lives here now — the fighter's art, name and combat
	     attributes are drawn on the canvas as its trading card. The column width and
	     the row's gap mirror the canvas card band (150px cards, 21px apart, centred),
	     so each picker sits directly under its card. -->
	<div
		class={classNames('flex w-[150px] shrink-0 flex-col items-center transition-opacity', {
			'opacity-60': combat?.disabled
		})}
	>
		{@render moveButtons(badge, combat, areaLocked)}
	</div>
{/snippet}

<!-- A line-up laid out horizontally, above (CPU) or below (player) the board.
     Stays a single row on every screen — on mobile it scrolls sideways rather
     than wrapping the cards into a stack. -->
{#snippet row(list: Badge[])}
	<div class="w-full overflow-x-auto">
		<div class="mx-auto flex w-max flex-row flex-nowrap items-start gap-[21px] px-2 text-sm">
			{#each list as badge (badge.id)}
				{@render badgeCard(badge)}
			{/each}
		</div>
	</div>
{/snippet}

<div class="flex min-h-screen flex-col items-center justify-start gap-6 bg-base-200 p-4 sm:p-8">
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
				<a class="btn btn-primary btn-sm w-fit" href="/roster">Go to roster</a>
			</div>
		</div>
	{:else}
		<!-- Full width on small screens (so the canvas can shrink to the viewport),
		     back to hugging its content from lg up. -->
		<div class="card w-full min-w-0 bg-base-100 shadow-xl lg:w-auto">
			<div class="card-body items-center gap-3">
				<div class="flex w-full min-w-0 flex-col items-center gap-3">
					{#key boardKey}
						<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{/key}
				</div>
				<!-- Player options, as a row after the game canvas. -->
				{@render row(lineups[1])}
			</div>
		</div>
	{/if}
</div>

<!-- Endgame modal: blocks the whole page once the game is decided. No backdrop
     dismissal — the only way out is starting a new game. -->
{#if state?.outcome}
	<div class="modal modal-open">
		<div class="modal-box text-center">
			<h3
				class={classNames('text-3xl font-bold', {
					'text-success': state.outcome === 'win',
					'text-error': state.outcome === 'lose'
				})}
			>
				{outcomeTitles[state.outcome]}
			</h3>
			<p class="py-3 text-sm opacity-70">{state.status}</p>
			<div class="modal-action justify-center">
				<button type="button" class="btn btn-primary" on:click={playAgain}>Play again</button>
			</div>
		</div>
	</div>
{/if}
