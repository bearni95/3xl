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
	import { rollHp } from '$utils/dice/roll';
	import {
		CombatController,
		type CombatAction,
		type CombatState,
		type Fighter,
		type FighterSeed
	} from '$services/combat.controller';
	import {
		STAT_KINDS,
		DEFAULT_STAT,
		type CharacterDefinition,
		type CharacterStats,
		type StatKind
	} from '$types/character-definition.type';

	// Human-readable labels for each stat slot (mirrors CharacterStatsEditor).
	const statLabels: Record<StatKind, string> = {
		atk: 'Attack',
		def: 'Defense',
		hp: 'Health'
	};

	// Left: red grid — Kikyo (movable, centre) with Sailor Moon and Luffy idling
	// on their own hexes. Right: blue grid — Kuwabara (movable, centre) with Goku
	// and Ranma idling on theirs.
	const grids: [BoardGrid, BoardGrid] = [
		{
			color: 0xff0000,
			character: { id: 'kikyo', basePath: '/kikyo/frames', animation: 'idle' },
			extras: [
				{ id: 'moon', basePath: '/moon/frames', animation: 'idle', q: -1, r: 0 },
				{ id: 'luffy', basePath: '/luffy/frames', animation: 'idle', q: -1, r: 3 }
			]
		},
		{
			color: 0x2563eb,
			character: { id: 'kuwabara', basePath: '/kuwabara/frames', animation: 'idle' },
			extras: [
				{ id: 'sb1gokuanotherlive', basePath: '/sb1gokuanotherlive/frames', animation: 'idle', q: 1, r: 2 },
				{ id: 'ranma', basePath: '/ranma/frames', animation: 'idle', q: 1, r: -1 }
			]
		}
	];

	// One badge per character on the board, in board order (red half then blue).
	// Static display info (name, face, base stats, rolled max HP); the live combat
	// state (current HP, selection, defeat) lives in the CombatController store.
	interface Badge {
		id: string;
		basePath: string;
		side: 'error' | 'info';
		name: string;
		face: string | null;
		stats: CharacterStats;
		/** Fight HP total, rolled at game start as `hp` d10s summed. */
		maxHp: number;
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

	// Screen depth of a cell. Flat-top columns are offset half a step in depth, so a
	// character's height on screen depends on both its row (r) and column (q).
	const gridDepth = (q: number, r: number): number => r + q / 2;

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

	const roster: Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] = [
		...rosterFor([grids[0].character, ...(grids[0].extras ?? [])], 'error'),
		...rosterFor([grids[1].character, ...(grids[1].extras ?? [])], 'info')
	];

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

	onMount(async () => {
		badges = await Promise.all(
			roster.map(async (entry) => {
				// The character id is the first path segment (`/kikyo/frames` → `kikyo`);
				// its stats live in the definition JSON authored via /admin/characters.
				const [manifestRes, defRes] = await Promise.all([
					fetch(`${entry.basePath}/manifest.json`),
					fetch(`/characters/${entry.id}.json`)
				]);
				const manifest: Manifest = await manifestRes.json();
				const definition: Partial<CharacterDefinition> = defRes.ok ? await defRes.json() : {};
				// Fill missing/invalid stats with DEFAULT_STAT, like the stats editor does.
				const rawStats = definition.stats ?? ({} as Partial<CharacterStats>);
				const stats = Object.fromEntries(
					STAT_KINDS.map((kind) => [
						kind,
						typeof rawStats[kind] === 'number' ? rawStats[kind] : DEFAULT_STAT
					])
				) as CharacterStats;
				// Roll this character's fight HP: `hp` d10s summed.
				return {
					...entry,
					name: manifest.name,
					face: manifest.face ? `${entry.basePath}/${manifest.face.file}` : null,
					stats,
					maxHp: rollHp(stats.hp)
				};
			})
		);

		// Hand the rolled fighters to the combat controller and wire its store.
		const seeds: FighterSeed[] = badges.map((badge) => ({
			id: badge.id,
			name: badge.name,
			side: badge.side,
			stats: badge.stats,
			maxHp: badge.maxHp
		}));
		controller = new CombatController(seeds);
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
	});

	onDestroy(() => unsubscribe?.());

	function selectAction(id: string, action: CombatAction): void {
		controller?.selectAction(id, action);
	}
</script>

{#snippet column(list: Badge[])}
	<div class="flex flex-col items-center gap-4 text-sm">
		{#each list as badge (badge.id)}
			{@const combat = combatById.get(badge.id)}
			{@const areaLocked = !!combat?.disabled || state?.phase !== 'selecting'}
			{@const currentHp = combat?.currentHp ?? badge.maxHp}
			<div
				class={classNames('flex flex-col items-center gap-1 transition-opacity', {
					'text-error': badge.side === 'error',
					'text-info': badge.side === 'info',
					'opacity-40': combat?.defeated,
					'opacity-60': combat?.disabled && !combat?.defeated
				})}
			>
				<div class="flex items-center gap-2">
					{#if badge.side === 'error'}
						<div class="flex flex-col gap-2">
							<div class="join">
								<button
									type="button"
									class={classNames('btn join-item btn-xs', {
										'btn-active': combat?.action === 'melee'
									})}
									disabled={areaLocked}
									on:click={() => selectAction(badge.id, 'melee')}>Melee</button
								>
								<button
									type="button"
									class={classNames('btn join-item btn-xs', {
										'btn-active': combat?.action === 'ranged'
									})}
									disabled={areaLocked}
									on:click={() => selectAction(badge.id, 'ranged')}>Range</button
								>
								<button type="button" class="btn join-item btn-xs" disabled={areaLocked}
									>Final</button
								>
							</div>
							<div class="join">
								<button type="button" class="btn join-item btn-xs" disabled={areaLocked}
									>Defend</button
								>
								<button type="button" class="btn join-item btn-xs" disabled={areaLocked}
									>Help</button
								>
								<button type="button" class="btn join-item btn-xs" disabled={areaLocked}
									>Charge</button
								>
							</div>
						</div>
					{/if}
					{#if badge.face}
						<!-- Both columns' face images are horizontally flipped. -->
						<img
							src={badge.face}
							alt={badge.name}
							class="h-32 w-32 -scale-x-100 bg-base-300 object-cover object-top"
						/>
					{/if}
				</div>
				<span class="flex items-center gap-1">
					{badge.name}{#if combat?.defeated} — KO{/if}
					{#if combat?.action && !combat?.defeated}
						<span class="badge badge-outline badge-xs uppercase">
							{combat.action === 'ranged' ? 'Range' : 'Melee'}
						</span>
					{/if}
				</span>
				<div class="flex w-32 flex-col gap-0.5 text-xs">
					{#each STAT_KINDS as kind (kind)}
						{#if kind === 'hp'}
							<div class="flex items-center justify-between">
								<span class="opacity-70">{statLabels[kind]}</span>
								<span class="font-mono font-semibold">{currentHp}/{badge.maxHp}</span>
							</div>
							<!-- Rolled fight HP as a bar; shrinks as damage is dealt each round. -->
							<progress
								class={classNames('progress w-full', {
									'progress-error': badge.side === 'error',
									'progress-info': badge.side === 'info'
								})}
								value={currentHp}
								max={badge.maxHp}
							></progress>
						{:else}
							<div class="flex items-center justify-between">
								<span class="opacity-70">{statLabels[kind]}</span>
								<span class="font-mono font-semibold">{badge.stats[kind]}</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex min-h-screen flex-col items-center justify-start gap-6 bg-base-200 p-8">
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body items-center gap-3">
			<div class="flex items-start justify-center gap-12">
				{@render column(columns[0])}
				<div class="flex flex-col items-center gap-3">
					<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{#if state?.status}
						<div class="text-sm font-medium">{state.status}</div>
					{/if}
				</div>
				{@render column(columns[1])}
			</div>
		</div>
	</div>
</div>
