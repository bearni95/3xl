<script lang="ts">
	import classNames from 'classnames';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { characters } from '@3xl/data';
	import { characterDetail, loadCharacterDetail } from '$services/characterDetail.service';

	let { children } = $props();

	// The character these routes detail, from the URL. A dynamic segment keeps the
	// whole subtree out of the sidebar (the nav tree is built from the route files
	// and skips parameterised routes), which is right: there is nothing to link to
	// until a row on the dashboard names a character.
	const id = $derived($page.params.id ?? '');
	const character = $derived(characters.find((c) => c.id === id));

	// The four views a character is authored through, in the order the tabs read.
	const tabs = [
		{ segment: 'definition', label: 'Definition' },
		{ segment: 'stats', label: 'Stats' },
		{ segment: 'frames', label: 'Frames' },
		{ segment: 'imported', label: 'Imported' }
	];

	const activeSegment = $derived($page.url.pathname.split('/').filter(Boolean).pop() ?? '');

	// Load whenever the URL names another character. Browser only: the definition
	// API lives behind `vite dev` and must not be hit during a static prerender.
	$effect(() => {
		if (browser && character) loadCharacterDetail(character);
	});
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		{#if character}
			<header class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-bold">{character.label}</h1>
					<span class="badge badge-neutral font-mono text-xs">{character.id}</span>
					{#if $characterDetail.saving}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
				</div>
				<a class="link link-primary text-sm" href="/characters/dashboard">← Back to dashboard</a>
			</header>

			<div role="tablist" class="tabs tabs-boxed w-fit">
				{#each tabs as tab (tab.segment)}
					<a
						role="tab"
						href={`/characters/dashboard/${character.id}/${tab.segment}`}
						class={classNames('tab', { 'tab-active': activeSegment === tab.segment })}
					>
						{tab.label}
					</a>
				{/each}
			</div>

			{@render children?.()}
		{:else}
			<div class="alert alert-error">
				<span>No character "{id}" in the registry.</span>
			</div>
			<a class="link link-primary text-sm" href="/characters/dashboard">← Back to dashboard</a>
		{/if}
	</div>
</div>
