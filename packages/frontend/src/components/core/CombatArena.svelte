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
		MugenBoard as MugenBoardEngine
	} from '$utils/mugen/mugen-board';
	import type { Cell } from '$utils/mugen/grid';
	import { standingLine, type StandingFighter } from '$utils/mugen/board-standing';
	import type { Manifest } from '$utils/mugen/mugen-player';
	import {
		boardFitsLineup,
		CombatController,
		COMBAT_ACTIONS,
		PLAYER_CELLS,
		RIVAL_CELLS,
		type CombatAction,
		type CombatState,
		type FighterView,
		type FighterSeed,
		type LineupFighter
	} from '$services/combat.controller';
	import type {
		CombatOutcome,
		CombatReport,
		CombatReward,
		TerritoryResult
	} from '$types/combat.type';
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
	// True while a finished fight is on its way to the server. Exported so the sheet this
	// arena is drawn on can hold its own way out shut for that moment — reporting is what
	// ends the battle, so a player let out before it lands walks away from a fight the
	// server still has open, and the town it was over never gets redrawn. Written from in
	// here and only ever read out (`bind:reporting` on the host).
	export let reporting = false;

	// Nothing about the fight in progress is a prop: the open battle is read off the
	// service, so the board this arena picks up is always the last one written back —
	// not the one that happened to be loaded when it mounted. A line-up rebuilt
	// mid-fight therefore resumes where the fight actually is, rather than rewinding to
	// wherever the page last looked.
	const openBattle = battleService.open;

	// The board the open battle was left on, if any — the live one, rewritten by every
	// turn this arena closes.
	$: battleBoard = ($openBattle?.board ?? null) as BattleBoardSnapshot | null;

	// The board *this* fight was built from: `battleBoard` as it stood when the fight was
	// set up, and then held still for the rest of it. It is the one thing both halves of a
	// resumed fight read — the controller restores the state off it, and the grids stand
	// everyone on the ground it records — so what the player sees and what the fight
	// believes can never be two different fights.
	let placement: BattleBoardSnapshot | null = null;

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
	 * A fighter's slot is its **lane**, and the lanes run top→bottom down the board, which
	 * is the order the team is fielded in: the lead takes the top row and the rest of the
	 * party unfolds downwards from it. So slot order *is* team order and this only has to
	 * sort by it — but it does have to sort, because nothing promises a saved board's rows
	 * come back in the order they were written, and a line-up assembled in the wrong order
	 * would quietly put every fighter in somebody else's duel.
	 */
	function fieldedTeam(board: BattleBoardSnapshot | null): string[] {
		return (board?.fighters ?? [])
			.filter((fighter) => fighter.side === 'info')
			.sort((a, b) => a.slot - b.slot)
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

	// The lanes of the fight, 1..n, for the score's rings: one ring per lane, filled once
	// that many have been won. A lane is a fighter of each side and the white cell between
	// them, so there are as many of them as a team has members — the score is drawn from
	// the same count the team is built to, and cannot come to say a fight is longer or
	// shorter than it is.
	const LANES = Array.from({ length: TEAM_SIZE }, (_, index) => index + 1);

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
	// restated here: the rivals at the front of their own half, the player's team on
	// column e at the front of theirs, level with them row for row and the white column
	// standing empty between the two.
	//
	// Both lines are filled the same way round: the party's lead on the top row, the rest
	// of it unfolding downwards in the order the team is held in. So slot one faces slot
	// one across the board, and reading either line down the screen reads that party in
	// its own order. The player's used to fill its column upwards, its lead nearest the
	// viewer, which put the two parties' leads in different lanes and made the player's
	// line the one you read bottom to top.

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

	// Each side's cells take the colour of that side's leader — the team's first slot
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

	// Left: the rival line at the front of its own half; right: the player's
	// team on column e, the front of its own — the white column between them starts
	// empty, being the ground the lanes are played for. Each side's first slot leads (it is the grid's own
	// character, the rest are extras) and stands on the topmost cell, so team order and
	// the board's top→bottom order are one and the same. Rebuilt whenever a slot or a
	// spawn changes. `spawns` is passed in explicitly so Svelte's legacy reactive
	// tracking sees the spawn map as a dependency of `grids`.
	//
	// Those cells are where a line *opens*, and a fight being picked up did not stop
	// there: `resumed` is the board the battle was left on, and it is what actually
	// stands the fighters up — each on the ground it holds, the fallen included, since
	// being beaten moves a fighter to the back of its own half rather than taking it off
	// the board. Without it a reloaded fight redraws itself as a fresh one — everybody
	// back on their opening cells — over a controller that knows better, and the picture
	// is a lie about the score.
	function buildGrids(
		ids: string[],
		spawns: Map<string, CharacterSpawn>,
		resumed: BattleBoardSnapshot | null
	): [BoardGrid, BoardGrid] {
		// Matched by the instance id, not by the spawn: the two sides can field the same
		// spawn (a mirror match), and each of them stands somewhere of its own. Whether a
		// fighter is still in the fight says nothing about where it is drawn, so it is not
		// passed on: every fighter the board records is stood back up on the cell it records.
		const held: StandingFighter[] = (resumed?.fighters ?? []).map((fighter) => ({
			id: instanceId(fighter.side, fighter.spawnId),
			cell: fighter.cell
		}));
		const half = (
			side: 'error' | 'info',
			offset: number,
			cells: Cell[],
			fallback: number
		): BoardGrid => {
			const characters = new Map(
				cells.map((cell, index) => {
					const character = boardCharacter(ids[offset + index], side, spawns);
					return [character.id as string, { character, opening: cell }];
				})
			);
			const placed = standingLine(
				[...characters].map(([id, entry]) => ({ id, opening: entry.opening })),
				held
			).map((entry) => ({ ...characters.get(entry.id)!.character, ...entry.cell }));
			return {
				color: leaderColorHex(ids[offset], spawns, fallback),
				character: placed[0],
				extras: placed.slice(1)
			};
		};
		return [
			half('error', 0, RIVAL_CELLS, 0xff0000),
			half('info', 3, PLAYER_CELLS, 0x2563eb)
		];
	}

	$: grids = buildGrids(slots, spawnById, placement);
	// Remounts the Pixi board (and thus repositions everyone) on any slot change or
	// spawn-colour change (so home cells and order buttons repaint once colours load).
	// A finished fight never restarts in place — the arena closes — so there is nothing
	// else to key on: the board a fight is resumed onto is settled once, with the fight
	// itself, and never moves under a running one (see `placement`).
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

	// One side's whole line, in the order the controller is seeded in: sorted by where
	// that side's slots stand top→bottom on screen, which is the order the lanes are
	// numbered in and the order a saved board's slots mean.
	//
	// Read off the cells the line **opens** on, never off where anybody is standing now.
	// A fighter that has taken ground stands somewhere else and a fallen one stands
	// nowhere, so seeding from the live board would renumber the lanes of the very fight
	// being resumed — every fighter into somebody else's duel — and would refuse the
	// board outright once a side is short. The line-up is the whole six, the fallen
	// included: they are gone from the canvas, not from the fight.
	function rosterFor(
		ids: string[],
		side: 'error' | 'info',
		offset: number,
		cells: Cell[],
		spawns: Map<string, CharacterSpawn>
	): Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] {
		return cells
			.map((cell, index) => {
				const character = boardCharacter(ids[offset + index], side, spawns);
				return {
					id: character.id as string,
					basePath: character.basePath,
					side,
					// Vertical on-screen position of the opening cell.
					gridY: cellScreenY(cell)
				};
			})
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
	 * The slot over a fighter's three orders: what its colour did for it, free, on the turn
	 * it was owed something.
	 *
	 * It is empty for most of a fight and for most fighters, and that is the point of its
	 * being a slot rather than a button that appears. A gift only ever fires beside an order
	 * the player gave — never as the order they gave — so what goes in here is a *second*
	 * thing the fighter did that turn, and reading it needs the column it happened in to
	 * have looked the same before it happened. A column that grew a fourth button would be
	 * three fighters' columns changing shape mid-turn.
	 *
	 * Once something goes in, it stays: a gift is worth one use in the whole battle, so this
	 * is the fight's record of what a colour was worth and not a light that comes on for a
	 * turn. Only a gift that *did* something goes in — the controller keeps `used` apart
	 * from `spent` for exactly this — because a gift that ran out unused did nothing to
	 * record.
	 *
	 * A colour that mixes two primaries can fire both on the opening turn and there is one
	 * slot; the first to fire is the one it keeps.
	 */
	function passiveSlot(fighter: FighterView): BoardOrder {
		const done = fighter.used[0];
		if (!done) {
			return {
				id: 'passive',
				icon: '',
				selected: false,
				disabled: false,
				readonly: true,
				empty: true,
				color: fighter.color
			};
		}
		return {
			// Named for what is in it, so the strip is rebuilt when the slot fills rather
			// than repainted — an empty slot has no glyph loaded to swap.
			id: `passive:${done}`,
			icon: ACTION_ICONS[done],
			// Filled in the fighter's colour like the order it was given beside: both are
			// things this fighter did, and the colour is how this board says whose.
			selected: true,
			disabled: false,
			readonly: true,
			color: fighter.color
		};
	}

	/**
	 * The column beside one of the player's fighters: its colour's slot, and under it the
	 * three orders it can be given. Every one of the three is always drawn — an order out of
	 * reach is greyed rather than dropped, so a fighter's column never changes shape under
	 * the cursor — and all of them lock while a turn is playing out.
	 */
	function orderButtons(fighter: FighterView, phase: CombatState['phase']): BoardOrder[] {
		const locked = phase !== 'planning';
		return [
			passiveSlot(fighter),
			...COMBAT_ACTIONS.map((action) => ({
				id: action,
				icon: ACTION_ICONS[action],
				selected: fighter.action === action,
				disabled: locked || (action === 'shoot' && !fighter.canShoot),
				color: fighter.color
			}))
		];
	}

	/**
	 * The same three orders beside a rival — and they are the same three, because that is
	 * the whole of what the player is guessing at. The column is not an input: it is never
	 * tapped, and it says nothing about what the rival *can* do, only what it turned out to
	 * have done. So none of them is greyed for being out of reach, which would answer the
	 * question the fight is asking, and none is chosen while the rival's order is still
	 * secret — the controller withholds a rival's `action` right through planning and hands
	 * it over as the turn is carried out, so the button lights up at the moment the fighter
	 * acts and stays lit for the rest of the turn.
	 *
	 * It lights up in the fighter's own colour, as the player's own column does. And it
	 * carries the same colour slot over it: what a rival's colour did for it is not a secret
	 * — it has already happened by the time it is drawn — and it is a thing the player has
	 * to be able to count, since a gift fired is a gift that will not fire again.
	 */
	function rivalOrderButtons(fighter: FighterView): BoardOrder[] {
		return [
			passiveSlot(fighter),
			...COMBAT_ACTIONS.map((action) => ({
				id: action,
				icon: ACTION_ICONS[action],
				selected: fighter.action === action,
				disabled: false,
				readonly: true,
				color: fighter.color
			}))
		];
	}

	// Push every fighter's orders onto the board whenever the fight moves. Both `state`
	// and `board` are named so Svelte's legacy reactive tracking sees them as
	// dependencies; the board itself only redraws what actually changed.
	$: syncOrders(state, board);

	function syncOrders(current: CombatState | null, engine: MugenBoardEngine | null): void {
		if (!engine || !current) return;
		for (const fighter of current.fighters) {
			// Two fighters are asked for nothing more and keep no buttons: one standing on the
			// white cell it won, which has settled its lane, and one that has been taken down,
			// which is still on the board — at the back of its own half — and must not go on
			// wearing a column of orders it can never be given, or be shown one it can never
			// carry out. An empty list is what clears a strip.
			const spent = fighter.down || fighter.holdsGround;
			if (spent) {
				engine.setOrders(fighter.id, []);
				continue;
			}
			// Both sides wear a column; only the player's is a way of giving an order. The
			// rival's is the same three glyphs read back to the player.
			//
			// Each stands off the outer shoulder of its own fighter — the player's team holds
			// the right-hand half of the board and wears its columns to the right, the rivals
			// the left half and theirs to the left. So a column never stands between the two
			// sides, over the ground they are fighting for and against the fighter opposite,
			// and each team's orders read as one block down that team's own edge.
			engine.setOrders(
				fighter.id,
				fighter.side === 'info'
					? orderButtons(fighter, current.phase)
					: rivalOrderButtons(fighter),
				fighter.side === 'info' ? 'right' : 'left'
			);
		}
	}

	// The line-up the controller will be seeded with, as identities alone: both sides in
	// seed order, which is the order a saved board's slots are numbered in. Built without
	// fetching anything, so whether a board is this fight's can be asked before the fight
	// is built — and it is, because the board's own placement rides on the answer.
	function lineupOf(ids: string[]): LineupFighter[] {
		return [
			...rosterFor(ids, 'error', 0, RIVAL_CELLS, spawnById),
			...rosterFor(ids, 'info', 3, PLAYER_CELLS, spawnById)
		].map((entry) => ({ side: entry.side, spawnId: spawnIdOf(entry.id) }));
	}

	// Bumped on every setup() call so a stale in-flight load can't clobber a
	// newer roster after the line-up changes mid-fetch.
	let setupToken = 0;

	// (Re)build the fight from the current slots: load each participant's manifest and
	// definition and hand a fresh CombatController the fighters. Runs whenever the
	// playable line-up changes.
	async function setup(): Promise<void> {
		const token = ++setupToken;
		const roster: Pick<Badge, 'id' | 'basePath' | 'side' | 'gridY'>[] = [
			...rosterFor(slots, 'error', 0, RIVAL_CELLS, spawnById),
			...rosterFor(slots, 'info', 3, PLAYER_CELLS, spawnById)
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
		// last closed turn wrote back is what this fight resumes from — and it is the same
		// board `placement` stood the fighters up on.
		controller = new CombatController(seeds, placement);
		savedTurn = 0;
		savingTurn = 0;
		saveFailure = null;
		unsubscribe = controller.subscribe((next) => (state = next));
		if (board) controller.attachBoard(board);
	}

	// The turn whose board the server has taken, so each is written back once.
	let savedTurn = 0;
	// The turn being written back right now, or 0 while nothing is in flight — both the
	// re-entry guard (the store emits several times a turn) and what the button reads.
	let savingTurn = 0;
	// Why the server would not take the last turn, or null. While it is set the fight
	// holds: the next turn cannot be committed on top of one that was never recorded.
	let saveFailure: string | null = null;

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
		if (current.turn === savedTurn || current.turn === savingTurn) return;
		await writeBoard(ctrl, current.turn);
	}

	/**
	 * Hand the board as this turn opens to the player's battle row, and only call the
	 * turn before it closed once the server has it.
	 *
	 * A turn is not over when it has been played out on screen — it is over when it has
	 * been recorded, because the fight lives in that row and not in this tab. So a write
	 * that fails is not shrugged off: the fight holds where it is, says so, and offers
	 * the write again. Playing on over a refused save would build turns on top of a
	 * board the server never took, and every one of them would be gone on the next
	 * reload — which is exactly the thing being prevented.
	 *
	 * The row is never created here and never duplicated: `save_battle` updates the one
	 * row the player has open (its primary key is the player), so a fight has exactly one
	 * record of itself from the moment it is opened to the moment it is reported.
	 */
	async function writeBoard(ctrl: CombatController, turn: number): Promise<void> {
		savingTurn = turn;
		saveFailure = null;
		try {
			await battleService.save(ctrl.snapshot());
			savedTurn = turn;
		} catch (error) {
			// The whole refusal to the console — Postgres' code, detail and hint — and its
			// sentence to the player, as with a refused report.
			console.error('Battle save refused', error);
			saveFailure = refusal(error, 'This turn could not be saved — the fight is waiting on it.');
		} finally {
			savingTurn = 0;
		}
	}

	// Close the turn the moment there is nothing left to decide about it. A turn used to
	// be closed by a button, and that button was only ever tappable on this exact
	// condition — every standing fighter ordered, this turn's board already recorded, and
	// nothing refused — so the condition is the whole of what a commit was: pressing it
	// was a formality over a decision the orders had already made. Ordering the last
	// fighter is therefore what plays the turn out.
	//
	// The board is still written before the turn moves, not after it: `saveBoard` runs
	// first (it is declared above) and holds `savingTurn` while the write is in flight,
	// so the fight cannot play on over a turn the server has not taken — the same hold
	// the button sat under. Every name here is spelled out so Svelte's legacy reactive
	// tracking sees all four as dependencies, `savingTurn` included: it is what re-runs
	// this once a save lands.
	$: commitWhenReady(state, controller, savingTurn, saveFailure);

	function commitWhenReady(
		current: CombatState | null,
		ctrl: CombatController | null,
		saving: number,
		failure: string | null
	): void {
		if (!current || !ctrl || !current.ready || saving !== 0 || failure) return;
		ctrl.commit();
	}

	/** Write the same turn back again, after a refusal. */
	function retrySave(): void {
		if (!controller || !state || savingTurn) return;
		void writeBoard(controller, state.turn);
	}

	// The controller whose result has already been reported, so the award fires
	// exactly once per game.
	let reportedFor: CombatController | null = null;

	// Report the fight the moment it is decided. Both `state` and `controller` are
	// named here so Svelte's legacy reactive tracking sees them as dependencies.
	$: void reportOutcome(state, controller);

	// The player's fighters back in the order the team was built — slots 3–5, i.e. the
	// roster's team order. The line-up the controller hands over is the board's top→bottom
	// order, which is the team's own order now that the lead fills the top row: this sorts
	// a list that should already be in step. It stays because a captured town freezes the
	// reported line-up verbatim as its garrison and the map's panel draws the town's team
	// from it — the one place the order outlives the fight is not the place to be relying
	// on two orders happening to agree.
	function inTeamOrder(fighters: CombatReport['fighters']): CombatReport['fighters'] {
		const fielded = slots.slice(TEAM_SIZE);
		if (fielded.length === 0) return fighters;
		const rank = new Map(fielded.map((spawnId, index) => [spawnId, index]));
		return [...fighters].sort(
			(a, b) => (rank.get(a.spawnId) ?? fielded.length) - (rank.get(b.spawnId) ?? fielded.length)
		);
	}

	// A decided fight is over: report it, and then stand still. The arena does not walk
	// itself out — the board stays up with the result read out under it, and it is left
	// when the player says so (see `reward` and the Close button).
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
	// What the server paid for the finished fight, once it has taken the report: the
	// experience it awarded and the team it counted to arrive at it. Null until then —
	// which is what the results block reads to know whether the number is in yet.
	//
	// It is the *server's* account of the fight, not this tab's, which is the only one
	// worth showing: the amount is decided from the player's stored experience by the
	// same RPC that banks it, so a figure worked out here would be a guess at what was
	// actually paid.
	let reward: CombatReward | null = null;

	/**
	 * Hand the finished fight to the server, and stay where we are once it has been taken.
	 *
	 * A refusal is not a shrug. Reporting is what *ends* the battle — the row is deleted
	 * inside the same RPC that pays the award — so a report the server turns down leaves
	 * the player in this fight, and closing on it would put them straight back into the
	 * very same board, to win it again and be refused again, with nothing on screen ever
	 * saying why. So the arena holds, shows what the server said, and offers the report
	 * again.
	 *
	 * A report the server *takes* does not close the arena either. The fight is over and
	 * there is something to say about it — how it went and what it earned — so the board
	 * stays up with the result under it and the player leaves when they have read it. An
	 * arena that walked itself out the moment the last fighter fell was throwing that
	 * away: the one screen that could say what the fight was worth appeared for no time
	 * at all.
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
			const paid: CombatReward | null = await authService.reportCombat({
				...report,
				fighters: inTeamOrder(report.fighters)
			});
			// Reporting is what ends the battle server-side, so let go of it here too —
			// the map must stop offering the way back into a fight that is over.
			battleService.clear();
			// Let the host redraw the town: a capture rewrites its team and its
			// turnover, and even a banked win moves the progress it shows.
			if (paid?.territory) dispatch('territory', paid.territory);
			// What the fight earned, for the block under the board to read out.
			reward = paid;
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
	}

	/** Hand the same finished fight over again, after a refusal. */
	function retryReport(): void {
		if (!controller || reporting) return;
		void sendReport(controller);
	}

	// How a finished fight is headed, and in whose colour. The three outcomes are the
	// player's — a fight is always read from their side — so a win is the info colour the
	// player's own line holds the board in and a loss is the rivals' error colour, the
	// same two the score above the board is counted in.
	const OUTCOME_LABELS: Record<CombatOutcome, string> = {
		win: 'You won the fight',
		lose: 'You lost the fight',
		draw: 'The fight was a draw'
	};
	const OUTCOME_CLASSES: Record<CombatOutcome, string> = {
		win: 'text-info',
		lose: 'text-error',
		draw: 'opacity-70'
	};

	// What the server said, as it said it. Supabase hands back a plain object rather
	// than an Error, so both shapes are read before falling back to a line of our own.
	function refusal(
		error: unknown,
		fallback = 'The server would not take the result of this fight.'
	): string {
		const message =
			error instanceof Error
				? error.message
				: String((error as { message?: unknown } | null)?.message ?? '');
		return message.trim() || fallback;
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
		// The board this fight is picked up from, taken once — here, where the fight is
		// built — and not followed afterwards. Every closed turn writes a new board to the
		// open battle, so a placement that tracked `battleBoard` would restand the
		// line-up in the middle of the fight that just moved it. What a fight resumes
		// from is settled when the fight is built, and the controller is handed the very
		// same board (see `setup`).
		//
		// A board this line-up cannot take is dropped here rather than half-used: the
		// fight would refuse it anyway and start fresh, and drawing a line-up on it
		// meanwhile would leave the canvas showing a fight nobody is playing.
		placement = boardFitsLineup(battleBoard, lineupOf(slots)) ? battleBoard : null;
		void setup();
	}

</script>

<!-- The arena is the sheet: it takes the whole of it and centres one thing in it. That one
     thing is the board while there is a fight to draw, and a card saying why there is not
     otherwise — those carry their own margin, since a card wants to stand off the edge of a
     screen and a board does not. -->
<div class="flex h-full w-full items-center justify-center">
	{#if !authService.configured}
		<div class="alert alert-warning m-6 max-w-md text-sm">
			<span>Sign-in is unavailable — Supabase is not configured, so no team can be played.</span>
		</div>
	{:else if $authStatus === AuthStatus.Loading || spawnsPending}
		<span class="loading loading-spinner loading-md"></span>
	{:else if $authStatus !== AuthStatus.SignedIn}
		<div class="card m-6 max-w-md bg-base-100 shadow-xl">
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
		<div class="card m-6 max-w-md bg-base-100 shadow-xl">
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
		<!-- The board, and nothing round it. No card, no body, no column: the arena is one
		     drawing and every box round a drawing is scale taken off it, since the canvas is
		     fitted to the room it is given. What used to stand under the board stands on it
		     now — the score at its head, the way out at its foot, and whatever the fight has
		     to say in the middle.
		     This box hugs the canvas rather than filling the sheet: it is a flex item and the
		     canvas is its only child in flow, so it is exactly the canvas on both axes, which
		     is what makes `inset-0` on the three overlays mean the board's own edges and not
		     the viewport's. -->
		<div class="relative">
			{#key boardKey}
				<!-- The border goes on the canvas rather than on the host: the host is
				     full-width and centres a canvas that is narrower than it, so a border
				     there would be drawn round the room around the board instead of round
				     the board. Pixi owns the canvas element, so it is reached as the
				     wrapper's child. -->
				<MugenBoard
					{grids}
					classes="[&>canvas]:border-4 [&>canvas]:border-yellow-400"
					on:ready={(event) => onBoardReady(event.detail)}
				/>
			{/key}
			{#if state && !state.outcome}
				<!-- The score, over the top of the board it is a score of.
				     The fight is three duels, each played for one cell of the white column
				     down the middle of the board, so the score is drawn as that ground:
				     three rings a side, one filled for each of the three a side has taken.
				     A number said how many; these say which of a known three, so a fight
				     that is one duel from over looks like it. Each side's rings sit over
				     the half of the board that side holds — the rivals' to the left, the
				     player's to the right — and are drawn in that side's own colour, the
				     one its fighters hold the ground in.
				     Between them, the turn, which is the other thing a fight is counted
				     in and belongs between the two counts rather than beside one of them.
				     While the fight is running only: a decided one reads its score off the
				     panel in the middle of the board, and the same score at both ends of
				     one canvas would be one score too many. -->
				<div
					class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-4 p-3"
				>
					<div class="flex gap-1.5" aria-label="Encounters won by the rival team">
						{#each LANES as lane}
							<span
								class={classNames(
									'h-3 w-3 rounded-full border-2 border-error',
									lane <= state.wins.error && 'bg-error'
								)}
							></span>
						{/each}
					</div>
					<span class="font-mono text-sm font-bold tabular-nums opacity-70">
						Turn {state.turn}
					</span>
					<div class="flex gap-1.5" aria-label="Encounters won by your team">
						{#each LANES as lane}
							<span
								class={classNames(
									'h-3 w-3 rounded-full border-2 border-info',
									lane <= state.wins.info && 'bg-info'
								)}
							></span>
						{/each}
					</div>
				</div>
			{/if}
			{#if state?.outcome}
				<!-- The fight is over, and everything there is left to say about it is said
				     on one panel in the middle of the board it happened on. The board itself
				     stands exactly as it finished underneath — every fighter where the last
				     blow left it, the ground each side took still held — so the result is
				     read against the thing it is a result of rather than under it, where a
				     tall board pushed it off the bottom of the sheet.

				     Laid over the canvas rather than in the column with it, so it takes no
				     room and nothing below shifts when it arrives. The sheet takes no
				     pointer of its own — only the panel does — so it covers the board
				     without swallowing anything the board still answers. -->
				<div class="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
					<div
						class="pointer-events-auto card w-full max-w-xs border border-base-300 bg-base-100/95 shadow-2xl"
					>
						<div class="card-body items-center gap-3 p-5">
							{#if reportFailure}
								<!-- Played out, and the server would not take it. The refusal is
								     given in the server's own words — the battle is still open, so
								     this is the fight the player is in, not one they have lost track
								     of — and the offer is to report it again, not to leave. -->
								<div class="alert alert-error text-sm" role="alert">
									<span>{reportFailure}</span>
								</div>
								<button
									type="button"
									class="btn btn-primary btn-block"
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
							{:else}
								<!-- Nothing is dismissed for the player: the arena is left when they
								     say so. Reporting is what ends the battle server-side, so Close
								     waits on it — leaving first would walk out of a fight the server
								     still has open. -->
								<p class={classNames('text-lg font-bold', OUTCOME_CLASSES[state.outcome])}>
									{OUTCOME_LABELS[state.outcome]}
								</p>
								<dl class="flex w-full flex-col gap-1 text-sm">
									<!-- The fight is three duels and this is how they went: the same
									     count the board has been keeping all along, standing still now. -->
									<div class="flex items-baseline justify-between gap-4">
										<dt class="opacity-70">Encounters won</dt>
										<dd class="font-mono font-bold tabular-nums">
											<span class="text-info">{state.wins.info}</span>
											<span class="opacity-40">–</span>
											<span class="text-error">{state.wins.error}</span>
										</dd>
									</div>
									{#if reward}
										<!-- Both figures are the server's own count of the team it paid
										     for, not this tab's: the award is a share of the level's span
										     decided from how much of the team came through, so the count
										     and the number it produced are read out together. -->
										<div class="flex items-baseline justify-between gap-4">
											<dt class="opacity-70">Fighters standing</dt>
											<dd class="font-mono font-bold tabular-nums">
												{reward.survivors} / {reward.fielded}
											</dd>
										</div>
										<div class="flex items-baseline justify-between gap-4">
											<dt class="opacity-70">Experience gained</dt>
											<dd class="font-mono font-bold tabular-nums text-success">
												+{reward.awarded}
											</dd>
										</div>
									{/if}
								</dl>
								<button
									type="button"
									class="btn btn-primary btn-block"
									disabled={reporting}
									on:click={close}
								>
									{#if reporting}
										<span class="loading loading-spinner loading-xs"></span>
										Reporting the fight
									{:else}
										Close
									{/if}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
			{#if state && !state.outcome}
				<!-- The way out of a fight, and the only one there is: a battle is ended by
				     a result, never by walking off, so giving it up reports the loss it is
				     and closes the arena exactly as being wiped out would. Between turns only
				     — a turn already being carried out settles itself.
				     At the foot of the board, opposite the score at its head, so the two things
				     that are true of the fight as a whole stand on the fight as a whole and the
				     column beside a fighter is left to say what is true of that fighter. Ghost
				     rather than a button with a fill: it is the one control here that is not
				     part of playing, and it is standing on the board. -->
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3"
				>
					<button
						type="button"
						class="btn pointer-events-auto btn-ghost btn-sm text-error"
						disabled={state.phase !== 'planning'}
						on:click={() => controller?.concede()}
					>
						Admit defeat
					</button>
				</div>
			{/if}
			{#if state && !state.outcome && saveFailure}
				<!-- The turn was played out and the server would not take it. The fight holds
				     here rather than playing on over a turn nothing has recorded: everything
				     after it would be built on a board that was never written, and gone the
				     moment this page is reloaded.
				     On the board like the rest of it, and in the middle like the end of the
				     fight, which it cannot be up at the same time as: both are the fight stopped
				     on something the player has to answer, and the middle of the board is where
				     this arena puts a thing that is waiting on an answer. -->
				<div class="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
					<div
						class="pointer-events-auto card w-full max-w-xs border border-base-300 bg-base-100/95 shadow-2xl"
					>
						<div class="card-body items-center gap-3 p-5">
							<div class="alert alert-warning text-sm" role="alert">
								<span>{saveFailure}</span>
							</div>
							<button
								type="button"
								class="btn btn-primary btn-block"
								disabled={savingTurn !== 0}
								on:click={retrySave}
							>
								{#if savingTurn}
									<span class="loading loading-spinner loading-xs"></span>
									Saving turn {state.turn}
								{:else}
									Save turn {state.turn} again
								{/if}
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
