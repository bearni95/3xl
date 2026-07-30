<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { MUSIC_TITLE_MAX_LENGTH, type MusicTrack } from '$types/music.type';
	import { musicTrackSrc } from '$utils/music/tracks';

	// What is said about one vendored song: its title, and the show it opens. The song
	// itself is not authored here — the file is a fact on disk, dropped into
	// @3xl/assets' public/music, and this only ever answers it. So `file` is shown and
	// never edited, the way an achievement's saved id is.
	//
	// Two views of one draft, like the achievement editor's: the fields, and the JSON
	// entry as public/music.json will hold it. Whichever tab is open, Save sends the
	// same document.

	/** The asset this definition is about. */
	export let file: string;
	/** Its entry as the file holds it, or null for a song nothing is said about yet. */
	export let track: MusicTrack | null = null;
	/** The saved shows a song may be linked to, in the order the select offers them. */
	export let shows: { id: number; name: string }[] = [];
	export let saving: boolean = false;
	export let deleting: boolean = false;
	export let errorMessage: string = '';

	const dispatch = createEventDispatcher<{
		save: MusicTrack;
		delete: { file: string };
		cancel: void;
	}>();

	const isNew = track === null;

	// The one document this editor edits.
	let draft: MusicTrack = track ? { ...track } : { file, title: '', showId: null };

	let tab: 'form' | 'json' = 'form';
	let jsonText = serialize(draft);
	let jsonError = '';

	function serialize(value: MusicTrack): string {
		return JSON.stringify(value, null, '\t');
	}

	function openTab(next: 'form' | 'json'): void {
		// Leaving the fields re-serializes, so the JSON always shows what is really
		// staged; leaving the JSON keeps whatever last parsed cleanly.
		if (next === 'json') {
			jsonText = serialize(draft);
			jsonError = '';
		}
		tab = next;
	}

	/**
	 * Parse the textarea into the draft on every keystroke. An unparseable or
	 * disagreeing document leaves the draft untouched and blocks Save, so the tab can
	 * never quietly send something other than what is on screen.
	 */
	function parseJson(): void {
		let parsed: Partial<MusicTrack>;
		try {
			parsed = JSON.parse(jsonText) as Partial<MusicTrack>;
		} catch (error) {
			jsonError = error instanceof Error ? error.message : String(error);
			return;
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			jsonError = 'A track is a JSON object.';
			return;
		}
		// The file is what the entry is about, not a field of it: retyping it here would
		// author a definition for a different song, or for no song at all.
		if (parsed.file !== file) {
			jsonError = `This entry is about "${file}" — the file it names cannot be changed here.`;
			return;
		}
		jsonError = '';
		draft = {
			file,
			title: typeof parsed.title === 'string' ? parsed.title : '',
			// Anything that is not a show id at all reads as "no show", which is what the
			// select's own empty option means.
			showId: typeof parsed.showId === 'number' ? parsed.showId : null
		};
	}

	/** The select's value: an id as a string, or '' for the no-show option. */
	function chooseShow(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		draft = { ...draft, showId: value ? Number(value) : null };
	}

	function save(): void {
		if (!canSave) return;
		dispatch('save', { file, title: draft.title.trim(), showId: draft.showId });
	}

	// Everything the backend will insist on, checked here so the button says so before
	// a round trip does. A link to a show the local collection does not hold is the one
	// the API refuses by name, so it is refused here in the same terms.
	$: validTitle =
		draft.title.trim().length > 0 && draft.title.trim().length <= MUSIC_TITLE_MAX_LENGTH;
	$: validShow = draft.showId === null || shows.some((show) => show.id === draft.showId);
	$: canSave = !saving && !deleting && !jsonError && validTitle && validShow;
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

	<!-- The song itself, so the author can hear which one they are naming: a file name
		is not enough to tell two openings apart. The browser's own controls — this is
		the one place a song is listened to rather than played to somebody. -->
	<audio class="w-full" controls preload="metadata" src={musicTrackSrc(file)}></audio>

	{#if tab === 'form'}
		<div class="flex flex-col gap-4">
			<label class="form-control w-full">
				<div class="label">
					<span class="label-text">Title</span>
					<span class="label-text-alt opacity-60">
						{draft.title.trim().length}/{MUSIC_TITLE_MAX_LENGTH}
					</span>
				</div>
				<input
					class={classNames('input input-bordered w-full', {
						'input-error': draft.title.length > 0 && !validTitle
					})}
					placeholder="We are"
					maxlength={MUSIC_TITLE_MAX_LENGTH}
					bind:value={draft.title}
				/>
			</label>

			<label class="form-control w-full">
				<div class="label">
					<span class="label-text">Show</span>
					<span class="label-text-alt opacity-60">
						{shows.length} saved
					</span>
				</div>
				<!-- The saved shows and nothing else: a link is what puts the show's glyph on
					the plate in the map's corner, so it has to name a show the game holds. A
					song that opens none is left on the first option and lettered by title. -->
				<select
					class="select select-bordered w-full"
					value={draft.showId === null ? '' : String(draft.showId)}
					on:change={chooseShow}
				>
					<option value="">— No show —</option>
					{#each shows as show (show.id)}
						<option value={String(show.id)}>{show.name}</option>
					{/each}
				</select>
			</label>

			{#if !validShow}
				<p class="text-error text-xs">
					This entry names show {draft.showId}, which is not in the saved collection. Pick one of
					the shows above, or save it on the /shows screen first.
				</p>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<textarea
				class={classNames('textarea textarea-bordered w-full font-mono text-xs', {
					'textarea-error': !!jsonError
				})}
				rows="8"
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
					<code class="font-mono">public/music.json</code>. Saving writes it into the git tree.
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
			{isNew ? 'Define song' : 'Save changes'}
		</button>
		<button class="btn btn-ghost" type="button" on:click={() => dispatch('cancel')}>Cancel</button>
		{#if !isNew}
			<!-- Removes what was said about the song, never the song: the file stays in
				@3xl/assets and can be defined again. -->
			<button
				class="btn btn-error btn-outline ml-auto"
				type="button"
				on:click={() => dispatch('delete', { file })}
				disabled={saving || deleting}
			>
				{#if deleting}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Remove definition
			</button>
		{/if}
	</div>
</div>
