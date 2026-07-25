<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import MugenBoard from '$components/core/MugenBoard.svelte';
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
		type CombatColor,
		type CompoundColor
	} from '$types/character-definition.type';
	import { throwableColors } from '$utils/color/compare';
	import { characters as availableCharacters } from '@3xl/data';

	// Swatch background per combat color, for buttons and badges.
	const colorSwatches: Record<CombatColor, string> = {
		red: 'bg-red-500',
		blue: 'bg-blue-500',
		yellow: 'bg-yellow-400',
		purple: 'bg-purple-500',
		orange: 'bg-orange-500',
		green: 'bg-green-500'
	};

	// The six combat participants, pickable from the character registry. Slots
	// 0–2 fill the red grid (slot 0 is the movable centre character, 1–2 the
	// extras), slots 3–5 the blue grid likewise.
	let slots: string[] = [
		'kikyo',
		'moon',
		'luffy',
		'vegetassj1v1100',
		'sb1gokuanotherlive',
		'ranmahb'
	];

	const characterById = new Map(availableCharacters.map((option) => [option.id, option]));

	// Fixed hexes the two non-centre characters of each side idle on.
	const extraCells: Record<'error' | 'info', { q: number; r: number }[]> = {
		error: [
			{ q: -1, r: 0 },
			{ q: -1, r: 3 }
		],
		info: [
			{ q: 1, r: 2 },
			{ q: 1, r: -1 }
		]
	};

	function boardCharacter(id: string): BoardCharacter {
		const option = characterById.get(id) ?? availableCharacters[0];
		return { id: option.id, basePath: option.basePath, animation: 'idle' };
	}

	// Left: red grid with its movable centre plus two idling extras; right: blue
	// grid likewise. Rebuilt whenever a picker slot changes.
	function buildGrids(ids: string[]): [BoardGrid, BoardGrid] {
		return [
			{
				color: 0xff0000,
				character: boardCharacter(ids[0]),
				extras: extraCells.error.map((cell, i) => ({ ...boardCharacter(ids[1 + i]), ...cell }))
			},
			{
				color: 0x2563eb,
				character: boardCharacter(ids[3]),
				extras: extraCells.info.map((cell, i) => ({ ...boardCharacter(ids[4 + i]), ...cell }))
			}
		];
	}

	$: grids = buildGrids(slots);
	// Bumped by "Play again" so the Pixi board remounts with a clean slate.
	let gameKey = 0;
	// Remounts the Pixi board (and thus repositions everyone) on any slot change
	// or game restart.
	$: boardKey = `${slots.join(',')}:${gameKey}`;

	// One badge per character on the board, in board order (red half then blue).
	// Static display info (name, face, compound color, moves); the live combat
	// state (strikes, selection, defeat) lives in the CombatController store.
	interface Badge {
		id: string;
		basePath: string;
		side: 'error' | 'info';
		name: string;
		face: string | null;
		/** The moves this character's JSON definition declares, in declared order. */
		moves: CharacterMove[];
		/** The character's compound combat color, from its definition JSON. */
		color: CompoundColor;
		/**
		 * Board depth of the character's cell (`r + q/2`). Larger = further into the
		 * board = higher on screen; used to stack the cards to match the grid.
		 */
		gridY: number;
	}

	// Start cells of the two movable centre characters (they're placed by the engine,
	// not the grid config — mirror mugen-board's start() here so the cards can line up
	// with where each character stands on the board).
	const centerCells: Record<'error' | 'info', { q: number; r: number }> = {
		error: { q: -2, r: 2 },
		info: { q: 2, r: 0 }
	};

	// Screen depth of a cell. With pointy-top hexes rows are level, so a character's
	// height on screen depends only on its row (r). Mirrors mugen-board's hexCoord.
	const gridDepth = (_q: number, r: number): number => r;

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
				gridY: gridDepth(cell.q, cell.r)
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

	// Each side's badges, ordered by melee-selection order once picked; unselected
	// cards sit in the same vertical order as their character on the board (deepest
	// cell = highest on screen = top of the column). `badges` and `combatById` are
	// passed in explicitly so Svelte's legacy reactive tracking sees them as
	// dependencies — referencing them only inside a helper would not re-run this.
	$: columns = [
		orderColumn('error', badges, combatById),
		orderColumn('info', badges, combatById)
	];

	function orderColumn(
		side: 'error' | 'info',
		list: Badge[],
		byId: Map<string, Fighter>
	): Badge[] {
		return list
			.filter((badge) => badge.side === side)
			.map((badge) => ({
				badge,
				// Selected fighters (actionIndex 0,1,…) float above the rest; otherwise
				// order by board depth so higher-on-screen characters sit higher up.
				order: byId.get(badge.id)?.actionIndex ?? 100 - badge.gridY
			}))
			.sort((a, b) => a.order - b.order)
			.map((entry) => entry.badge);
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
		const currentGrids = buildGrids(slots);
		const roster: Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] = [
			...rosterFor([currentGrids[0].character, ...(currentGrids[0].extras ?? [])], 'error'),
			...rosterFor([currentGrids[1].character, ...(currentGrids[1].extras ?? [])], 'info')
		];

		const loaded = await Promise.all(
			roster.map(async (entry) => {
				// The character id is the first path segment (`/kikyo/frames` → `kikyo`);
				// its combat color lives in the definition JSON authored via /admin/characters.
				const [manifestRes, defRes] = await Promise.all([
					fetch(`${entry.basePath}/manifest.json`),
					fetch(`/data/characters/${entry.id}.json`)
				]);
				const manifest: Manifest = await manifestRes.json();
				const definition: Partial<CharacterDefinition> = defRes.ok ? await defRes.json() : {};
				// Definitions predating colors fall back to DEFAULT_COLOR.
				const color = COMPOUND_COLORS.includes(definition.color!)
					? definition.color!
					: DEFAULT_COLOR;
				return {
					...entry,
					name: manifest.name,
					face: manifest.face ? `${entry.basePath}/${manifest.face.file}` : null,
					moves: definition.moves ?? [],
					color
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
			moves: badge.moves
		}));
		unsubscribe?.();
		controller = new CombatController(seeds);
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
	}

	onMount(() => void setup());

	onDestroy(() => unsubscribe?.());

	// Swap the character in one picker slot and rebuild the whole fight around
	// the new line-up (the board remounts via boardKey).
	function onSlotChange(index: number, id: string): void {
		const next = [...slots];
		next[index] = id;
		slots = next;
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
	<!-- One button per color the character can throw, stacked vertically: its
	     compound color first, then that color's two primary components. The active
	     button marks the current choice — for rivals that's their pre-rolled
	     default, and clicking another color overwrites it. -->
	<div class="join join-vertical">
		{#each throwableColors(badge.color) as color (color)}
			<button
				type="button"
				class={classNames('btn join-item btn-xs gap-1 capitalize', {
					'btn-active': combat?.moveColor === color
				})}
				disabled={areaLocked}
				on:click={() => selectColor(badge.id, color)}
			>
				<span class={classNames('h-2.5 w-2.5 rounded-full', colorSwatches[color])}></span>
				{color}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet column(list: Badge[])}
	<div class="flex flex-col items-center gap-4 text-sm">
		{#each list as badge (badge.id)}
			{@const combat = combatById.get(badge.id)}
			{@const areaLocked = !!combat?.disabled || state?.phase !== 'selecting'}
			<div
				class={classNames('flex flex-col items-center gap-1 transition-opacity', {
					'text-error': badge.side === 'error',
					'text-info': badge.side === 'info',
					'opacity-60': combat?.disabled
				})}
			>
				<div class="flex items-center gap-2">
					<!-- Buttons sit board-side on both columns: left of the face for red,
					     right of the face for blue. -->
					{#if badge.side === 'error'}
						{@render moveButtons(badge, combat, areaLocked)}
					{/if}
					{#if badge.face}
						<!-- Both columns' face images are horizontally flipped. -->
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
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex min-h-screen flex-col items-center justify-start gap-6 bg-base-200 p-8">
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body items-center gap-3">
			<!-- Line-up picker: one slot per combat participant (red 1–3, blue 1–3).
			     Changing a slot rebuilds the board and restarts the fight. -->
			<div class="grid w-full grid-cols-6 gap-2">
				{#each slots as slotId, index (index)}
					{@const side = index < 3 ? 'error' : 'info'}
					<label class="flex flex-col gap-1">
						<span
							class={classNames('text-xs font-medium uppercase', {
								'text-error': side === 'error',
								'text-info': side === 'info'
							})}
						>
							{side === 'error' ? 'Red' : 'Blue'}
							{(index % 3) + 1}
						</span>
						<select
							class={classNames('select-bordered select select-xs', {
								'select-error': side === 'error',
								'select-info': side === 'info'
							})}
							value={slotId}
							disabled={state?.phase === 'fighting'}
							on:change={(event) => onSlotChange(index, event.currentTarget.value)}
						>
							{#each availableCharacters as option (option.id)}
								<!-- A character can only occupy one slot at a time. -->
								<option
									value={option.id}
									disabled={option.id !== slotId && slots.includes(option.id)}
								>
									{option.label}
								</option>
							{/each}
						</select>
					</label>
				{/each}
			</div>
			<div class="flex items-start justify-center gap-12">
				{@render column(columns[0])}
				<div class="flex flex-col items-center gap-3">
					{#key boardKey}
						<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{/key}
					{#if state?.status && !state?.outcome}
						<div class="text-sm font-medium">{state.status}</div>
					{/if}
				</div>
				{@render column(columns[1])}
			</div>
		</div>
	</div>
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
