<script lang="ts">
	import classNames from 'classnames';

	// A plate for the map's corner that folds away to its own title bar. The corner's other
	// plates are each as small as what they say — a track, a town — but a plate carrying a
	// table is as big as the table, and it stands over the map it is about, so it has to be
	// possible to put away without losing where it is.
	//
	// Folded it is the title bar and nothing else, which is still the plate: the strip stays
	// in the stack, in its place, so unfolding is where folding happened. The whole bar is
	// the switch, with the chevron only saying which way it will go.
	//
	// The bar is the corner's own black-on-white; what goes inside is the host's, since a
	// plate that holds a themed table wants that table drawn on the surface it was written
	// for rather than over black.

	export let title: string = '';
	// Bound by the host, which is where the state lives — this plate does not remember
	// anything by itself.
	export let collapsed: boolean = false;
	export let classes: string = '';
	export let bodyClasses: string = '';
</script>

<div class={classNames('overflow-hidden rounded-lg bg-black text-white shadow-xl', classes)}>
	<button
		type="button"
		class="flex w-full items-center gap-2 px-3 py-2 text-left"
		aria-expanded={!collapsed}
		on:click={() => (collapsed = !collapsed)}
	>
		<span class="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
		<!-- Down when the body is showing, and turned a quarter to the left when it is
			folded, so the mark points at what pressing it would do. -->
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			class={classNames('size-4 flex-none transition-transform', { '-rotate-90': collapsed })}
			aria-hidden="true"
		>
			<path d="M7 10l5 5 5-5z" />
		</svg>
	</button>

	{#if !collapsed}
		<div class={classNames(bodyClasses)}>
			<slot />
		</div>
	{/if}
</div>
