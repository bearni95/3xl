<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import type { RouteNode } from '$types/navigation.type';

	export let nodes: RouteNode[] = [];

	const dispatch = createEventDispatcher<{ navigate: void }>();

	$: current = $page.url.pathname;

	function isActive(node: RouteNode): boolean {
		return current === node.path;
	}
</script>

<!-- Renders the <li> rows only: the caller owns the <ul>, so a section's subtree
     nests as a plain child list under its title. Nothing folds — every tier of
     the tree is always on screen. -->
{#each nodes as node (node.path)}
	<li>
		{#if node.children.length}
			<h2 class="menu-title">{node.label}</h2>
			<ul>
				{#if node.hasPage}
					<li>
						<a
							href={node.path}
							class={classNames({ 'menu-active': isActive(node) })}
							on:click={() => dispatch('navigate')}
						>
							Overview
						</a>
					</li>
				{/if}
				<svelte:self nodes={node.children} on:navigate />
			</ul>
		{:else}
			<a
				href={node.path}
				class={classNames({ 'menu-active': isActive(node) })}
				on:click={() => dispatch('navigate')}
			>
				{node.label}
			</a>
		{/if}
	</li>
{/each}
