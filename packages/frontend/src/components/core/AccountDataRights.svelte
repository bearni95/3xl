<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, json } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { legalService } from '$services/legal.service';
	import { openLegalDocument } from '$services/legalModal';
	import { LEGAL_DOCUMENTS, type LegalAcceptance, type LegalDocumentId } from '$types/legal.type';

	// The two rights that are buttons rather than letters, plus the record of what this
	// account has agreed to.
	//
	// Access, portability and erasure (GDPR arts. 15, 20 and 17, and the equivalents in
	// the US state laws) are all rights that are normally exercised by writing to
	// somebody and waiting a month. There is nothing here that needs a month: the data
	// is one query and the deletion is one cascade, so they are a download and a button,
	// and the address in the privacy notice is left for the rights that genuinely need a
	// conversation. A right you have to ask for is a right most people never use.
	//
	// The deletion asks twice and the second time asks for a word to be typed. Not
	// friction for its own sake — there is no undo, no grace period and no soft-delete
	// behind this, because keeping a copy of the data of somebody who asked for it to be
	// gone is the one thing art. 17 does not allow. So the warning has to carry the
	// weight the recovery would have.

	export let classes: string = '';

	let exporting = false;
	let exportError: string | null = null;

	let confirming = false;
	let confirmWord = '';
	let deleting = false;
	let deleteError: string | null = null;

	let acceptances: LegalAcceptance[] = [];

	onMount(() => {
		void loadAcceptances();
	});

	async function loadAcceptances(): Promise<void> {
		try {
			acceptances = await legalService.history();
		} catch {
			// The list is a courtesy — it says what is already on the server. Failing to
			// read it must not take the two buttons down with it.
			acceptances = [];
		}
	}

	/** A document's own title, from the catalogue, so a row names what it links to. */
	function titleOf(id: LegalDocumentId): string {
		const content = $json(`legal.documents.${id}`) as { title?: string } | null;
		return content?.title ?? id;
	}

	/** Whether `id` is one of the documents this build publishes. */
	function known(id: LegalDocumentId): boolean {
		return LEGAL_DOCUMENTS.includes(id);
	}

	function formatDate(value: string): string {
		const at = new Date(value);
		return Number.isNaN(at.getTime()) ? value : at.toLocaleDateString();
	}

	async function exportData(): Promise<void> {
		if (exporting) return;
		exportError = null;
		exporting = true;
		try {
			const data = await authService.exportAccountData();
			if (!data) return;
			// Handed over as a file the player keeps, not shown on screen: portability
			// means a copy they can take somewhere else, and JSON is the "structured,
			// commonly used and machine-readable" form art. 20 asks for.
			const blob = new Blob([JSON.stringify(data, null, '\t')], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `3xl-dades-${new Date().toISOString().slice(0, 10)}.json`;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch {
			exportError = $_('legal.account.exportFailed');
		} finally {
			exporting = false;
		}
	}

	function startDelete(): void {
		deleteError = null;
		confirmWord = '';
		confirming = true;
	}

	function cancelDelete(): void {
		confirming = false;
		confirmWord = '';
		deleteError = null;
	}

	$: confirmationWord = $_('legal.account.deleteConfirmWord');
	$: canDelete = !deleting && confirmWord.trim().toUpperCase() === confirmationWord.toUpperCase();

	async function confirmDelete(): Promise<void> {
		if (!canDelete) return;
		deleteError = null;
		deleting = true;
		try {
			// Signing out is part of the same call, so the page is left holding no session
			// for an account that no longer exists.
			await authService.deleteAccount();
		} catch {
			deleteError = $_('legal.account.deleteFailed');
			deleting = false;
		}
	}
</script>

<section class={classNames('flex flex-col gap-3', classes)}>
	<div class="divider my-0"></div>

	<div class="flex flex-col gap-1">
		<h4 class="font-semibold">{$_('legal.account.heading')}</h4>
		<p class="text-xs text-base-content/60">{$_('legal.account.intro')}</p>
	</div>

	<div class="flex flex-col gap-1">
		<button
			type="button"
			class={classNames('btn btn-outline btn-sm', { 'btn-disabled': exporting })}
			disabled={exporting}
			on:click={exportData}
		>
			{#if exporting}
				<span class="loading loading-spinner loading-xs"></span>
				{$_('legal.account.exporting')}
			{:else}
				{$_('legal.account.export')}
			{/if}
		</button>
		<span class="text-xs text-base-content/50">{$_('legal.account.exportHint')}</span>
		{#if exportError}
			<span class="text-xs text-error">{exportError}</span>
		{/if}
	</div>

	<!-- What this account has agreed to, and when. It is here rather than in the
		documents because it is a fact about the account: the documents say what the terms
		are, this says which version of them you are under. -->
	<div class="flex flex-col gap-1">
		<span class="text-sm font-semibold">{$_('legal.account.acceptedHeading')}</span>
		{#if acceptances.length === 0}
			<span class="text-xs text-base-content/50">{$_('legal.account.acceptedEmpty')}</span>
		{:else}
			<ul class="flex flex-col gap-0.5 text-xs text-base-content/60">
				{#each acceptances as acceptance (acceptance.document + acceptance.version)}
					<li>
						{#if known(acceptance.document)}
							<button
								type="button"
								class="link"
								on:click={() => openLegalDocument(acceptance.document)}
							>
								{$_('legal.account.acceptedRow', {
									values: {
										document: titleOf(acceptance.document),
										version: acceptance.version,
										date: formatDate(acceptance.acceptedAt)
									}
								})}
							</button>
						{:else}
							{$_('legal.account.acceptedRow', {
								values: {
									document: acceptance.document,
									version: acceptance.version,
									date: formatDate(acceptance.acceptedAt)
								}
							})}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="flex flex-col gap-1">
		{#if !confirming}
			<button type="button" class="btn btn-outline btn-error btn-sm" on:click={startDelete}>
				{$_('legal.account.delete')}
			</button>
			<span class="text-xs text-base-content/50">{$_('legal.account.deleteHint')}</span>
		{:else}
			<!-- The second ask. It carries the whole of the warning, because after this
				there is nothing to appeal to. -->
			<div class="rounded-box border border-error/40 bg-error/5 p-3">
				<p class="text-sm font-semibold">{$_('legal.account.deleteConfirmTitle')}</p>
				<p class="mt-1 text-xs text-base-content/70">
					{$_('legal.account.deleteConfirmBody', {
						values: { word: confirmationWord }
					})}
				</p>
				<input
					type="text"
					bind:value={confirmWord}
					disabled={deleting}
					placeholder={confirmationWord}
					class="input input-bordered input-sm mt-2 w-full"
				/>
				{#if deleteError}
					<p class="mt-2 text-xs text-error">{deleteError}</p>
				{/if}
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						disabled={deleting}
						on:click={cancelDelete}
					>
						{$_('common.cancel')}
					</button>
					<button
						type="button"
						class={classNames('btn btn-error btn-sm', { 'btn-disabled': !canDelete })}
						disabled={!canDelete}
						on:click={confirmDelete}
					>
						{#if deleting}
							<span class="loading loading-spinner loading-xs"></span>
							{$_('legal.account.deleting')}
						{:else}
							{$_('legal.account.deleteConfirm')}
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</section>
