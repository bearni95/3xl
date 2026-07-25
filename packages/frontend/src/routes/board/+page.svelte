<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import MugenBoard from '$components/core/MugenBoard.svelte';
	import { cellScreenX } from '$utils/mugen/mugen-board';
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
	import { spawnService } from '$services/spawn.service';
	import { teamService, TEAM_SIZE, type Team } from '$services/team.service';
	import { AuthStatus } from '$types/profile.type';
	import {
		DEFAULT_SPAWN_STAT,
		SPAWN_STAT_MAX,
		type CharacterSpawn
	} from '$types/character-spawn.type';

	// Filled button styling per combat color (the player's clickable buttons).
	const colorFill: Record<CombatColor, string> = {
		red: 'bg-red-500 hover:bg-red-600 border-red-500 text-white',
		blue: 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white',
		yellow: 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black',
		purple: 'bg-purple-500 hover:bg-purple-600 border-purple-500 text-white',
		orange: 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white',
		green: 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
	};

	// Outline styling per combat color (the rival's read-only buttons).
	const colorOutline: Record<CombatColor, string> = {
		red: 'border-red-500 text-red-500',
		blue: 'border-blue-500 text-blue-500',
		yellow: 'border-yellow-400 text-yellow-500',
		purple: 'border-purple-500 text-purple-500',
		orange: 'border-orange-500 text-orange-500',
		green: 'border-green-500 text-green-500'
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

	// Load the player's spawns once signed in, so their rolled colours are available.
	let loadedForUser: string | null = null;
	let spawnsLoaded = false;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		spawnsLoaded = false;
		void spawnService.loadSpawns(currentUserId).then(() => (spawnsLoaded = true));
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
		spawns: Map<string, CharacterSpawn>
	): BoardCharacter {
		const spawn = spawns.get(spawnId);
		const option = (spawn && characterById.get(spawn.characterId)) ?? availableCharacters[0];
		return {
			id: instanceId(side, spawnId),
			basePath: option.basePath,
			animation: 'idle',
			// The spawn's rolled colour tints its home cell on the board.
			combatColor: spawn?.color
		};
	}

	// Left: red grid with its movable centre plus two idling extras; right: blue
	// grid likewise. Rebuilt whenever a picker slot or a spawn changes. `spawns` is
	// passed in explicitly so Svelte's legacy reactive tracking sees the spawn map as
	// a dependency of `grids`.
	function buildGrids(ids: string[], spawns: Map<string, CharacterSpawn>): [BoardGrid, BoardGrid] {
		return [
			{
				color: 0xff0000,
				character: boardCharacter(ids[0], 'error', spawns),
				extras: extraCells.error.map((cell, i) => ({
					...boardCharacter(ids[1 + i], 'error', spawns),
					...cell
				}))
			},
			{
				color: 0x2563eb,
				character: boardCharacter(ids[3], 'info', spawns),
				extras: extraCells.info.map((cell, i) => ({
					...boardCharacter(ids[4 + i], 'info', spawns),
					...cell
				}))
			}
		];
	}

	$: grids = buildGrids(slots, spawnById);
	// Bumped by "Play again" so the Pixi board remounts with a clean slate.
	let gameKey = 0;
	// Remounts the Pixi board (and thus repositions everyone) on any slot change,
	// spawn-colour change (so home cells repaint once colours load), or restart.
	$: boardKey = `${slots.join(',')}:${slots
		.map((id) => spawnById.get(id)?.color ?? '')
		.join(',')}:${gameKey}`;

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
		 * Left→right screen position of the character's cell on the canvas (arbitrary
		 * units; only the ordering matters). Used to lay the cards out in the same
		 * horizontal order the characters stand in on the board.
		 */
		gridX: number;
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
	): Pick<Badge, 'id' | 'basePath' | 'side' | 'gridX'>[] {
		return characters.map((c) => {
			const cell = 'q' in c ? { q: c.q, r: c.r } : centerCells[side];
			return {
				id: c.id as string,
				basePath: c.basePath,
				side,
				// Horizontal on-screen position of the cell, so the cards can be laid
				// out left-to-right in the same order as the characters on the board.
				gridX: cellScreenX(cell.q, cell.r)
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

	// Each side's badges, laid out left-to-right in the same order the characters
	// stand on the board (leftmost cell first). `badges` is referenced directly so
	// Svelte's legacy reactive tracking sees it as a dependency of `lineups`.
	$: lineups = [orderByCell('error', badges), orderByCell('info', badges)];

	function orderByCell(side: 'error' | 'info', list: Badge[]): Badge[] {
		return list
			.filter((badge) => badge.side === side)
			.sort((a, b) => a.gridX - b.gridX);
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
		const currentGrids = buildGrids(slots, spawnById);
		const roster: Pick<Badge, 'id' | 'basePath' | 'side' | 'gridX'>[] = [
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
		const seeds: FighterSeed[] = badges.map((badge) => ({
			id: badge.id,
			name: badge.name,
			side: badge.side,
			color: badge.color,
			moves: badge.moves,
			// Combat attributes: ATK is the spawn stat, DEF its complement. HP is rolled
			// from ATK at battle start inside the controller, not supplied here.
			atk: badge.stat,
			def: SPAWN_STAT_MAX - badge.stat
		}));
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
	     active button marks the current choice. The player's buttons are solid and
	     clickable; the rival's are read-only outlines showing its pre-rolled default. -->
	{@const isRival = badge.side === 'error'}
	<div class="join join-vertical w-32">
		{#each throwableColors(badge.color) as color (color)}
			<button
				type="button"
				class={classNames(
					'btn join-item btn-sm btn-block capitalize',
					isRival ? `btn-outline pointer-events-none ${colorOutline[color]}` : colorFill[color],
					{ 'ring-2 ring-base-content ring-inset': combat?.moveColor === color }
				)}
				disabled={!isRival && areaLocked}
				on:click={() => !isRival && selectColor(badge.id, color)}
			>
				{color}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet badgeCard(badge: Badge)}
	{@const combat = combatById.get(badge.id)}
	{@const areaLocked = !!combat?.disabled || state?.phase !== 'selecting'}
	<div
		class={classNames('flex shrink-0 flex-col items-center gap-1 transition-opacity', {
			'opacity-60': combat?.disabled
		})}
	>
		<div class="flex items-center gap-2">
			<!-- Buttons sit board-side: left of the face for red, right of it for blue. -->
			{#if badge.side === 'error'}
				{@render moveButtons(badge, combat, areaLocked)}
			{/if}
			{#if badge.face}
				<!-- Face images are horizontally flipped. -->
				<img
					src={badge.face}
					alt={badge.name}
					class="h-32 w-32 -scale-x-100 bg-base-300 object-cover object-top"
				/>
			{/if}
			{#if badge.side === 'info'}
				{@render moveButtons(badge, combat, areaLocked)}
			{/if}
		</div>
		<span>{badge.name}</span>
		<!-- ATK is the character's Supabase spawn stat; DEF is its complement
		     (SPAWN_STAT_MAX - ATK); HP is rolled from ATK at battle start and
		     drains live as combat plays out. -->
		<table class="table table-xs w-auto text-center">
			<thead>
				<tr>
					<th class="px-2">ATK</th>
					<th class="px-2">DEF</th>
					<th class="px-2">HP</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="px-2 font-semibold">{badge.stat}</td>
					<td class="px-2 font-semibold">{SPAWN_STAT_MAX - badge.stat}</td>
					<td
						class={classNames('px-2 font-semibold', {
							'text-error': combat?.defeated
						})}
					>
						{combat ? `${combat.hp}/${combat.maxHp}` : '—'}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
{/snippet}

<!-- A line-up laid out horizontally, above (CPU) or below (player) the board.
     Stays a single row on every screen — on mobile it scrolls sideways rather
     than wrapping the cards into a stack. -->
{#snippet row(list: Badge[])}
	<div class="w-full overflow-x-auto">
		<div class="mx-auto flex w-max flex-row flex-nowrap items-start gap-6 px-2 text-sm">
			{#each list as badge (badge.id)}
				{@render badgeCard(badge)}
			{/each}
		</div>
	</div>
{/snippet}

<div class="flex min-h-screen flex-col items-center justify-start gap-6 bg-base-200 p-8">
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
				<a class="btn btn-primary btn-sm w-fit" href="/profile">Sign in</a>
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
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body items-center gap-3">
				<!-- CPU options, as a row before the game canvas. -->
				{@render row(lineups[0])}
				<div class="flex flex-col items-center gap-3">
					{#key boardKey}
						<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{/key}
					{#if state?.status && !state?.outcome}
						<div class="text-sm font-medium">{state.status}</div>
					{/if}
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
