<script lang="ts">
	import classNames from 'classnames';
	import { _, json } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import { formatCharacterCredit } from '$utils/mugen/character-credit';
	import { closeCredits } from '$services/creditsModal';

	// Who made what the game is drawn out of, on the same full-view sheet the questions,
	// the roster and the album are drawn on — because it is the same kind of thing: a page
	// of content laid over the map, read for as long as it is being read and then put away.
	//
	// Two tables, a tab each, the way the four legal documents share one sheet: a credit is
	// a credit whether it is owed to somebody who drew a fighter or to whoever surveyed a
	// coastline, and splitting them across two entrances would have meant closing one sheet
	// to open the other. The tabs are DaisyUI's, and which one is showing is a local `tab`
	// rather than a store — nothing outside asks for a particular table.
	//
	// Where each table's rows come from is the difference between them:
	//
	// - The **characters** are the registry itself rather than anything authored here:
	//   every character the game can draw, in the order the registry holds them (by name),
	//   each with the credit its archive carries. So a character imported tomorrow is
	//   credited tomorrow, and one that leaves stops being named, without this screen being
	//   touched. The credit rides in the registry entry for one reason — see @3xl/data's
	//   CharacterOption — which is that the manifests it is decoded from are hundreds of
	//   kilobytes apiece and a credits table would have had to fetch fifty of them to
	//   letter two columns.
	// - The **map's sources** are content, so they are in the catalogue and none of them
	//   are here: `credits.map.entries` is the whole list, and a dataset is credited by
	//   being written there. Nothing at run time can be asked what the map was built out
	//   of — the layers under public/geo/ are baked by generate-geo.js and generate-festes.js
	//   and keep no note of where their rows came from, the note being in those scripts'
	//   headers. Read through the `json` store rather than `_` for the same reason the
	//   legal documents are: a list of pairs is a shape rather than a string, and `_` is
	//   ICU, where a stray brace in a licence line would change what the reader is shown.

	/** Which table is up. Not a store: nothing outside this sheet names a table. */
	let tab: 'characters' | 'map' = 'characters';

	/** One line of the map's credits: what the map takes, and who it takes it from. */
	interface MapCreditEntry {
		data: string;
		source: string;
	}

	// Built up here rather than called from the template, so that the rows are rebuilt when
	// the catalogue lands: `$_` is named in the statement itself, which is the only way a
	// legacy reactive block hears about it — a `formatCharacterCredit($_(…))` inside the
	// `{#each}` would be evaluated once and never again.
	$: characterRows = characters.map((character) => ({
		id: character.id,
		label: character.label,
		artist: formatCharacterCredit(character.author, $_('credits.characters.unknown'))
	}));

	$: mapRows = ($json('credits.map.entries') as MapCreditEntry[] | null) ?? [];
</script>

<FullScreenModal title={$_('credits.title')} closeLabel={$_('credits.close')} on:close={closeCredits}>
	<!-- role="tablist" and nothing more: DaisyUI's `tab` classes carry the look, and which
		table is shown is the local state rather than an aria-controls target, because only
		one of them is ever mounted. -->
	<div role="tablist" class="tabs-boxed tabs flex-none justify-start overflow-x-auto">
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'characters'}
			class={classNames('tab whitespace-nowrap', { 'tab-active': tab === 'characters' })}
			on:click={() => (tab = 'characters')}
		>
			{$_('credits.tabs.characters')}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'map'}
			class={classNames('tab whitespace-nowrap', { 'tab-active': tab === 'map' })}
			on:click={() => (tab = 'map')}
		>
			{$_('credits.tabs.map')}
		</button>
	</div>

	<!-- The table scrolls inside the sheet rather than the sheet scrolling, so the tabs and
		the title bar stay put however far down a name sits. Capped in width because two short
		columns stretched the width of a monitor are two columns with a gulf between them. -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="mx-auto flex max-w-3xl flex-col gap-4">
			{#if tab === 'characters'}
				<p class="opacity-80">{$_('credits.characters.intro')}</p>

				<!-- `table-pin-rows` keeps the head standing while the fifty-odd rows go past it,
					which is the whole reason a table is a table here and not a list of pairs: the
					second column has to keep saying what it is. -->
				<table class="table-pin-rows table table-zebra">
					<thead>
						<tr>
							<th>{$_('credits.characters.name')}</th>
							<th>{$_('credits.characters.artist')}</th>
						</tr>
					</thead>
					<tbody>
						{#each characterRows as row (row.id)}
							<tr>
								<td class="font-bold">{row.label}</td>
								<td>{row.artist}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="opacity-80">{$_('credits.map.intro')}</p>

				<!-- The same table, a dozen rows instead of fifty: what the map takes on the left
					and who it is taken from on the right. The right-hand cell is prose rather than
					a name, because a licence is part of a credit wherever there is one — the
					boundaries are EuroGeographics' on their terms and the comarques are CC0, and a
					credit that dropped that would not be the credit those datasets ask for. -->
				<table class="table-pin-rows table table-zebra">
					<thead>
						<tr>
							<th>{$_('credits.map.data')}</th>
							<th>{$_('credits.map.source')}</th>
						</tr>
					</thead>
					<tbody>
						{#each mapRows as row, index (index)}
							<tr>
								<td class="font-bold">{row.data}</td>
								<td>{row.source}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</FullScreenModal>
