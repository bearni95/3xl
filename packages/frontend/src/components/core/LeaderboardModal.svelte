<script lang="ts">
	import { _ } from 'svelte-i18n';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import ShowStandingsTable from '$components/core/ShowStandingsTable.svelte';
	import { leaderboardModalOpen } from '$services/leaderboardModal';
	import type { ShowStanding } from '$utils/geo/show-standings';

	// How much of the map each show flies, on the same sheet the roster and the badges are
	// drawn on. It was a tab of the panel beside the map: a table of every show there is,
	// read three columns wide in a 450px column, and only ever on screen by putting away
	// whichever other view was forward. Here it is the whole view for as long as it is being
	// read, and the panel goes back to being about the account.
	//
	// The standings are the map's own tally, not something this modal reads: they are counted
	// over every municipality's current show — the seeded one, or the ruling team's where a
	// town has been taken — so they are handed in rather than fetched, and they are as fresh
	// as the map behind them. The sheet, the slide, the title bar and Escape are
	// FullScreenModal's; closing is this component's, since the store is.

	export let rows: ShowStanding[] = [];

	function close(): void {
		leaderboardModalOpen.set(false);
	}
</script>

<FullScreenModal
	title={$_('leaderboard.title')}
	closeLabel={$_('leaderboard.close')}
	on:close={close}
>
	<!-- The table scrolls inside the sheet rather than the sheet scrolling: the title bar
		stays put and the head of the table pins under it (`table-pin-rows`), so the columns
		are still named however far down the list a show sits. -->
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-box bg-base-200/50">
		<ShowStandingsTable {rows} />
	</div>
</FullScreenModal>
