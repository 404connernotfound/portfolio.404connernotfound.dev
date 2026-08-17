<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import AdminModal from '$lib/components/AdminModal.svelte';
	import SafeImage from '$lib/components/SafeImage.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { resolveWorkCoverImage } from '$lib/utils/content';
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

	let isCreateModalOpen = feedback?.action === 'createWork' && feedback?.success !== true;
	let editingWorkId: number | null =
		feedback?.action === 'updateWork' && feedback?.success !== true
			? (feedback.itemId ?? null)
			: null;
	let deletingWorkId: number | null =
		feedback?.action === 'deleteWork' && feedback?.success !== true
			? (feedback.itemId ?? null)
			: null;

	const closeCreateModal = () => {
		isCreateModalOpen = false;
	};

	const closeEditModal = () => {
		editingWorkId = null;
	};

	const closeDeleteModal = () => {
		deletingWorkId = null;
	};
</script>

<SeoHead title={formatTitle('Admin | Work')} description="Manage work items and section intro." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Work</h1>
		<p class="max-w-2xl text-lg text-ink-200">Update work intro copy and manage projects.</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<MotionReveal className="glass p-8">
		<h2 class="text-2xl font-semibold text-white">Work section</h2>
		{#if isAction('updateWorkSection') && feedback?.message}
			<p class={`mt-3 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
				{feedback?.message}
			</p>
		{/if}
		<form class="mt-6 grid gap-4" method="POST" action="?/updateWorkSection">
			<input type="hidden" name="csrfToken" value={data.csrfToken} />
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workTitle"
				>
					Title
				</label>
				<input
					id="workTitle"
					name="workTitle"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					value={data.siteSettings.workTitle}
				/>
			</div>
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workIntro"
				>
					Intro
				</label>
				<input
					id="workIntro"
					name="workIntro"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					value={data.siteSettings.workIntro}
				/>
			</div>
			<div class="flex justify-end">
				<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">
					Save section
				</button>
			</div>
		</form>
	</MotionReveal>
</section>

<section class="section-pad">
	<div class="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
		<MotionReveal className="glass p-8">
			<h2 class="text-2xl font-semibold text-white">Work workflows</h2>
			<p class="mt-3 text-sm text-ink-200">
				Use focused modals to add and edit work items quickly.
			</p>
			{#if isAction('createWork') && feedback?.success && feedback?.message}
				<p class="mt-3 text-sm text-aurora-200">{feedback?.message}</p>
			{/if}
			<button
				class="nav-pill mt-6 border-ink-100 bg-ink-900 text-white"
				type="button"
				on:click={() => (isCreateModalOpen = true)}
			>
				Add work item
			</button>
		</MotionReveal>
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold text-white">
				Work items <span class="text-sm font-normal text-ink-200">({data.workItems.length})</span>
			</h2>
			{#if data.workItems.length}
				{#each data.workItems as item}
					{@const coverImage = resolveWorkCoverImage(item)}
					<MotionReveal className="card space-y-4">
						{#if isAction('updateWork') && feedback?.success && feedback?.itemId === item.id && feedback?.message}
							<p class="text-xs text-aurora-200">{feedback?.message}</p>
						{/if}
						{#if isAction('deleteWork') && feedback?.itemId === item.id && feedback?.message}
							<p class={`text-xs ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-2">
								<div
									class="aspect-[4/3] w-full max-w-xs overflow-hidden rounded-2xl border border-ink-200/30 bg-white/5"
								>
									{#if coverImage}
										<SafeImage
											src={coverImage}
											alt={item.imageAlt ?? `${item.title} preview`}
											className="h-full w-full object-cover"
										>
											<svelte:fragment slot="fallback">
												<div
													class="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
												>
													Preview unavailable
												</div>
											</svelte:fragment>
										</SafeImage>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
										>
											Preview
										</div>
									{/if}
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-semibold text-white">{item.title}</h3>
									{#if item.featured === 1}
										<span class="badge">Featured</span>
									{/if}
									<span class="text-xs text-ink-200">Sort {item.sort}</span>
									<StatusIndicator state={item.lifecycle} compact />
								</div>
								<p class="text-sm text-ink-200">{item.description}</p>
								<div class="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-ink-300">
									{#if item.role}
										<span>{item.role}</span>
									{/if}
									{#if item.tech}
										<span>{item.tech}</span>
									{/if}
									{#if item.owner}
										<span>Owner: {item.owner}</span>
									{/if}
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								{#if item.link}
									<a class="nav-pill" href={item.link} target="_blank" rel="noreferrer noopener"
										>Open</a
									>
								{/if}
								<button
									class="nav-pill border-ink-100 bg-ink-900 text-white"
									type="button"
									on:click={() => (editingWorkId = item.id)}
								>
									Edit
								</button>
								<button class="nav-pill" type="button" on:click={() => (deletingWorkId = item.id)}>
									Delete
								</button>
							</div>
						</div>
					</MotionReveal>

					<AdminModal
						open={editingWorkId === item.id}
						title={`Edit work: ${item.title}`}
						description="Update project details in a focused editor."
						on:close={closeEditModal}
						maxWidthClass="max-w-6xl"
					>
						{#if isAction('updateWork') && feedback?.itemId === item.id && feedback?.message}
							<p class={`mb-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						<form
							class="space-y-4"
							method="POST"
							action="?/updateWork"
							enctype="multipart/form-data"
						>
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={item.id} />
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`work-title-${item.id}`}
								>
									Title
								</label>
								<input
									id={`work-title-${item.id}`}
									name="title"
									value={item.title}
									required
									maxlength="120"
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									aria-invalid={Boolean(fieldError('updateWork', 'title', item.id))}
								/>
								{#if fieldError('updateWork', 'title', item.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updateWork', 'title', item.id)}
									</p>
								{/if}
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`work-description-${item.id}`}
								>
									Description
								</label>
								<textarea
									id={`work-description-${item.id}`}
									name="description"
									required
									maxlength="500"
									rows="4"
									class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-6 text-white"
									aria-invalid={Boolean(fieldError('updateWork', 'description', item.id))}
									>{item.description}</textarea
								>
								{#if fieldError('updateWork', 'description', item.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updateWork', 'description', item.id)}
									</p>
								{/if}
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`work-long-${item.id}`}
								>
									Markdown description
								</label>
								<textarea
									id={`work-long-${item.id}`}
									name="longDescription"
									maxlength="4000"
									rows="10"
									class="mt-2 min-h-[18rem] w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-7 text-white"
									aria-invalid={Boolean(fieldError('updateWork', 'longDescription', item.id))}
									>{item.longDescription ?? ''}</textarea
								>
								{#if fieldError('updateWork', 'longDescription', item.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updateWork', 'longDescription', item.id)}
									</p>
								{/if}
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`work-highlights-${item.id}`}
								>
									Highlights (one per line)
								</label>
								<textarea
									id={`work-highlights-${item.id}`}
									name="highlights"
									maxlength="600"
									rows="3"
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									aria-invalid={Boolean(fieldError('updateWork', 'highlights', item.id))}
									>{item.highlights ?? ''}</textarea
								>
								{#if fieldError('updateWork', 'highlights', item.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updateWork', 'highlights', item.id)}
									</p>
								{/if}
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-role-${item.id}`}
									>
										Role
									</label>
									<input
										id={`work-role-${item.id}`}
										name="role"
										value={item.role ?? ''}
										maxlength="80"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'role', item.id))}
									/>
									{#if fieldError('updateWork', 'role', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'role', item.id)}
										</p>
									{/if}
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-tech-${item.id}`}
									>
										Tech
									</label>
									<input
										id={`work-tech-${item.id}`}
										name="tech"
										value={item.tech ?? ''}
										maxlength="80"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'tech', item.id))}
									/>
									{#if fieldError('updateWork', 'tech', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'tech', item.id)}
										</p>
									{/if}
								</div>
							</div>
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-lifecycle-${item.id}`}
									>
										Lifecycle
									</label>
									<select
										id={`work-lifecycle-${item.id}`}
										name="lifecycle"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-ink-900 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'lifecycle', item.id))}
									>
										<option value="" selected={!item.lifecycle}>Not specified</option>
										{#each ['ACTIVE', 'MAINTAINED', 'EXPERIMENT', 'COMPLETE', 'RETIRED', 'ARCHIVED'] as state}
											<option value={state} selected={item.lifecycle === state}>{state}</option>
										{/each}
									</select>
									{#if fieldError('updateWork', 'lifecycle', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'lifecycle', item.id)}
										</p>
									{/if}
								</div>
								{#each [{ name: 'owner', label: 'Owner / provenance', value: item.owner, max: 120 }, { name: 'domain', label: 'Domain', value: item.domain, max: 120 }, { name: 'version', label: 'Version', value: item.version, max: 80 }] as metadata}
									<div>
										<label
											class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
											for={`work-${metadata.name}-${item.id}`}
										>
											{metadata.label}
										</label>
										<input
											id={`work-${metadata.name}-${item.id}`}
											name={metadata.name}
											value={metadata.value ?? ''}
											maxlength={metadata.max}
											class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
											aria-invalid={Boolean(fieldError('updateWork', metadata.name, item.id))}
										/>
										{#if fieldError('updateWork', metadata.name, item.id)}
											<p class="mt-2 text-xs text-red-200">
												{fieldError('updateWork', metadata.name, item.id)}
											</p>
										{/if}
									</div>
								{/each}
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								{#each [{ name: 'subsystems', label: 'Subsystems (one per line)', value: item.subsystems }, { name: 'trace', label: 'Execution trace (ordered, one per line)', value: item.trace }] as architecture}
									<div>
										<label
											class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
											for={`work-${architecture.name}-${item.id}`}
										>
											{architecture.label}
										</label>
										<textarea
											id={`work-${architecture.name}-${item.id}`}
											name={architecture.name}
											maxlength="1200"
											rows="5"
											class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-6 text-white"
											aria-invalid={Boolean(fieldError('updateWork', architecture.name, item.id))}
											>{architecture.value ?? ''}</textarea
										>
										{#if fieldError('updateWork', architecture.name, item.id)}
											<p class="mt-2 text-xs text-red-200">
												{fieldError('updateWork', architecture.name, item.id)}
											</p>
										{/if}
									</div>
								{/each}
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`work-link-${item.id}`}
								>
									Link
								</label>
								<input
									id={`work-link-${item.id}`}
									name="link"
									value={item.link ?? ''}
									maxlength="2048"
									type="url"
									inputmode="url"
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									aria-invalid={Boolean(fieldError('updateWork', 'link', item.id))}
								/>
								{#if fieldError('updateWork', 'link', item.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updateWork', 'link', item.id)}
									</p>
								{/if}
							</div>
							<div class="grid gap-4 md:grid-cols-[0.55fr_0.45fr]">
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-image-${item.id}`}
									>
										Image upload
									</label>
									<input
										id={`work-image-${item.id}`}
										name="image"
										type="file"
										accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'image', item.id))}
									/>
									{#if fieldError('updateWork', 'image', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'image', item.id)}
										</p>
									{/if}
									<label
										class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-image-url-${item.id}`}
									>
										External cover URL
									</label>
									<input
										id={`work-image-url-${item.id}`}
										name="imageUrl"
										type="url"
										inputmode="url"
										value={item.imageUrl ?? ''}
										maxlength="2048"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'imageUrl', item.id))}
									/>
									<p class="mt-2 text-xs text-ink-200">
										Uploaded image renders first. External URL is used when no uploaded image is
										set.
									</p>
									{#if fieldError('updateWork', 'imageUrl', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'imageUrl', item.id)}
										</p>
									{/if}
									<label
										class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-image-alt-${item.id}`}
									>
										Image alt text
									</label>
									<input
										id={`work-image-alt-${item.id}`}
										name="imageAlt"
										value={item.imageAlt ?? ''}
										maxlength="180"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updateWork', 'imageAlt', item.id))}
									/>
									{#if fieldError('updateWork', 'imageAlt', item.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updateWork', 'imageAlt', item.id)}
										</p>
									{/if}
									{#if item.imagePath}
										<label
											class="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-200"
										>
											<input type="checkbox" name="removeImage" value="1" class="h-4 w-4" />
											Remove existing image
										</label>
									{/if}
								</div>
								<div
									class="aspect-[4/3] overflow-hidden rounded-2xl border border-ink-200/30 bg-white/5"
								>
									{#if coverImage}
										<SafeImage
											src={coverImage}
											alt={item.imageAlt ?? `${item.title} preview`}
											className="h-full w-full object-cover"
										>
											<svelte:fragment slot="fallback">
												<div
													class="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
												>
													Preview unavailable
												</div>
											</svelte:fragment>
										</SafeImage>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
										>
											Preview
										</div>
									{/if}
								</div>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<div class="flex items-center gap-3 text-sm text-ink-200">
									<input type="hidden" name="featured" value="0" />
									<input
										id={`featured-${item.id}`}
										name="featured"
										type="checkbox"
										value="1"
										class="h-4 w-4"
										checked={item.featured === 1}
									/>
									<label for={`featured-${item.id}`}>Featured</label>
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`work-sort-${item.id}`}
									>
										Sort order
									</label>
									<input
										id={`work-sort-${item.id}`}
										name="sort"
										type="number"
										value={item.sort}
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									/>
								</div>
							</div>
							<div class="flex flex-wrap gap-3">
								<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit"
									>Save work</button
								>
								<button class="nav-pill" type="button" on:click={closeEditModal}>Cancel</button>
							</div>
						</form>
					</AdminModal>

					<AdminModal
						open={deletingWorkId === item.id}
						title={`Delete work item: ${item.title}?`}
						description="This permanently removes the work item."
						on:close={closeDeleteModal}
						maxWidthClass="max-w-2xl"
					>
						<form class="space-y-4" method="POST" action="?/deleteWork">
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={item.id} />
							<p class="text-sm text-ink-200">Sort {item.sort}</p>
							<div class="flex flex-wrap gap-3">
								<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit"
									>Delete work item</button
								>
								<button class="nav-pill" type="button" on:click={closeDeleteModal}>Cancel</button>
							</div>
						</form>
					</AdminModal>
				{/each}
			{:else}
				<div class="card text-sm text-ink-200">No work items yet.</div>
			{/if}
		</div>
	</div>
</section>

<AdminModal
	open={isCreateModalOpen}
	title="Add work item"
	description="Create a new project entry without leaving your list."
	on:close={closeCreateModal}
	maxWidthClass="max-w-6xl"
>
	{#if isAction('createWork') && feedback?.message}
		<p class={`mb-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
			{feedback?.message}
		</p>
	{/if}
	<form class="space-y-4" method="POST" action="?/createWork" enctype="multipart/form-data">
		<input type="hidden" name="csrfToken" value={data.csrfToken} />
		<div>
			<label
				class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
				for="workTitleItem"
			>
				Title
			</label>
			<input
				id="workTitleItem"
				name="title"
				required
				maxlength="120"
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
				aria-invalid={Boolean(fieldError('createWork', 'title'))}
			/>
			{#if fieldError('createWork', 'title')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'title')}</p>
			{/if}
		</div>
		<div>
			<label
				class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
				for="workDescription"
			>
				Description
			</label>
			<textarea
				id="workDescription"
				name="description"
				required
				maxlength="500"
				rows="4"
				class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-6 text-white"
				aria-invalid={Boolean(fieldError('createWork', 'description'))}
			></textarea>
			{#if fieldError('createWork', 'description')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'description')}</p>
			{/if}
		</div>
		<div>
			<label
				class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
				for="workLongDescription"
			>
				Markdown description
			</label>
			<textarea
				id="workLongDescription"
				name="longDescription"
				maxlength="4000"
				rows="10"
				class="mt-2 min-h-[18rem] w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-7 text-white"
				aria-invalid={Boolean(fieldError('createWork', 'longDescription'))}
			></textarea>
			{#if fieldError('createWork', 'longDescription')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'longDescription')}</p>
			{/if}
		</div>
		<div>
			<label
				class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
				for="workHighlights"
			>
				Highlights (one per line)
			</label>
			<textarea
				id="workHighlights"
				name="highlights"
				maxlength="600"
				rows="3"
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
				aria-invalid={Boolean(fieldError('createWork', 'highlights'))}
			></textarea>
			{#if fieldError('createWork', 'highlights')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'highlights')}</p>
			{/if}
		</div>
		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="workRole">
					Role
				</label>
				<input
					id="workRole"
					name="role"
					maxlength="80"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'role'))}
				/>
				{#if fieldError('createWork', 'role')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'role')}</p>
				{/if}
			</div>
			<div>
				<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="workTech">
					Tech
				</label>
				<input
					id="workTech"
					name="tech"
					maxlength="80"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'tech'))}
				/>
				{#if fieldError('createWork', 'tech')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'tech')}</p>
				{/if}
			</div>
		</div>
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workLifecycle">Lifecycle</label
				>
				<select
					id="workLifecycle"
					name="lifecycle"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-ink-900 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'lifecycle'))}
				>
					<option value="">Not specified</option>
					{#each ['ACTIVE', 'MAINTAINED', 'EXPERIMENT', 'COMPLETE', 'RETIRED', 'ARCHIVED'] as state}
						<option value={state}>{state}</option>
					{/each}
				</select>
				{#if fieldError('createWork', 'lifecycle')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'lifecycle')}</p>
				{/if}
			</div>
			{#each [{ name: 'owner', label: 'Owner / provenance', max: 120 }, { name: 'domain', label: 'Domain', max: 120 }, { name: 'version', label: 'Version', max: 80 }] as metadata}
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for={`work-${metadata.name}`}
					>
						{metadata.label}
					</label>
					<input
						id={`work-${metadata.name}`}
						name={metadata.name}
						maxlength={metadata.max}
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						aria-invalid={Boolean(fieldError('createWork', metadata.name))}
					/>
					{#if fieldError('createWork', metadata.name)}
						<p class="mt-2 text-xs text-red-200">{fieldError('createWork', metadata.name)}</p>
					{/if}
				</div>
			{/each}
		</div>
		<div class="grid gap-4 md:grid-cols-2">
			{#each [{ name: 'subsystems', label: 'Subsystems (one per line)' }, { name: 'trace', label: 'Execution trace (ordered, one per line)' }] as architecture}
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for={`work-${architecture.name}`}
					>
						{architecture.label}
					</label>
					<textarea
						id={`work-${architecture.name}`}
						name={architecture.name}
						maxlength="1200"
						rows="5"
						class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-6 text-white"
						aria-invalid={Boolean(fieldError('createWork', architecture.name))}
					></textarea>
					{#if fieldError('createWork', architecture.name)}
						<p class="mt-2 text-xs text-red-200">{fieldError('createWork', architecture.name)}</p>
					{/if}
				</div>
			{/each}
		</div>
		<div>
			<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="workLink">
				Link
			</label>
			<input
				id="workLink"
				name="link"
				maxlength="2048"
				type="url"
				inputmode="url"
				class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
				aria-invalid={Boolean(fieldError('createWork', 'link'))}
			/>
			{#if fieldError('createWork', 'link')}
				<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'link')}</p>
			{/if}
		</div>
		<div class="grid gap-4 md:grid-cols-[0.55fr_0.45fr]">
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workImageUpload"
				>
					Image upload
				</label>
				<input
					id="workImageUpload"
					name="image"
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'image'))}
				/>
				{#if fieldError('createWork', 'image')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'image')}</p>
				{/if}
				<label
					class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workImageUrl"
				>
					External cover URL
				</label>
				<input
					id="workImageUrl"
					name="imageUrl"
					type="url"
					inputmode="url"
					maxlength="2048"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'imageUrl'))}
				/>
				<p class="mt-2 text-xs text-ink-200">
					Uploaded image renders first. External URL is used when no uploaded image is set.
				</p>
				{#if fieldError('createWork', 'imageUrl')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'imageUrl')}</p>
				{/if}
				<label
					class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="workImageAlt"
				>
					Image alt text
				</label>
				<input
					id="workImageAlt"
					name="imageAlt"
					maxlength="180"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					aria-invalid={Boolean(fieldError('createWork', 'imageAlt'))}
				/>
				{#if fieldError('createWork', 'imageAlt')}
					<p class="mt-2 text-xs text-red-200">{fieldError('createWork', 'imageAlt')}</p>
				{/if}
			</div>
			<div
				class="aspect-[4/3] overflow-hidden rounded-2xl border border-ink-200/30 bg-white/5 flex items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
			>
				Preview
			</div>
		</div>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="flex items-center gap-3 text-sm text-ink-200">
				<input type="hidden" name="featured" value="0" />
				<input id="workFeatured" name="featured" type="checkbox" value="1" class="h-4 w-4" />
				<label for="workFeatured">Featured</label>
			</div>
			<div>
				<label class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200" for="workSort">
					Sort order
				</label>
				<input
					id="workSort"
					name="sort"
					type="number"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
				/>
			</div>
		</div>
		<div class="flex flex-wrap gap-3">
			<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">Add work</button>
			<button class="nav-pill" type="button" on:click={closeCreateModal}>Cancel</button>
		</div>
	</form>
</AdminModal>
