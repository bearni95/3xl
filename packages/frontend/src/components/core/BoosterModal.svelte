<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import PackGrid from '$components/core/pack/PackGrid.svelte';
	import { boosterModalOpen } from '$services/boosterModal';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';

	// The booster window's packs, on the same sheet the roster and the badges are drawn on.
	// It was a tab of the panel beside the map, which meant a pack was picked, stood up and
	// sliced open inside a 450px column — two covers to a row, and the five cards a pack gives
	// three to a row in whatever height the panel had left under its own header. A pack opening
	// is the one thing this game does that is worth a whole view, so it has one.
	//
	// Nothing here is loaded or decided by this modal. The packs, the window they cover, the
	// day's allowance and whatever the last roll said are all the host's — the hidden claim
	// panel on the map page assembles them, and `claim_booster` is what refuses or pays out —
	// so this is the view of that state and the events that move it. Which keeps the map's
	// festa boxes and this grid on one set of packs rather than two.

	// Every openable pack in the window (three days back through four ahead), as the host's
	// claim panel built them.
	export let packs: OpenerPack[] = [];
	// Which town's pack is stood up, or null for the grid of all of them. Bound, because the
	// grid sets it when a cover is picked and a box click on the map sets it from outside.
	export let selected: string | null = null;
	// The stretch of calendar on offer, written out in Catalan by the host (both ends of it).
	export let windowLabel: string = '';
	// Why the last roll gave nothing, straight from `claim_booster`; empty when it did give.
	export let claimError: string = '';
	// How many cards the last pack revealed, or null before any has been opened. Zero is a
	// pack that sliced open onto an empty canvas.
	export let lastRevealed: number | null = null;
	// Nothing left to open today: the packs stay on screen but stop being openable.
	export let allowanceSpent: boolean = false;
	// True when a box was clicked on a town the window holds no pack for — the one thing the
	// grid cannot say for itself, since it only ever knows the packs it was handed.
	export let townHasNoPack: boolean = false;

	const dispatch = createEventDispatcher<{
		select: void;
		back: void;
		openComplete: number;
	}>();

	function close(): void {
		boosterModalOpen.set(false);
	}
</script>

<FullScreenModal title="Booster" closeLabel="Close boosters" on:close={close}>
	<!-- The stretch of calendar on offer, both ends of it named. Every pack below is openable:
		a festa major runs over its weekend rather than on one evening, so the window reaches
		three days back and four ahead, and `claim_booster` takes the same range. -->
	<div class="flex flex-none items-center justify-center">
		<span class="truncate text-sm font-bold first-letter:uppercase">{windowLabel}</span>
	</div>

	<!-- Why the last roll revealed nothing. `claim_booster` refuses for reasons the player can
		act on (the allowance is spent, the town's festa is out of the window), and the panel
		that reports them is mounted hidden on the map page — so a pack sliced open onto an
		empty canvas would say nothing at all without this. -->
	{#if claimError}
		<div class="alert alert-error flex-none py-2 text-xs" role="alert">
			<span>{claimError}</span>
		</div>
	{:else if lastRevealed === 0}
		<!-- The pack opened and the roll came back with nothing, without an error to go with
			it. Rare, but it must not read as a blank canvas. -->
		<div class="alert alert-warning flex-none py-2 text-xs" role="alert">
			<span>El sobre s'ha obert però no n'ha sortit cap carta.</span>
		</div>
	{:else if allowanceSpent}
		<div class="alert alert-warning flex-none py-2 text-xs">
			<span>Ja has obert tots els sobres d'avui. Se'n desbloquegen més a mitjanit.</span>
		</div>
	{/if}

	<div class="relative min-h-0 flex-1">
		{#if townHasNoPack}
			<div class="flex h-full items-center justify-center rounded-box bg-base-200 p-6 text-center">
				<p class="max-w-xs text-sm opacity-60">
					Aquest municipi encara no té cap sobre per obrir. Inicia sessió i torna-ho a provar.
				</p>
			</div>
		{:else if packs.length}
			<!-- The window's covers, four to a row now the view is the viewport rather than a
				column of it, and an opened pack stands its five cards in five: a whole day's
				packs are one look, and so is the whole of what one of them gave — which two and
				three across could only manage by putting part of a pull under the fold. The
				stood-up pack is bound to the same id a map box click sets, so the map and the
				grid are never looking at two different packs. -->
			<PackGrid
				{packs}
				columns={4}
				revealColumns={5}
				interactive={!allowanceSpent}
				bind:selected
				classes={classNames(
					'h-full rounded-box bg-gradient-to-b from-base-300/80 to-base-200 p-3',
					{ 'opacity-50': allowanceSpent }
				)}
				on:select={() => dispatch('select')}
				on:back={() => dispatch('back')}
				on:openComplete={(event) => dispatch('openComplete', event.detail)}
			/>
		{:else}
			<div class="flex h-full items-center justify-center rounded-box bg-base-200 p-6 text-center">
				<p class="max-w-xs text-sm opacity-60">
					Ara mateix no hi ha cap sobre per obrir. Inicia sessió i clica una estrella daurada del
					mapa.
				</p>
			</div>
		{/if}
	</div>
</FullScreenModal>
