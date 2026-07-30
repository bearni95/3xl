<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import MugenBoard from '$components/core/MugenBoard.svelte';
	import { cellScreenY, combatColorHex } from '$utils/mugen/mugen-board';
	import { ORDER_ICONS } from '$utils/color/traits';
	import type {
		BoardCharacter,
		BoardGrid,
		BoardOrder,
		MugenBoard as MugenBoardEngine,
		PlacedCharacter
	} from '$utils/mugen/mugen-board';
	import type { Hex } from '$utils/mugen/hex';
	import type { Manifest } from '$utils/mugen/mugen-player';
	import {
		CombatController,
		COMBAT_ACTIONS,
		PLAYER_CELLS,
		RIVAL_CELLS,
		type CombatAction,
		type CombatState,
		type FighterView,
		type FighterSeed
	} from '$services/combat.controller';
	import type { CombatReport, CombatReward, TerritoryResult } from '$types/combat.type';
	import type { BattleBoardSnapshot } from '$types/battle.type';
	import { battleService } from '$services/battle.service';
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
	import { teamService, TEAM_SIZE } from '$services/team.service';
	import { AuthStatus } from '$types/profile.type';
	import type { CharacterSpawn } from '$types/character-spawn.type';

	// The opponent's team when this is a challenge: synthetic OG spawns (see
	// `ogTeamSpawns`). When a full team (TEAM_SIZE) is supplied the red (CPU) side
	// fields it; otherwise the CPU mirrors the player's own team (the classic match).
	export let ogTeam: CharacterSpawn[] = [];
	// The challenged town's geojson feature id. Which town a fight is over is the
	// server's record, not this prop — it is held on the player's open battle and read
	// back from there when the result is reported — so this is only ever used to key
	// and label the fight on screen.
	export let ogLocationId: string | null = null;
	// When true the arena renders a close control to walk out of a fight in progress
	// (used when hosted in a modal, e.g. the map page). `close` is dispatched either
	// way — a decided fight closes itself.
	export let closable = false;

	// Nothing about the fight in progress is a prop: the open battle is read off the
	// service, so the board this arena picks up is always the last one written back —
	// not the one that happened to be loaded when it mounted. A line-up rebuilt
	// mid-fight therefore resumes where the fight actually is, rather than rewinding to
	// wherever the page last looked.
	const openBattle = battleService.open;

	// The board the open battle was left on, if any. Handed to the controller, which
	// refuses a snapshot that does not describe this line-up (see
	// CombatController.restore).
	$: battleBoard = ($openBattle?.board ?? null) as BattleBoardSnapshot | null;

	// The spawn ids that battle is being fought with, in **fielded order** — a fight is
	// fixed at what was put on the board, so a resumed one fields these rather than
	// whatever the roster's active team is now.
	//
	// Read once per battle, and deliberately not derived from the live board: the board
	// is written back every turn, and a line-up that followed it would be rebuilt by
	// the very save it caused — the board tearing itself down and back up, turn after
	// turn. What a battle is being fought with is settled when the battle arrives.
	let battleTeam: string[] = [];
	let battleTeamFor: string | null = null;
	$: syncBattleTeam($openBattle?.startedAt ?? null, $openBattle?.team ?? null, $openBattle?.board ?? null);

	function syncBattleTeam(
		startedAt: string | null,
		team: string[] | null,
		board: BattleBoardSnapshot | null
	): void {
		if (!startedAt) {
			battleTeam = [];
			battleTeamFor = null;
			return;
		}
		if (startedAt === battleTeamFor) return;
		battleTeamFor = startedAt;
		// The line-up the server holds for this battle — proved to be the player's own
		// when it was opened, and therefore the one whose report it will accept. Only a
		// battle opened before it was recorded falls back to reading the board it wrote.
		battleTeam = team?.length === TEAM_SIZE ? [...team] : fieldedTeam(board);
	}

	/**
	 * The player's line-up out of a saved board, back in team order.
	 *
	 * A fighter's slot is its **lane**, and the lanes run top→bottom down the board —
	 * but the team fills its column the other way about, its first member standing
	 * nearest the viewer (`PLAYER_LINEUP_CELLS` is `PLAYER_CELLS` reversed). So the
	 * lane order is the team order backwards, and handing it back the way it is stored
	 * would field the team reversed, quietly putting every fighter in somebody else's
	 * duel.
	 */
	function fieldedTeam(board: BattleBoardSnapshot | null): string[] {
		return (board?.fighters ?? [])
			.filter((fighter) => fighter.side === 'info')
			.sort((a, b) => b.slot - a.slot)
			.map((fighter) => fighter.spawnId);
	}

	// `territory` fires once the server has settled what a finished fight did to the
	// town, so the host (the map) can reload the occupancy it is drawing.
	const dispatch = createEventDispatcher<{ close: void; territory: TerritoryResult }>();
	function close(): void {
		dispatch('close');
	}

	// The glyph each order is given — the same three the cards wear in their corners,
	// and the same three a fighter wears at its own corner for the orders its colour
	// grants it free (see `traitIcons`), so a charge, a guard and a shot are one
	// picture each wherever the game speaks of them.
	const ACTION_ICONS: Record<CombatAction, string> = ORDER_ICONS;

	const characterById = new Map(availableCharacters.map((option) => [option.id, option]));

	// The blue side is the player's team; the red side (the CPU) either mirrors it or,
	// in a challenge, fields the supplied OG team. Both draw from the player's one
	// team — there is no in-board picker.
	const authStatus = authService.status;
	const profile = authService.profile;
	const teamMemberIds = teamService.slots;
	const spawns = spawnService.spawns;

	// The signed-in player, or null. Colours (and the team's characters) come from
	// this player's Supabase spawns, so playing requires being signed in.
	$: currentUserId = $authStatus === AuthStatus.SignedIn && $profile ? String($profile.id) : null;

	// The team that fights. A resumed battle fields the one it was started with — the
	// fight is fixed at what was put on the board, so re-picking the team mid-battle
	// cannot swap a fallen fighter for a fresh one — and any other fight fields the
	// team the player currently holds.
	$: teamMembers =
		battleTeam.length === TEAM_SIZE
			? battleTeam
			: $teamMemberIds.filter((id): id is string => Boolean(id));
	// Every slot has to be one of this player's own claimed spawns. The team is read
	// off those cards, so this can only fail while they are still arriving — or on a
	// battle resumed with a line-up that has been recycled since. A fight fielding
	// those is one the server would refuse the report of, after it had been played
	// out.
	$: ownSpawnIds = new Set(($spawns as CharacterSpawn[]).map((spawn) => spawn.id));
	$: teamReady =
		spawnsLoaded && teamMembers.length === TEAM_SIZE && teamMembers.every((id) => ownSpawnIds.has(id));
	$: playable = !!currentUserId && teamReady;
	// The player's spawns are still on their way: the team cannot be judged yet, so the
	// arena waits rather than announcing there is not one.
	$: spawnsPending = $authStatus === AuthStatus.SignedIn && !spawnsLoaded;

	// A full OG team means the red side fields it instead of mirroring the player's.
	$: challengeReady = ogTeam.length === TEAM_SIZE;

	// Load the player's spawns once signed in, so their rolled colours are available.
	// Nothing else is fetched: the board draws fighters and the orders they can be
	// given, and a fighter's rarity, show and claim place belonged to the trading card
	// that used to sit beside it.
	let loadedForUser: string | null = null;
	let spawnsLoaded = false;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		spawnsLoaded = false;
		void spawnService.loadSpawns(currentUserId).then(() => (spawnsLoaded = true));
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

	// Where each side opens. Both sides' ground belongs to the controller — it is what
	// decides who faces whom, and it is what walks the winner of a lane on or off the
	// white cell it was fought over — so the cells are taken from there rather than
	// restated here: the rivals on the board's central white column, the player's team
	// on the far column of its own half, facing them.
	//
	// The controller lists each line top→bottom on screen; the player's team fills its
	// column the other way about, its first slot standing nearest the viewer, so the
	// cells are handed out bottom→top here.
	const PLAYER_LINEUP_CELLS: Hex[] = [...PLAYER_CELLS].reverse();

	// The two sides can field the SAME spawn line-up (a mirror match), so a bare spawn
	// id is not unique across the board. Every board actor / fighter is identified by a
	// per-side instance id (`error:<spawnId>`); the underlying spawn (for its assets,
	// definition and colour) is recovered via spawnById. Without this, id lookups
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
		spawns: Map<string, CharacterSpawn>
	): BoardCharacter {
		const spawn = spawns.get(spawnId);
		const option = (spawn && characterById.get(spawn.characterId)) ?? availableCharacters[0];
		return {
			id: instanceId(side, spawnId),
			basePath: option.basePath,
			animation: 'idle'
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
	// the board's top→bottom order are one and the same. Rebuilt whenever a slot or a
	// spawn changes. `spawns` is passed in explicitly so Svelte's legacy reactive
	// tracking sees the spawn map as a dependency of `grids`.
	function buildGrids(
		ids: string[],
		spawns: Map<string, CharacterSpawn>
	): [BoardGrid, BoardGrid] {
		const half = (side: 'error' | 'info', offset: number, cells: Hex[], fallback: number) => ({
			color: leaderColorHex(ids[offset], spawns, fallback),
			character: {
				...boardCharacter(ids[offset], side, spawns),
				...cells[0]
			},
			extras: cells.slice(1).map((cell, i) => ({
				...boardCharacter(ids[offset + 1 + i], side, spawns),
				...cell
			}))
		});
		return [
			half('error', 0, RIVAL_CELLS, 0xff0000),
			half('info', 3, PLAYER_LINEUP_CELLS, 0x2563eb)
		];
	}

	$: grids = buildGrids(slots, spawnById);
	// Remounts the Pixi board (and thus repositions everyone) on any slot change or
	// spawn-colour change (so home cells and order buttons repaint once colours load).
	// A finished fight never restarts in place — the arena closes — so there is nothing
	// else to key on.
	$: boardKey = `${slots.join(',')}:${slots
		.map((id) => spawnById.get(id)?.color ?? '')
		.join(',')}`;

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

	function onBoardReady(engine: MugenBoardEngine): void {
		board = engine;
		engine.onOrder(giveOrder);
		controller?.attachBoard(engine);
	}

	/**
	 * A button beside a fighter was tapped. The board only reports which one; what an
	 * order means is the controller's, as it is for every other input.
	 *
	 * There are only three orders and each button is one of them. What a fighter's
	 * colour adds on top is never tapped for — it is passive, it comes off the back of
	 * whatever order *was* given, and the corner glyphs are where it is read.
	 */
	function giveOrder(fighterId: string, orderId: string): void {
		controller?.setAction(fighterId, orderId as CombatAction);
	}

	/**
	 * The three orders drawn beside one of the player's fighters. Every one of them is
	 * always drawn — an order out of reach is greyed rather than dropped, so a
	 * fighter's column never changes shape under the cursor — and all of them lock while a
	 * turn is playing out.
	 */
	function orderButtons(fighter: FighterView, phase: CombatState['phase']): BoardOrder[] {
		const locked = phase !== 'planning';
		return COMBAT_ACTIONS.map((action) => ({
			id: action,
			icon: ACTION_ICONS[action],
			selected: fighter.action === action,
			disabled: locked || (action === 'shoot' && !fighter.canShoot)
		}));
	}

	// Push the player's orders onto the board whenever the fight moves. Both `state`
	// and `board` are named so Svelte's legacy reactive tracking sees them as
	// dependencies; the board itself only redraws what actually changed.
	$: syncOrders(state, board);

	function syncOrders(current: CombatState | null, engine: MugenBoardEngine | null): void {
		if (!engine || !current) return;
		for (const fighter of current.fighters) {
			// Only the player is given orders; the rivals commit theirs out of sight, and
			// a fighter that has gone down has left the board along with its buttons.
			if (fighter.side !== 'info' || fighter.down) continue;
			// A fighter standing on the white cell it won has settled its lane and is asked
			// for nothing more, so its buttons come off the board rather than standing there
			// offering orders that would do nothing. An empty list is what clears a strip.
			const orders = fighter.holdsGround ? [] : orderButtons(fighter, current.phase);
			engine.setOrders(fighter.id, orders);
		}
	}

	// Bumped on every setup() call so a stale in-flight load can't clobber a
	// newer roster after the line-up changes mid-fetch.
	let setupToken = 0;

	// (Re)build the fight from the current slots: load each participant's manifest and
	// definition and hand a fresh CombatController the fighters. Runs whenever the
	// playable line-up changes.
	async function setup(): Promise<void> {
		const token = ++setupToken;
		const currentGrids = buildGrids(slots, spawnById);
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
				// spawn (its rolled colour) and the character id (which keys the
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
				const faceFile = definition.face || manifest.face?.file || null;
				return {
					...entry,
					name: manifest.name,
					face: faceFile ? `${entry.basePath}/${faceFile}` : null,
					moves: definition.moves ?? [],
					color
				};
			})
		);
		if (token !== setupToken) return;

		badges = loaded;

		// Hand the fighters to the combat controller and wire its store. Its colour is
		// the whole of what makes one fighter play differently from another — there is
		// nothing else to a card in a fight.
		const seeds: FighterSeed[] = badges.map((badge) => ({
			id: badge.id,
			// The spawn behind the instance id, so a won fight can be reported for
			// experience against the actual `character_spawns` rows fielded.
			spawnId: spawnIdOf(badge.id),
			name: badge.name,
			side: badge.side,
			color: badge.color,
			moves: badge.moves
		}));
		unsubscribe?.();
		// Read at the moment the controller is built, not captured earlier: whatever the
		// last closed turn wrote back is what this fight resumes from.
		controller = new CombatController(seeds, battleBoard);
		savedTurn = 0;
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
	}

	// The turn whose board has already been written back, so each is saved once.
	let savedTurn = 0;

	// Write the board back as each turn closes — and once as the fight opens, so a
	// battle left before a single order is given still comes back to this board rather
	// than to a freshly rolled one. `state` and `controller` are both named so Svelte's
	// legacy reactive tracking sees them as dependencies.
	$: void saveBoard(state, controller);

	async function saveBoard(
		current: CombatState | null,
		ctrl: CombatController | null
	): Promise<void> {
		// Only between turns: mid-resolution the board is half-played, and a decided
		// fight is about to be reported, which deletes the battle outright.
		if (!current || !ctrl || current.phase !== 'planning' || current.outcome) return;
		if (current.turn === savedTurn) return;
		savedTurn = current.turn;
		try {
			await battleService.save(ctrl.snapshot());
		} catch {
			// A turn that failed to save costs the player that one turn of resumption if
			// they walk away right now. It is not worth interrupting the fight for.
		}
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

	// A decided fight is over: report it, then leave. There is nothing left to play on
	// the board, so the arena closes itself rather than putting a dialog over it. The
	// close waits on the report so the host still gets the `territory` event — that is
	// what redraws the town.
	async function reportOutcome(
		current: CombatState | null,
		ctrl: CombatController | null
	): Promise<void> {
		if (!current?.outcome || !ctrl || reportedFor === ctrl) return;
		reportedFor = ctrl;
		await sendReport(ctrl);
	}

	// Why the server refused the last report, or null while none has been refused. The
	// arena stays open on it and says so.
	let reportFailure: string | null = null;
	// True while a report is in flight, so the fight cannot be reported twice over.
	let reporting = false;

	/**
	 * Hand the finished fight to the server, and leave once it has been taken.
	 *
	 * A refusal is not a shrug. Reporting is what *ends* the battle — the row is deleted
	 * inside the same RPC that pays the award — so a report the server turns down leaves
	 * the player in this fight, and closing on it would put them straight back into the
	 * very same board, to win it again and be refused again, with nothing on screen ever
	 * saying why. So the arena holds, shows what the server said, and offers the report
	 * again: the fight is only walked away from once it has actually been settled, or
	 * once the player closes it themselves.
	 */
	async function sendReport(ctrl: CombatController): Promise<void> {
		const report = ctrl.report();
		if (!report) {
			close();
			return;
		}
		reporting = true;
		reportFailure = null;
		try {
			// The amount, which town this was, and whether it changed hands are all the
			// server's to decide — read off the open battle it has been holding since
			// the fight started. This only states how the fight went.
			const reward: CombatReward | null = await authService.reportCombat({
				...report,
				fighters: inTeamOrder(report.fighters)
			});
			// Reporting is what ends the battle server-side, so let go of it here too —
			// the map must stop offering the way back into a fight that is over.
			battleService.clear();
			// Let the host redraw the town: a capture rewrites its team and its
			// turnover, and even a banked win moves the progress it shows.
			if (reward?.territory) dispatch('territory', reward.territory);
		} catch (error) {
			// The battle is left alone: the server still has it open and the player is
			// still in it, which is exactly what the message has to be read against. The
			// box below carries the sentence; the console carries the whole refusal —
			// Postgres' code, detail and hint — which is what a bug report is made of.
			console.error('Combat report refused', error);
			reportFailure = refusal(error);
			return;
		} finally {
			reporting = false;
		}
		close();
	}

	/** Hand the same finished fight over again, after a refusal. */
	function retryReport(): void {
		if (!controller || reporting) return;
		void sendReport(controller);
	}

	// What the server said, as it said it. Supabase hands back a plain object rather
	// than an Error, so both shapes are read before falling back to a line of our own.
	function refusal(error: unknown): string {
		const message =
			error instanceof Error
				? error.message
				: String((error as { message?: unknown } | null)?.message ?? '');
		return message.trim() || 'The server would not take the result of this fight.';
	}

	onMount(() => authService.init());

	onDestroy(() => unsubscribe?.());

	// (Re)build the fight whenever the playable line-up or its colours change. The key
	// folds in each slot's character id and its resolved spawn colour, so the
	// controller is rebuilt only on a real change — not on every unrelated tick.
	$: fightKey =
		playable && spawnsLoaded
			? `${slots.join(',')}|${slots.map((id) => spawnById.get(id)?.color ?? '').join(',')}`
			: '';
	let lastFightKey = '';
	$: if (fightKey && fightKey !== lastFightKey) {
		lastFightKey = fightKey;
		void setup();
	}

</script>

<div class="flex w-full flex-col items-center gap-4">
	{#if state || closable}
		<!-- The score in the top-left corner and the way out of the fight in the
		     top-right, and nothing else above the board. -->
		<div class="flex w-full items-center gap-2">
			{#if state}
				<!-- Encounters won, yours first: the fight is three duels and this is what
				     each side has taken of them. Each count is drawn in its own side's
				     colour, the same one that side's fighters hold the board in. -->
				<p class="font-mono text-lg font-bold tabular-nums" aria-label="Encounters won">
					<span class="text-info">{state.wins.info}</span>
					<span class="opacity-40">–</span>
					<span class="text-error">{state.wins.error}</span>
				</p>
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
	{:else if $authStatus === AuthStatus.Loading || spawnsPending}
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
		<!-- Signed in, but there's no team ready to field. -->
		<div class="card max-w-md bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<h2 class="card-title">No team to field</h2>
				<p class="text-sm opacity-70">
					Your team needs all {TEAM_SIZE} slots filled with cards you have claimed — finish it on
					your roster.
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
				<!-- Nothing stands between the fight and the board: what a rival is holding
				     and what it has just done are read off the board itself — its aura, its
				     callout, whether it is still standing — not off a readout beside it. -->
				<div class="flex w-full min-w-0 flex-col items-center gap-3">
					{#key boardKey}
						<MugenBoard {grids} on:ready={(event) => onBoardReady(event.detail)} />
					{/key}
				</div>
				{#if reportFailure}
					<!-- The fight is played out and the server would not take it. The board
					     stands as it finished, with the refusal in the server's own words —
					     the battle is still open, so this is the fight the player is in, not
					     a fight they have lost track of. -->
					<div class="alert alert-error max-w-md text-sm" role="alert">
						<span>{reportFailure}</span>
					</div>
					<button
						type="button"
						class="btn btn-primary btn-wide"
						disabled={reporting}
						on:click={retryReport}
					>
						{#if reporting}
							<span class="loading loading-spinner loading-xs"></span>
							Reporting the fight
						{:else}
							Report the fight again
						{/if}
					</button>
				{:else if state}
					<!-- The two controls the fight has, and nothing under them: what just
					     happened was played out on the board, so it is not also recounted
					     here in words. -->
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
					<!-- The way out of a fight, and the only one there is: a battle is ended by
					     a result, never by walking off, so giving it up reports the loss it is
					     and closes the arena exactly as being wiped out would. Between turns
					     only — a turn already being carried out settles itself. -->
					<button
						type="button"
						class="btn btn-ghost btn-sm text-error"
						disabled={state.phase !== 'planning'}
						on:click={() => controller?.concede()}
					>
						Admit defeat
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
