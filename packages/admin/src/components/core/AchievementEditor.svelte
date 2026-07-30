<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import slugify from '$utils/string/slugify';
	import {
		ACHIEVEMENT_ID_PATTERN,
		ACHIEVEMENT_NAME_MAX_LENGTH,
		ACHIEVEMENT_DESCRIPTION_MAX_LENGTH,
		type Achievement
	} from '$types/achievement.type';
	import GameIcon from '$components/core/GameIcon.svelte';
	import IconPickerModal from '$components/core/IconPickerModal.svelte';

	// The achievement being edited, or null to author a new one. The parent keys
	// this component on the id, so switching selection remounts with a fresh draft
	// rather than carrying half-typed fields across.
	export let achievement: Achievement | null = null;
	export let icons: string[] = [];
	// Every id already in the collection. A save is an upsert by id, so without
	// this a new badge that happens to reuse one would silently overwrite it.
	export let existingIds: string[] = [];
	export let saving: boolean = false;
	export let deleting: boolean = false;
	export let errorMessage: string = '';

	const dispatch = createEventDispatcher<{
		save: Achievement;
		delete: { id: string };
		cancel: void;
	}>();

	const isNew = achievement === null;

	// The one document this editor edits. The form and the JSON tab are two views
	// of it, not two documents: whichever tab is open, Save sends this.
	let draft: Achievement = achievement
		? { ...achievement }
		: { id: '', name: '', description: '', icon: '' };

	let tab: 'form' | 'json' = 'form';
	let pickerOpen = false;
	// Set once the id is hand-typed, which stops the name from writing over it.
	let idTouched = false;

	let jsonText = serialize(draft);
	let jsonError = '';

	function serialize(value: Achievement): string {
		return JSON.stringify(value, null, '\t');
	}

	/**
	 * A new achievement's id follows its name until someone types an id of their
	 * own. Done on input rather than in a reactive statement: the statement would
	 * both read and write `draft` and re-trigger itself.
	 */
	function syncIdFromName(): void {
		if (!isNew || idTouched) return;
		draft.id = slugify(draft.name);
	}

	function openTab(next: 'form' | 'json'): void {
		// Leaving the form re-serializes, so the JSON always shows what is really
		// staged; leaving the JSON keeps whatever last parsed cleanly.
		if (next === 'json') {
			jsonText = serialize(draft);
			jsonError = '';
		}
		tab = next;
	}

	/**
	 * Parse the textarea into the draft on every keystroke. An unparseable or
	 * disagreeing document leaves the draft untouched and blocks Save, so the tab
	 * can never quietly send something other than what is on screen.
	 */
	function parseJson(): void {
		let parsed: Partial<Achievement>;
		try {
			parsed = JSON.parse(jsonText) as Partial<Achievement>;
		} catch (error) {
			jsonError = error instanceof Error ? error.message : String(error);
			return;
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			jsonError = 'An achievement is a JSON object.';
			return;
		}
		// An existing badge's id is its Supabase primary key and what every award of
		// it points at, so it is not a field a re-typed document may move: saving
		// under a new id would leave the old one behind rather than rename it.
		if (!isNew && parsed.id !== draft.id) {
			jsonError = `The id of a saved achievement cannot be changed here — it is "${draft.id}". Delete it and create a new one instead.`;
			return;
		}
		jsonError = '';
		draft = {
			id: String(parsed.id ?? ''),
			name: String(parsed.name ?? ''),
			description: String(parsed.description ?? ''),
			icon: String(parsed.icon ?? '')
		};
		if (isNew && draft.id) idTouched = true;
	}

	function chooseIcon(event: CustomEvent<{ icon: string }>): void {
		draft.icon = event.detail.icon;
		pickerOpen = false;
		if (tab === 'json') jsonText = serialize(draft);
	}

	function save(): void {
		if (!canSave) return;
		dispatch('save', { ...draft });
	}

	// Everything the backend will insist on, checked here so the button says so
	// before a round trip does. The icon is checked for shape only — whether that
	// file exists is the server's to answer, and it does.
	$: idTaken = isNew && existingIds.includes(draft.id);
	$: validId = ACHIEVEMENT_ID_PATTERN.test(draft.id) && !idTaken;
	$: validName =
		draft.name.trim().length > 0 && draft.name.trim().length <= ACHIEVEMENT_NAME_MAX_LENGTH;
	$: validDescription =
		draft.description.trim().length > 0 &&
		draft.description.trim().length <= ACHIEVEMENT_DESCRIPTION_MAX_LENGTH;
	$: canSave =
		!saving && !deleting && !jsonError && validId && validName && validDescription && !!draft.icon;
</script>

<div class="flex flex-col gap-4">
	<div role="tablist" class="tabs tabs-boxed w-fit">
		<button
			role="tab"
			class={classNames('tab', { 'tab-active': tab === 'form' })}
			on:click={() => openTab('form')}
		>
			Fields
		</button>
		<button
			role="tab"
			class={classNames('tab', { 'tab-active': tab === 'json' })}
			on:click={() => openTab('json')}
		>
			JSON
		</button>
	</div>

	{#if tab === 'form'}
		<div class="flex flex-col gap-4 md:flex-row">
			<div class="flex flex-col items-center gap-2">
				<GameIcon name={draft.icon} size="size-28" />
				<button type="button" class="btn btn-sm" on:click={() => (pickerOpen = true)}>
					{draft.icon ? 'Change icon' : 'Choose icon'}
				</button>
				{#if draft.icon}
					<span class="font-mono text-xs opacity-60">{draft.icon}</span>
				{/if}
			</div>

			<div class="flex flex-1 flex-col gap-3">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">Name</span>
						<span class="label-text-alt opacity-60">
							{draft.name.trim().length}/{ACHIEVEMENT_NAME_MAX_LENGTH}
						</span>
					</div>
					<input
						class="input input-bordered w-full"
						type="text"
						maxlength={ACHIEVEMENT_NAME_MAX_LENGTH}
						placeholder="First blood"
						bind:value={draft.name}
						on:input={syncIdFromName}
					/>
				</label>

				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">Id</span>
						<span class={classNames('label-text-alt', idTaken ? 'text-error' : 'opacity-60')}>
							{#if idTaken}
								already taken — a save would overwrite it
							{:else}
								{isNew ? 'follows the name until you type one' : 'fixed once saved'}
							{/if}
						</span>
					</div>
					<input
						class={classNames('input input-bordered w-full font-mono', {
							'input-error': draft.id.length > 0 && !validId
						})}
						type="text"
						placeholder="first-blood"
						bind:value={draft.id}
						on:input={() => (idTouched = true)}
						disabled={!isNew}
					/>
				</label>

				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">Description</span>
						<span class="label-text-alt opacity-60">
							{draft.description.trim().length}/{ACHIEVEMENT_DESCRIPTION_MAX_LENGTH}
						</span>
					</div>
					<textarea
						class="textarea textarea-bordered w-full"
						rows="3"
						maxlength={ACHIEVEMENT_DESCRIPTION_MAX_LENGTH}
						placeholder="Win your first fight."
						bind:value={draft.description}
					></textarea>
				</label>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<textarea
				class={classNames('textarea textarea-bordered w-full font-mono text-xs', {
					'textarea-error': !!jsonError
				})}
				rows="12"
				spellcheck="false"
				bind:value={jsonText}
				on:input={parseJson}
			></textarea>
			{#if jsonError}
				<p class="text-error text-xs">{jsonError}</p>
			{:else}
				<p class="text-xs opacity-60">
					The entry as it is stored in
					<code class="font-mono">@3xl/data</code>'s
					<code class="font-mono">public/achievements.json</code>. Saving writes it into the git
					tree.
				</p>
			{/if}
		</div>
	{/if}

	{#if errorMessage}
		<div class="alert alert-error">
			<span>{errorMessage}</span>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-primary" type="button" on:click={save} disabled={!canSave}>
			{#if saving}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
			{isNew ? 'Create achievement' : 'Save changes'}
		</button>
		<button class="btn btn-ghost" type="button" on:click={() => dispatch('cancel')}>Cancel</button>
		{#if !isNew}
			<button
				class="btn btn-error btn-outline ml-auto"
				type="button"
				on:click={() => dispatch('delete', { id: draft.id })}
				disabled={saving || deleting}
			>
				{#if deleting}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Delete
			</button>
		{/if}
	</div>
</div>

<IconPickerModal
	{icons}
	open={pickerOpen}
	selected={draft.icon}
	on:select={chooseIcon}
	on:close={() => (pickerOpen = false)}
/>
