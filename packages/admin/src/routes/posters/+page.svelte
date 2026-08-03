<script lang="ts">
	import { characters } from '@3xl/data';
	import BackdropMap from '$components/core/BackdropMap.svelte';
	import IdleSprite from '$components/core/IdleSprite.svelte';
	import MugenPosterGrid from '$components/core/MugenPosterGrid.svelte';
	import type { PosterGridStatus } from '$utils/mugen/mugen-poster-grid';
	import { leastCommonMultiple } from '$utils/math/least-common-multiple';
	import { saveBlob } from '$utils/capture/save-blob';
	import { errorMessage } from '$utils/error/error-message';

	// The whole roster, idling side by side, drawn the way the combat board draws it:
	// one shared source→screen ratio per cell box, each character's own `renderScale`
	// on top of it, and the crown shift that stands it by its head. Which is what makes
	// the screen worth having — a correction can only be judged against the others.
	const roster = characters.map(({ id, basePath }) => ({ id, basePath }));

	// The wall names its characters by id, since that is all it is given; the name belongs
	// to the registry.
	const labels = new Map(characters.map(({ id, label }) => [id, label]));

	// What hangs over the three kept cells at the middle of the wall: the player app's own
	// social card — the picture Discord and the rest draw beside a link to the game — read
	// straight out of `@3xl/frontend`'s static dir, which this app's Vite config mounts at
	// /frontend precisely so nothing has to be copied. It is generated from
	// `social-card.svg` by `pnpm --filter @3xl/frontend generate:social-card`, so editing
	// the game's card changes what the wall wears, and nothing here has to be told.
	const CENTER_IMAGE = '/frontend/social-card.png';

	// What the wall stands on: the game's own map, drawn behind the canvas the way the player
	// app's `/profile/[id]` draws it behind a profile — the four dissolved layers in white,
	// bottom-up, the coarser a division the thicker its line, over Esri's satellite imagery.
	// Not painted, only drawn: the colour wash on the map at the root is a reading of who
	// holds what, and this is a background. A constant, since nothing here recolours it.
	const mapOverlays = [
		{ url: '/data/geo/municipis.json', style: { color: '#fff', weight: 1, fill: false } },
		{ url: '/data/geo/comarques.json', style: { color: '#fff', weight: 1.5, fill: false } },
		{ url: '/data/geo/provincies.json', style: { color: '#fff', weight: 2, fill: false } },
		{ url: '/data/geo/territoris.json', style: { color: '#fff', weight: 3, fill: false } }
	];

	let status: PosterGridStatus = {
		drawn: 0,
		total: roster.length,
		stood: [],
		missing: [],
		loading: true
	};

	// How long the whole wall takes to come back round: step every idle cycle together and
	// the first count that every one of them divides is where they are all on their first
	// frame again — the least common multiple of the cycle lengths. It is a count of frames
	// rather than a time, since the durations vary within a cycle as well as between them.
	// It moves as the wall fills, because it is a fact about the roster that is up so far.
	$: sharedCycle = leastCommonMultiple(status.stood.map((stand) => stand.frames.length));

	// How long a take is: one second of the wall as it stands. Not a whole turn of it — the
	// count above says how many frames that would take, and it is thousands — so a clip played
	// on repeat has a seam where it wraps. A second is what a wall of dozens of idles reads as.
	const TAKE_MS = 1000;

	let wall: MugenPosterGrid;
	let recording = false;
	let capturing = false;
	let failure: string | null = null;

	// Both files are taken off the canvas itself rather than off a second reading of the
	// manifests, so what is saved is what was on screen — the same reason the table below is
	// built out of the wall's own status.
	function filename(extension: string): string {
		return `posters-${new Date().toISOString().slice(0, 10)}.${extension}`;
	}

	async function downloadLoop(): Promise<void> {
		if (recording || capturing) return;
		failure = null;
		recording = true;
		try {
			const recorded = await wall.record(TAKE_MS);
			if (recorded) saveBlob(recorded.blob, filename(recorded.extension));
		} catch (error) {
			failure = errorMessage(error);
		} finally {
			recording = false;
		}
	}

	async function downloadFrame(): Promise<void> {
		if (recording || capturing) return;
		failure = null;
		capturing = true;
		try {
			// The wall as it is at this instant, every character on whatever frame of its idle
			// it happens to be showing — the still the reader was looking at when they asked.
			const shot = await wall.snapshot();
			if (shot) saveBlob(shot, filename('png'));
		} catch (error) {
			failure = errorMessage(error);
		} finally {
			capturing = false;
		}
	}
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Posters</h1>
				<span class="badge badge-neutral">
					{status.drawn}/{status.total}
					{status.loading ? 'loading' : 'drawn'}
				</span>
			</div>
			<p class="text-sm opacity-70">
				Every imported character's idle animation on one canvas, sized exactly as the game's
				combat board sizes it — the shared fit, the character's own
				<code class="font-mono">renderScale</code>, and the crown alignment that stands it by its
				head. They stand on the board's own hex field, filled outward from the middle in
				registry order and laid at whichever width comes out nearest a square, each on its
				cell's foot line, so heights compare across the wall. Nothing behind them is
				painted — not the field, not the line that halves it, not the canvas — so both
				downloads come out transparent everywhere a character is not standing. The map
				behind is under the canvas and not in it, framed on every polygon it draws, so
				it is what the wall is read against here and no part of what leaves the page.
				The three cells kept clear at the middle wear the game's social card.
			</p>
			<div class="flex flex-wrap gap-4 text-sm">
				<a class="link link-primary" href="/characters">Characters →</a>
				<a class="link link-primary" href="/">← Back to stage</a>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					class="btn btn-primary btn-sm"
					disabled={recording || capturing || status.drawn === 0}
					on:click={downloadLoop}
				>
					{recording ? 'Recording…' : 'Download 1s loop'}
				</button>
				<button
					class="btn btn-outline btn-sm"
					disabled={recording || capturing || status.drawn === 0}
					on:click={downloadFrame}
				>
					{capturing ? 'Exporting…' : 'Export current frame'}
				</button>
			</div>
		</header>

		{#if failure}
			<div class="alert alert-error">
				<span>{failure}</span>
			</div>
		{/if}

		{#if status.missing.length > 0}
			<div class="alert alert-warning">
				<span>
					No idle animation loaded for: {status.missing.join(', ')}
				</span>
			</div>
		{/if}

		<!-- One square box holding both, which is what the wall is standing on and what the map
		     is framed to. Square because the field grows into the squarest shape it can (see
		     the wall's own note): a box of that shape is the one that wastes least of itself
		     on either, and it is one shape at every width rather than a frame that changes its
		     mind as the window moves.
		     Three layers in one stacking order and no other: the map at the bottom, the veil
		     over it, the canvas over that. The canvas is transparent everywhere a character is
		     not standing, which is what lets the country show through it — and is also why the
		     two downloads carry none of this: they are read off the canvas, and the map is not
		     in it. `isolate` on the map is what keeps Leaflet's own panes (which climb to 700)
		     inside their own stack instead of over the wall. -->
		<div class="relative aspect-square w-full overflow-hidden rounded-box">
			<BackdropMap overlays={mapOverlays} classes="absolute inset-0 h-full w-full" />
			<!-- The veil the wall is read through: white, half of it at the top and a fifth at
			     the foot, exactly as the player app's profile page knocks the imagery back. -->
			<div class="absolute inset-0 z-10 bg-gradient-to-b from-white/50 to-white/20"></div>
			<MugenPosterGrid
				bind:this={wall}
				characters={roster}
				centerImage={CENTER_IMAGE}
				on:status={(event) => (status = event.detail)}
				classes="absolute inset-0 z-20"
			/>
		</div>

		<!-- Where the whole wall meets itself again: the least common multiple of the cycle
		     lengths under it, which is how many frames every character has to be stepped on
		     before all of them are back on their first at once. -->
		<div class="card bg-base-100">
			<div class="card-body flex-row flex-wrap items-baseline gap-x-4 gap-y-1">
				<span class="font-mono text-4xl font-bold">{sharedCycle.toLocaleString()}</span>
				<p class="text-sm opacity-70">
					frames before every character starts its idle again on the same one — the least
					common multiple of the {status.stood.length} cycle lengths on the canvas.
				</p>
			</div>
		</div>

		<!-- The same roster the canvas is drawing, listed: each character's idle cycle played
		     as plain <img> frames, its name, and how many frames the cycle is. The cycles come
		     off the wall's own status rather than from a second read of the manifests, so the
		     table can only ever say what is standing up there. -->
		<div class="overflow-x-auto rounded-box bg-base-100">
			<table class="table">
				<thead>
					<tr>
						<th class="w-24">Idle</th>
						<th>Name</th>
						<th class="text-right">Frames</th>
					</tr>
				</thead>
				<tbody>
					{#each status.stood as stand (stand.id)}
						<tr>
							<td>
								<div class="h-20 w-20">
									<IdleSprite frames={stand.frames} />
								</div>
							</td>
							<td>{labels.get(stand.id) ?? stand.id}</td>
							<td class="text-right font-mono">{stand.frames.length}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
