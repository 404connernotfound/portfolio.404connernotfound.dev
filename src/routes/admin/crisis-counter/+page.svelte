<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import AdminModal from '$lib/components/AdminModal.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;

	type FormFeedback = {
		action?: string;
		message?: string;
		success?: boolean;
		fieldErrors?: Record<string, string>;
		itemId?: number;
	};

	const feedback = form as FormFeedback | undefined;
	const isAction = (action: string) => feedback?.action === action;
	const fieldError = (action: string, field: string, itemId?: number) =>
		feedback?.action === action && (itemId === undefined || feedback?.itemId === itemId)
			? feedback?.fieldErrors?.[field]
			: undefined;

	let isCreateModalOpen = feedback?.action === 'createCrisis' && feedback?.success !== true;
	let editingCrisisId: number | null =
		feedback?.action === 'updateCrisis' && feedback?.success !== true ? (feedback.itemId ?? null) : null;
	let deletingCrisisId: number | null =
		feedback?.action === 'deleteCrisis' && feedback?.success !== true ? (feedback.itemId ?? null) : null;

	const closeCreateModal = () => {
		isCreateModalOpen = false;
	};

	const closeEditModal = () => {
		editingCrisisId = null;
	};

	const closeDeleteModal = () => {
		deletingCrisisId = null;
	};
</script>

<SeoHead title={formatTitle('Admin | Crisis Counter')} description="Manage known early and midlife crises." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Crisis counter</h1>
		<p class="max-w-2xl text-lg text-ink-200">
			Log the known early and midlife crises that make up the public counter.
		</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
		<MotionReveal className="glass p-8">
			<h2 class="text-2xl font-semibold text-white">Add a crisis</h2>
			<p class="mt-3 text-sm text-ink-200">
				Give it a title, a simple explanation, and optionally tag it as early-life or midlife.
			</p>
			{#if isAction('createCrisis') && feedback?.success && feedback?.message}
				<p class="mt-3 text-sm text-aurora-200">{feedback?.message}</p>
			{/if}
			<button
				class="nav-pill mt-6 border-ink-100 bg-ink-900 text-white"
				type="button"
				on:click={() => (isCreateModalOpen = true)}
			>
				Add crisis
			</button>
		</MotionReveal>
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold text-white">
				Crises <span class="text-sm font-normal text-ink-200">({data.crisisItems.length})</span>
			</h2>
			{#if data.crisisItems.length}
				{#each data.crisisItems as item}
					<MotionReveal className="card space-y-4">
						{#if isAction('updateCrisis') && feedback?.itemId === item.id && feedback?.message}
							<p class={`text-xs ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						{#if isAction('deleteCrisis') && feedback?.itemId === item.id && feedback?.message}
							<p class={`text-xs ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-semibold text-white">{item.title}</h3>
									{#if item.category}
										<span class="badge">{item.category}</span>
									{/if}
									<span class="text-xs text-ink-200">Sort {item.sort}</span>
								</div>
								{#if item.description}
									<p class="text-sm text-ink-200">{item.description}</p>
								{/if}
							</div>
							<div class="flex flex-wrap gap-2">
								<button
									class="nav-pill border-ink-100 bg-ink-900 text-white"
									type="button"
									on:click={() => (editingCrisisId = item.id)}
								>
									Edit
								</button>
								<button class="nav-pill" type="button" on:click={() => (deletingCrisisId = item.id)}>
									Delete
								</button>
							</div>
						</div>
					</MotionReveal>

					<AdminModal
						open={editingCrisisId === item.id}
						title={`Edit crisis: ${item.title}`}
						description="Update the title, explanation, category, or sort order."
						on:close={closeEditModal}
					>
						{#if isAction('updateCrisis') && feedback?.itemId === item.id && feedback?.message}
							<p class={`mb-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						<form class="grid gap-4" method="POST" action="?/updateCrisis">
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={item.id} />
							<div class="grid gap-4 md:grid-cols-2">
								<div>
									<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for={`title-${item.id}`}>
										Title
									</label>
									<input
										id={`title-${item.id}`}
										name="title"
										value={item.title}
										required
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateCrisis', 'title', item.id))}
									/>
									{#if fieldError('updateCrisis', 'title', item.id)}
										<p class="mt-2 text-xs text-red-200">{fieldError('updateCrisis', 'title', item.id)}</p>
									{/if}
								</div>
								<div>
									<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for={`category-${item.id}`}>
										Category
									</label>
									<input
										id={`category-${item.id}`}
										name="category"
										value={item.category ?? ''}
										placeholder="Early-life, Midlife..."
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									/>
								</div>
							</div>
							<div>
								<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for={`description-${item.id}`}>
									Simple explanation
								</label>
								<textarea
									id={`description-${item.id}`}
									name="description"
									rows="3"
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
								>{item.description ?? ''}</textarea>
							</div>
							<div>
								<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for={`sort-${item.id}`}>
									Sort order
								</label>
								<input
									id={`sort-${item.id}`}
									name="sort"
									type="number"
									value={item.sort}
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
								/>
							</div>
							<div class="flex flex-wrap gap-3">
								<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">Save crisis</button>
								<button class="nav-pill" type="button" on:click={closeEditModal}>Cancel</button>
							</div>
						</form>
					</AdminModal>

					<AdminModal
						open={deletingCrisisId === item.id}
						title={`Delete crisis: ${item.title}?`}
						description="This permanently removes the crisis from the counter."
						on:close={closeDeleteModal}
						maxWidthClass="max-w-2xl"
					>
						<form class="space-y-4" method="POST" action="?/deleteCrisis">
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={item.id} />
							<p class="text-sm text-ink-200">Category: {item.category ?? 'Uncategorized'}</p>
							<div class="flex flex-wrap gap-3">
								<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">Delete crisis</button>
								<button class="nav-pill" type="button" on:click={closeDeleteModal}>Cancel</button>
							</div>
						</form>
					</AdminModal>
				{/each}
			{:else}
				<div class="card text-sm text-ink-200">No crises logged yet.</div>
			{/if}
		</div>
	</div>
</section>

<AdminModal
	open={isCreateModalOpen}
	title="Add a crisis"
	description="Create a new entry for the public crisis counter."
	on:close={closeCreateModal}
>
	{#if isAction('createCrisis') && feedback?.message}
		<p class={`mb-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
			{feedback?.message}
		</p>
	{/if}
	<form class="space-y-4" method="POST" action="?/createCrisis">
		<input type="hidden" name="csrfToken" value={data.csrfToken} />
		<div>
			<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="crisisTitle">
				Title
			</label>
			<input
				id="crisisTitle"
				name="title"
				required
				placeholder="Bought a motorcycle"
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
				aria-invalid={Boolean(fieldError('createCrisis', 'title'))}
			/>
			{#if fieldError('createCrisis', 'title')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createCrisis', 'title')}</p>
			{/if}
		</div>
		<div>
			<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="crisisDescription">
				Simple explanation
			</label>
			<textarea
				id="crisisDescription"
				name="description"
				rows="3"
				placeholder="Decided 45 minutes of road noise was cheaper than therapy."
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
			></textarea>
		</div>
		<div>
			<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="crisisCategory">
				Category
			</label>
			<input
				id="crisisCategory"
				name="category"
				placeholder="Early-life, Midlife..."
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
			/>
		</div>
		<div>
			<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="crisisSort">
				Sort order
			</label>
			<input
				id="crisisSort"
				name="sort"
				type="number"
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
			/>
		</div>
		<div class="flex flex-wrap gap-3">
			<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">Add crisis</button>
			<button class="nav-pill" type="button" on:click={closeCreateModal}>Cancel</button>
		</div>
	</form>
</AdminModal>
