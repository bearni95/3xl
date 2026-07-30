<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import {
		ACHIEVEMENT_FORMULA_MAX_LENGTH,
		ACHIEVEMENT_REQUIREMENT_MAX_LENGTH,
		ACHIEVEMENT_VARIABLES_MAX,
		type AchievementVariable
	} from '$types/achievement.type';
	import { CARD_FIELDS, type FormulaCard, type FormulaContext } from '$utils/achievement/formula';
	import { achievementValues, renderAchievement } from '$utils/achievement/template';
	import { achievementMet } from '$utils/achievement/requirement';
	import { achievementExpAward } from '$utils/progression/level';
	import type { VariableProblem } from '$utils/achievement/variables';
	import { MAX_LEVEL, MIN_LEVEL } from '$utils/progression/level';
	import { SpawnBox, SpawnColor } from '$types/character-spawn.type';

	// The badge's declared variables, and the wording that templates them. All three
	// are the parent's draft: this editor owns none of them and dispatches every
	// change, so the parent stays the one document Save sends.
	export let variables: AchievementVariable[] = [];
	export let name: string = '';
	export let description: string = '';
	// The condition that earns the badge, or '' for a badge with no checkable rule.
	export let requirement: string = '';
	// Everything wrong with the set, computed once by the parent (which also gates
	// Save with it) and pointed at the field it belongs to here.
	export let problems: VariableProblem[] = [];

	const dispatch = createEventDispatcher<{
		change: { variables: AchievementVariable[] };
		changerequirement: { requirement: string };
	}>();

	/**
	 * A deck to evaluate against, so the preview below shows numbers rather than a
	 * formula. Eight invented cards spanning both box stocks, all six colours,
	 * three fielded, and one rolled across all shows — enough for every filter a
	 * formula can write to come out non-zero on at least one card.
	 */
	const SAMPLE_CARDS: FormulaCard[] = [
		card(SpawnColor.Red, SpawnBox.Black, 0, 1399),
		card(SpawnColor.Red, SpawnBox.Black, null, 1399),
		card(SpawnColor.Blue, SpawnBox.Black, 1, 60625),
		card(SpawnColor.Yellow, SpawnBox.Black, null, null),
		card(SpawnColor.Purple, SpawnBox.White, 2, 1399),
		card(SpawnColor.Green, SpawnBox.White, null, 60625),
		card(SpawnColor.Orange, SpawnBox.White, null, null),
		card(SpawnColor.Orange, SpawnBox.White, null, 1399)
	];

	function card(
		color: SpawnColor,
		box: SpawnBox,
		teamSlot: number | null,
		showId: number | null
	): FormulaCard {
		return { characterId: 'son-goku', showId, locationId: 'ES_08019', color, box, teamSlot };
	}

	let sampleLevel = 5;

	$: sampleContext = { level: sampleLevel, cards: SAMPLE_CARDS } satisfies FormulaContext;
	$: values = achievementValues({ variables }, sampleContext);
	$: preview = renderAchievement({ name, description, variables }, sampleContext);
	// Placeholders naming nothing and the like — reported once above the rows, since
	// they belong to the wording rather than to any one variable.
	$: textProblems = problems.filter((problem) => problem.field === 'text');
	$: requirementProblem =
		problems.find((problem) => problem.field === 'requirement')?.message ?? null;
	// Whether the sample player below has earned it, and what it would pay them. Both
	// come from the modules the game itself uses — the requirement evaluator and the
	// award arithmetic that mirrors the RPC — so this is the rule being read, not a
	// description of it.
	$: sampleMet = achievementMet({ variables, requirement }, sampleContext);
	$: sampleAward = achievementExpAward(sampleLevel);

	/** The trouble with one row's one field, or null. */
	function problemFor(index: number, field: 'name' | 'formula'): string | null {
		return problems.find((p) => p.index === index && p.field === field)?.message ?? null;
	}

	function update(index: number, patch: Partial<AchievementVariable>): void {
		dispatch('change', {
			variables: variables.map((variable, i) => (i === index ? { ...variable, ...patch } : variable))
		});
	}

	function add(): void {
		dispatch('change', { variables: [...variables, { name: '', formula: '' }] });
	}

	function remove(index: number): void {
		dispatch('change', { variables: variables.filter((_, i) => i !== index) });
	}
</script>

<section class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-3">
		<h3 class="text-lg font-semibold">Variables</h3>
		<span class="badge badge-ghost badge-sm">{variables.length}/{ACHIEVEMENT_VARIABLES_MAX}</span>
		<button
			class="btn btn-sm ml-auto"
			type="button"
			on:click={add}
			disabled={variables.length >= ACHIEVEMENT_VARIABLES_MAX}
		>
			Add variable
		</button>
	</div>
	<p class="text-sm opacity-70">
		A number this badge works out for whoever is reading it, quoted in the name or the description
		by writing its own name between braces — <code class="font-mono">{'{target}'}</code>. It belongs
		to this achievement alone.
	</p>

	{#each textProblems as problem}
		<div class="alert alert-warning py-2">
			<span class="text-sm">{problem.message}</span>
		</div>
	{/each}

	{#if variables.length > 0}
		<div class="flex flex-col gap-2">
			{#each variables as variable, index (index)}
				{@const nameProblem = problemFor(index, 'name')}
				{@const formulaProblem = problemFor(index, 'formula')}
				<div class="flex flex-col gap-2 rounded-box border border-base-300 p-3">
					<div class="flex flex-col gap-2 sm:flex-row">
						<input
							class={classNames('input input-bordered input-sm w-full font-mono sm:w-40', {
								'input-error': !!nameProblem
							})}
							type="text"
							placeholder="target"
							value={variable.name}
							on:input={(event) => update(index, { name: event.currentTarget.value })}
						/>
						<input
							class={classNames('input input-bordered input-sm w-full flex-1 font-mono', {
								'input-error': !!formulaProblem
							})}
							type="text"
							maxlength={ACHIEVEMENT_FORMULA_MAX_LENGTH}
							placeholder="level * 3 + cards(color = red)"
							value={variable.formula}
							on:input={(event) => update(index, { formula: event.currentTarget.value })}
						/>
						<button
							class="btn btn-ghost btn-sm text-error"
							type="button"
							on:click={() => remove(index)}
						>
							Remove
						</button>
					</div>
					{#if nameProblem || formulaProblem}
						<p class="text-error text-xs">{nameProblem ?? formulaProblem}</p>
					{:else}
						<p class="text-xs opacity-60">
							<code class="font-mono">{`{${variable.name}}`}</code>
							reads
							<span class="font-semibold">{values[variable.name]}</span>
							for the sample player below.
						</p>
					{/if}
				</div>
			{/each}
		</div>

	{/if}

	<div class="divider my-0"></div>

	<!-- The requirement: the one part of a badge the database is told, because awarding
	     is a rule and rules are enforced where a browser cannot edit them. Anything
	     typed here is compiled on the next Supabase sync; until then the game is still
	     awarding the rule that was synced before it. -->
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center gap-3">
			<h3 class="text-lg font-semibold">Requirement</h3>
			{#if requirement.trim() && !requirementProblem}
				<span class={classNames('badge badge-sm', sampleMet ? 'badge-success' : 'badge-ghost')}>
					{sampleMet ? 'Met by the sample player' : 'Not met by the sample player'}
				</span>
				<span class="text-xs opacity-60">
					pays {sampleAward.toLocaleString()} exp at level {sampleLevel}
				</span>
			{:else if !requirement.trim()}
				<span class="badge badge-ghost badge-sm">No rule — never set, never awarded</span>
			{/if}
		</div>
		<p class="text-sm opacity-70">
			What earns it: two amounts compared — <code class="font-mono">&gt;=</code>,
			<code class="font-mono">&lt;=</code>, <code class="font-mono">&gt;</code>,
			<code class="font-mono">&lt;</code>, <code class="font-mono">=</code>,
			<code class="font-mono">!=</code> — combined with
			<code class="font-mono">and</code>/<code class="font-mono">or</code>/<code class="font-mono"
				>not</code
			>, and free to quote this badge's own variables by name. A badge with no requirement is never
			set as one of a player's three for the day and can never be claimed.
		</p>
		<input
			class={classNames('input input-bordered w-full font-mono', {
				'input-error': !!requirementProblem
			})}
			type="text"
			maxlength={ACHIEVEMENT_REQUIREMENT_MAX_LENGTH}
			placeholder="cards(color = red) >= target"
			value={requirement}
			on:input={(event) => dispatch('changerequirement', { requirement: event.currentTarget.value })}
		/>
		{#if requirementProblem}
			<p class="text-error text-xs">{requirementProblem}</p>
		{/if}
	</div>

	{#if variables.length > 0 || requirement.trim()}
		<div class="flex flex-col gap-2 rounded-box bg-base-200 p-3">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm font-semibold">Preview</span>
				<span class="text-xs opacity-60">
					{SAMPLE_CARDS.length} sample cards ({SAMPLE_CARDS.filter(
						(sample) => sample.box === SpawnBox.White
					).length} white, {SAMPLE_CARDS.filter((sample) => sample.box === SpawnBox.Black)
						.length} black, 3 fielded), at level
				</span>
				<input
					class="input input-bordered input-xs w-16"
					type="number"
					min={MIN_LEVEL}
					max={MAX_LEVEL}
					bind:value={sampleLevel}
				/>
			</div>
			<p class="font-semibold">{preview.name}</p>
			<p class="text-sm opacity-80">{preview.description}</p>
		</div>
	{/if}

	<details class="collapse-arrow collapse border border-base-300">
		<summary class="collapse-title text-sm font-medium">What a formula can read</summary>
		<div class="collapse-content flex flex-col gap-2 text-xs">
			<p>
				Arithmetic over the game's own values: <code class="font-mono">+ - * / % ^</code>, unary
				minus and parentheses.
			</p>
			<p>
				<code class="font-mono">level</code> — the player's level.
				<code class="font-mono">cards</code> — how many cards they own, all of them or the ones
				matching a filter in its parentheses.
			</p>
			<p>A filter tests these fields, combined with <code class="font-mono">and</code>,
				<code class="font-mono">or</code>, <code class="font-mono">not</code> and parentheses, using
				<code class="font-mono">=</code>, <code class="font-mono">!=</code> or
				<code class="font-mono">in [a, b]</code>:</p>
			<ul class="ml-4 list-disc">
				{#each Object.entries(CARD_FIELDS) as [field, spec]}
					<li>
						<code class="font-mono">{field}</code> — {spec.hint}{#if spec.values}: <span
							class="font-mono">{spec.values.join(', ')}</span
						>{/if}
					</li>
				{/each}
			</ul>
			<p class="font-mono opacity-70">
				cards(box = white and not color = orange) &nbsp; (level + cards(team = true)) * 10 &nbsp;
				cards(color in [red, blue])
			</p>
			<p>
				A <span class="font-medium">requirement</span> is the same arithmetic on both sides of a
				comparison, and may name the variables above:
			</p>
			<p class="font-mono opacity-70">
				cards(color = red) &gt;= 3 &nbsp; cards &gt;= target and level &gt;= 5 &nbsp; not
				cards(box = white) = 0
			</p>
		</div>
	</details>
</section>
