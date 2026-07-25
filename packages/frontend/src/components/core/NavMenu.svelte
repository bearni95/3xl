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

<ul class="menu w-56 gap-1 p-2">
	{#each nodes as node (node.path)}
		<li>
			{#if node.children.length}
				<details open>
					<summary class={classNames({ 'menu-active': isActive(node) })}>
						{node.label}
					</summary>
					<svelte:self nodes={node.children} on:navigate />
					{#if node.hasPage}
						<ul>
							<li>
								<a
									href={node.path}
									class={classNames({ 'menu-active': isActive(node) })}
									on:click={() => dispatch('navigate')}
								>
									Overview
								</a>
							</li>
						</ul>
					{/if}
				</details>
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
</ul>
