<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { characters, type CharacterOption } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { collectionModalOpen } from '$services/collectionModal';
	import { spawnService } from '$services/spawn.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { AuthStatus } from '$types/profile.type';
	import type { CharacterSpawn } from '$types/character-spawn.type';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';

	// The album: every card the game holds, as one grid five across, with the shows the game
	// has named down the left of it. It is the counterpart of the roster, which is the cards a
	// player has: here the set is the whole set whatever they hold, and what holding one does
	// is bring its statue up to full strength.
	//
	// So a character appears once per show they are cast in and not once altogether: what a
	// cell says is "this fighter, out of this show", which is the pair a booster is rolled on
	// and therefore the pair there is something to own.
	//
	// The statues are the roster's own component with no colour handed to it: a cell is about
	// a character and not about a copy, and there is no copy to read a colour off (see
	// CharacterStatue's `color`). Black card, white lettering — which is also what keeps an
	// unowned one legible at half strength, a colour dimmed by half being a different colour.
	//
	// Like every other full view it is only mounted while it is open, so the show mapping, the
	// player's cards and forty-odd sprites all arrive with the opening and go with the close.

	function close(): void {
		collectionModalOpen.set(false);
	}

	// Five to a row, whatever the sheet's width and whatever the cells are of: the album is one
	// grid, so its rhythm is a count and not something measured off the cards. What that width
	// leaves after the column of shows is shared out between the five.
	const STATUE_GRID = 'grid-cols-5';

	const status = authService.status;
	const profile = authService.profile;
	const spawns = spawnService.spawns;

	// The registry is what can actually be drawn, so it is what the album is built from: a
	// character assigned to a show upstream but not imported here has no art to stand up and
	// is simply not in the set.
	const charactersById = new Map<string, CharacterOption>(
		characters.map((character) => [character.id, character])
	);

	// character id → the shows it is cast in, which is the assignment the admin `/characters`
	// screen makes and the same one the roster reads.
	let characterShows = new Map<string, { id: number; name: string }[]>();
	let loading = true;
	let error = '';

	onMount(() => authService.init());
	// The logos the left column is lettered with — the same collection the roster's show
	// filter draws its chips from, and the same one fetch shared with every statue standing.
	onMount(() => void loadShowLogos());
	onMount(() => void loadShows());

	async function loadShows(): Promise<void> {
		loading = true;
		error = '';
		try {
			characterShows = await spawnService.loadCharacterShows();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// The player's cards, loaded here as well as by the roster: the album can be the first
	// thing opened in a session, and the set has to be able to say what is already held.
	// Guarded so the reactive statement does not re-fetch on every tick.
	let loadedForUser: string | null = null;
	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		void spawnService.loadSpawns(currentUserId).catch(() => {});
	}

	// The album's rows: one per show that has a renderable cast, the show's name deciding the
	// order and each cast in its own alphabetical order — nothing here is claimed, so there is
	// no claim order for it to be in.
	$: showRows = ((shows: Map<string, { id: number; name: string }[]>) => {
		const byShow = new Map<number, { id: number; name: string; cast: CharacterOption[] }>();
		for (const [characterId, entries] of shows) {
			const character = charactersById.get(characterId);
			if (!character) continue;
			for (const show of entries) {
				const row = byShow.get(show.id) ?? { id: show.id, name: show.name, cast: [] };
				row.cast.push(character);
				byShow.set(show.id, row);
			}
		}
		for (const row of byShow.values()) row.cast.sort((a, b) => a.label.localeCompare(b.label));
		return [...byShow.values()].sort((a, b) => a.name.localeCompare(b.name));
	})(characterShows);

	// Every pair the player holds a copy of, as `character|show`. A card that does not say
	// which show it came out of — one rolled across all of them — is a copy of that character
	// and nothing more, so it is recorded under `*` and stands for them wherever they are cast
	// rather than for nowhere at all.
	$: ownedPairs = ((all: CharacterSpawn[]) => {
		const held = new Set<string>();
		for (const spawn of all) held.add(`${spawn.characterId}|${spawn.showId ?? '*'}`);
		return held;
	})($spawns);

	// The album as it is drawn: one flat run of cells, a show's whole cast before the next
	// show's, each carrying the one thing the set has to say about it — whether the player
	// holds it. Flat because the grid is one grid: a row per show gave every show a row of its
	// own however few it had in it, so the set was read as a stack of ragged strips rather than
	// as a sheet of cards. Which show a cell is of is still on the cell, painted across the
	// statue's own floor, so nothing is lost by the shows no longer being the layout.
	//
	// Answered here rather than by a helper the markup calls, because a call in the template
	// names only the function — the cards arriving after the mount would have changed nothing on
	// screen. Both the rows and the holdings are named as arguments for the same reason.
	$: albumCells = ((
		rows: { id: number; name: string; cast: CharacterOption[] }[],
		held: Set<string>
	) =>
		rows.flatMap((row) =>
			row.cast.map((character) => ({
				// A character cast in two shows has a cell in each, so the pair is what keys one.
				key: `${row.id}|${character.id}`,
				showId: row.id,
				character,
				owned: held.has(`${character.id}|${row.id}`) || held.has(`${character.id}|*`)
			}))
		))(showRows, ownedPairs);
</script>

<!-- The sheet, the slide, the title bar and Escape are the modal's; the album is what is put
	on it — the shows named down the left, and the whole set beside them as one grid. -->
<FullScreenModal
	title={$_('collection.title')}
	closeLabel={$_('collection.close')}
	on:close={close}
>
	<div class="flex min-h-0 flex-1 flex-col">
		{#if error}
			<div class="alert alert-error text-sm"><span>{error}</span></div>
		{:else if loading}
			<div class="flex items-center gap-2 text-sm opacity-70">
				<span class="loading loading-spinner loading-xs"></span>
				{$_('collection.loading')}
			</div>
		{:else if albumCells.length === 0}
			<p class="text-sm opacity-60">{$_('collection.empty')}</p>
		{:else}
			<!-- The shows down the left, the whole set to the right of them: the column says which
				shows the game has, and the grid beside it is every card there is, five across. -->
			<div class="flex min-h-0 flex-1 items-start gap-4">
				<!-- The shows say themselves the way they do in the roster's filter: their own
					lettering, one to a row, on the band that lettering is drawn to sit on. A show
					whose logo is not enabled yet falls back to its name, so the column still names
					it. Its own scroll box, so a long list of shows never takes the sheet's height
					off the grid it stands beside. -->
				<div class="flex max-h-full w-24 flex-none flex-col gap-2 overflow-y-auto sm:w-32">
					{#each showRows as show (show.id)}
						<div
							class="flex h-10 flex-none items-center justify-center overflow-hidden rounded-md bg-black/40 px-1"
							title={show.name}
						>
							{#if $showLogos.get(show.id)}
								<img
									src={$showLogos.get(show.id)?.url}
									alt={show.name}
									class="max-h-full max-w-full object-contain"
								/>
							{:else}
								<span class="truncate text-xs text-white/80">{show.name}</span>
							{/if}
						</div>
					{/each}
				</div>

				<!-- The set, in one grid five columns wide however many shows it runs through: a
					show's whole cast before the next show's, and a card the player holds no copy of
					standing at half strength — the cell is there either way, since the album is the
					set and not the shelf. It is this grid that scrolls, so the column of shows keeps
					its place beside it. -->
				<div class={classNames('grid min-h-0 min-w-0 flex-1 content-start gap-2 overflow-y-auto', STATUE_GRID)}>
					{#each albumCells as cell (cell.key)}
						<div class={classNames({ 'opacity-50': !cell.owned })}>
							<CharacterStatue
								label={cell.character.label}
								basePath={cell.character.basePath}
								showId={cell.showId}
								veiled={false}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</FullScreenModal>
