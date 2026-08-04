<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import { formatCharacterCredit } from '$utils/mugen/character-credit';
	import { closeCredits } from '$services/creditsModal';

	// Who made the fighters, on the same full-view sheet the questions, the roster and the
	// album are drawn on — because it is the same kind of thing: a page of content laid
	// over the map, read for as long as it is being read and then put away.
	//
	// The list is the registry itself rather than anything authored here: every character
	// the game can draw, in the order the registry holds them (by name), each with the
	// credit its archive carries. So a character imported tomorrow is credited tomorrow,
	// and one that leaves stops being named, without this screen being touched. The credit
	// rides in the registry entry for one reason — see @3xl/data's CharacterOption — which
	// is that the manifests it is decoded from are hundreds of kilobytes apiece and a
	// credits table would have had to fetch fifty of them to letter two columns.

	// Built up here rather than called from the template, so that the rows are rebuilt when
	// the catalogue lands: `$_` is named in the statement itself, which is the only way a
	// legacy reactive block hears about it — a `credit($_(…))` inside the `{#each}` would be
	// evaluated once and never again.
	$: rows = characters.map((character) => ({
		id: character.id,
		label: character.label,
		artist: formatCharacterCredit(character.author, $_('credits.unknown'))
	}));
</script>

<FullScreenModal
	title={$_('credits.title')}
	closeLabel={$_('credits.close')}
	on:close={closeCredits}
>
	<!-- The table scrolls inside the sheet rather than the sheet scrolling, so the title
		bar stays put however far down the roster a name sits. Capped in width because two
		short columns stretched the width of a monitor are two columns with a gulf between
		them. -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="mx-auto flex max-w-3xl flex-col gap-4">
			<p class="opacity-80">{$_('credits.intro')}</p>

			<!-- `table-pin-rows` keeps the head standing while the fifty-odd rows go past it,
				which is the whole reason a table is a table here and not a list of pairs: the
				second column has to keep saying what it is. -->
			<table class="table-pin-rows table table-zebra">
				<thead>
					<tr>
						<th>{$_('credits.character')}</th>
						<th>{$_('credits.artist')}</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.id)}
						<tr>
							<td class="font-bold">{row.label}</td>
							<td>{row.artist}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</FullScreenModal>
