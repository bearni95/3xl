<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import { getRoutes } from '$utils/routes/get-routes';
	import NavMenu from '$components/core/NavMenu.svelte';
	import type { RouteNode } from '$types/navigation.type';

	export let brand: string = '3XL';
	export let classes: string = '';

	// The tree is derived from the route files, so every page and sub-page shows
	// up here without a hand-maintained list.
	const routes: RouteNode[] = getRoutes();

	const dispatch = createEventDispatcher<{ navigate: void }>();

	$: current = $page.url.pathname;
</script>

<aside
	class={classNames(
		'flex h-full min-h-screen w-64 flex-col gap-2 border-r border-base-300 bg-base-100 p-3',
		classes
	)}
>
	<a
		href="/"
		class={classNames('btn btn-ghost justify-start text-xl', { 'btn-active': current === '/' })}
		on:click={() => dispatch('navigate')}
	>
		{brand}
	</a>

	<ul class="menu w-full gap-1 p-0">
		<NavMenu nodes={routes} on:navigate />
	</ul>
</aside>
