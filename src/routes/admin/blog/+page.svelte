<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { BlogReference } from '$lib/utils/content';
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

	const livePosts = data.posts.filter((post) => post.draft === 0);
	const draftPosts = data.posts.filter((post) => post.draft === 1);
	const featuredPosts = data.posts.filter((post) => post.featured === 1);
	const emptyReferenceRows = Array.from({ length: 3 }, () => ({
		label: '',
		url: '',
		note: null
	}));
	const referenceRows = (references: BlogReference[] = []) => [
		...references,
		...emptyReferenceRows
	];
</script>

<SeoHead title={formatTitle('Admin | Blog')} description="Manage blog posts and intro copy." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Blog writing desk</h1>
		<p class="max-w-2xl text-lg text-ink-200">
			Draft first, publish deliberately, and review the public blog without leaving the admin flow.
		</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-4 md:grid-cols-3">
		<MotionReveal className="glass p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Published</p>
			<p class="mt-3 text-4xl font-semibold text-white">{livePosts.length}</p>
			<a class="link-underline mt-5" href="/blog" target="_blank" rel="noreferrer noopener">
				View blog
			</a>
		</MotionReveal>
		<MotionReveal delay={0.04} className="glass p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Drafts</p>
			<p class="mt-3 text-4xl font-semibold text-white">{draftPosts.length}</p>
			<p class="mt-2 text-sm text-ink-200">Hidden from the public site.</p>
		</MotionReveal>
		<MotionReveal delay={0.08} className="glass p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Featured</p>
			<p class="mt-3 text-4xl font-semibold text-white">{featuredPosts.length}</p>
			<p class="mt-2 text-sm text-ink-200">Marked for future highlighting.</p>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
		<MotionReveal className="glass p-8">
			<h2 class="text-2xl font-semibold text-white">Blog section</h2>
			{#if isAction('updateBlogSection') && feedback?.message}
				<p class={`mt-3 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
					{feedback?.message}
				</p>
			{/if}
			<form class="mt-6 grid gap-4" method="POST" action="?/updateBlogSection">
				<input type="hidden" name="csrfToken" value={data.csrfToken} />
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="blogTitle"
					>
						Title
					</label>
					<input
						id="blogTitle"
						name="blogTitle"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						value={data.siteSettings.blogTitle}
					/>
				</div>
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="blogIntro"
					>
						Intro
					</label>
					<textarea
						id="blogIntro"
						name="blogIntro"
						rows="4"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						>{data.siteSettings.blogIntro}</textarea
					>
				</div>
				<div class="flex justify-end">
					<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">
						Save section
					</button>
				</div>
			</form>
		</MotionReveal>

		<MotionReveal delay={0.05} className="glass p-8">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="badge">New post</p>
					<h2 class="mt-4 text-2xl font-semibold text-white">Write from a draft</h2>
				</div>
				<p class="max-w-sm text-sm text-ink-200">
					The left button saves privately. The publish button makes the post live and fills today's
					date if the date is blank.
				</p>
			</div>
			{#if isAction('createPost') && feedback?.message}
				<p class={`mt-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
					{feedback?.message}
				</p>
			{/if}
			<form class="mt-6 grid gap-4" method="POST" action="?/createPost">
				<input type="hidden" name="csrfToken" value={data.csrfToken} />
				<div class="grid gap-4 lg:grid-cols-2">
					<div>
						<label
							class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
							for="postTitle"
						>
							Title
						</label>
						<input
							id="postTitle"
							name="title"
							required
							maxlength="120"
							class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
							aria-invalid={Boolean(fieldError('createPost', 'title'))}
						/>
						{#if fieldError('createPost', 'title')}
							<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'title')}</p>
						{/if}
					</div>
					<div>
						<label
							class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
							for="postSlug"
						>
							Slug
						</label>
						<input
							id="postSlug"
							name="slug"
							maxlength="120"
							placeholder="auto-generated from title"
							class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
							aria-invalid={Boolean(fieldError('createPost', 'slug'))}
						/>
						{#if fieldError('createPost', 'slug')}
							<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'slug')}</p>
						{/if}
					</div>
				</div>
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="postExcerpt"
					>
						Excerpt
					</label>
					<textarea
						id="postExcerpt"
						name="excerpt"
						maxlength="300"
						rows="3"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						aria-invalid={Boolean(fieldError('createPost', 'excerpt'))}
					></textarea>
					{#if fieldError('createPost', 'excerpt')}
						<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'excerpt')}</p>
					{/if}
				</div>
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="postContent"
					>
						Markdown body
					</label>
					<textarea
						id="postContent"
						name="content"
						maxlength="20000"
						rows="24"
						class="mt-2 min-h-[32rem] w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-7 text-white"
						aria-invalid={Boolean(fieldError('createPost', 'content'))}
					></textarea>
					{#if fieldError('createPost', 'content')}
						<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'content')}</p>
					{/if}
				</div>
				<fieldset class="rounded-2xl border border-ink-200/30 bg-white/5 p-4">
					<legend class="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">
						References
					</legend>
					<p class="mt-1 text-sm text-ink-200">
						Ordered source links shown at the end of the public post.
					</p>
					{#if fieldError('createPost', 'references')}
						<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'references')}</p>
					{/if}
					<div class="mt-4 grid gap-3">
						{#each referenceRows() as reference, referenceIndex}
							<div
								class="grid gap-3 rounded-2xl border border-ink-200/20 bg-ink-900/30 p-3 lg:grid-cols-[0.28fr_0.34fr_0.38fr]"
							>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-reference-label-${referenceIndex}`}
									>
										Label
									</label>
									<input
										id={`post-reference-label-${referenceIndex}`}
										name="referenceLabel"
										value={reference.label}
										maxlength="160"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									/>
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-reference-url-${referenceIndex}`}
									>
										URL
									</label>
									<input
										id={`post-reference-url-${referenceIndex}`}
										name="referenceUrl"
										type="url"
										inputmode="url"
										value={reference.url}
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									/>
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-reference-note-${referenceIndex}`}
									>
										Note
									</label>
									<textarea
										id={`post-reference-note-${referenceIndex}`}
										name="referenceNote"
										maxlength="500"
										rows="2"
										class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										>{reference.note ?? ''}</textarea
									>
								</div>
							</div>
						{/each}
					</div>
				</fieldset>
				<div class="grid gap-4 lg:grid-cols-[1fr_12rem]">
					<div>
						<label
							class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
							for="postTags"
						>
							Tags
						</label>
						<input
							id="postTags"
							name="tags"
							maxlength="200"
							class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
							aria-invalid={Boolean(fieldError('createPost', 'tags'))}
						/>
						{#if fieldError('createPost', 'tags')}
							<p class="mt-2 text-xs text-red-200">{fieldError('createPost', 'tags')}</p>
						{/if}
					</div>
					<div>
						<label
							class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
							for="postPublished"
						>
							Publish date
						</label>
						<input
							id="postPublished"
							name="publishedAt"
							type="date"
							class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						/>
					</div>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<label class="flex items-center gap-3 text-sm text-ink-200" for="postFeatured">
						<input type="hidden" name="featured" value="0" />
						<input id="postFeatured" name="featured" type="checkbox" value="1" class="h-4 w-4" />
						Featured
					</label>
					<div class="flex flex-wrap gap-3">
						<button class="nav-pill" type="submit" name="publishState" value="draft"
							>Save draft</button
						>
						<button
							class="nav-pill border-ink-100 bg-ink-900 text-white"
							type="submit"
							name="publishState"
							value="publish"
						>
							Publish post
						</button>
					</div>
				</div>
			</form>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="badge">Posts</p>
			<h2 class="mt-4 text-3xl font-semibold text-white">
				Blog posts <span class="text-base font-normal text-ink-200">({data.posts.length})</span>
			</h2>
		</div>
		<a class="nav-pill" href="/blog" target="_blank" rel="noreferrer noopener">Open public blog</a>
	</div>

	{#if data.posts.length}
		<div class="space-y-5">
			{#each data.posts as post, index}
				<MotionReveal delay={0.04 * index} className="card space-y-5">
					{#if isAction('updatePost') && feedback?.success && feedback?.itemId === post.id && feedback?.message}
						<p class="text-sm text-aurora-200">{feedback?.message}</p>
					{/if}
					{#if isAction('deletePost') && feedback?.itemId === post.id && feedback?.message}
						<p class={`text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
							{feedback?.message}
						</p>
					{/if}
					<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div class="space-y-3">
							<div class="flex flex-wrap items-center gap-2">
								<span class="badge">{post.draft === 1 ? 'Draft' : 'Live'}</span>
								{#if post.featured === 1}
									<span class="badge">Featured</span>
								{/if}
								{#if post.publishedAt}
									<span class="text-xs uppercase tracking-[0.2em] text-ink-300"
										>{post.publishedAt}</span
									>
								{/if}
							</div>
							<h3 class="text-2xl font-semibold text-white">{post.title}</h3>
							{#if post.excerpt}
								<p class="max-w-3xl text-sm text-ink-200">{post.excerpt}</p>
							{/if}
							<p class="text-xs uppercase tracking-[0.2em] text-ink-300">/{post.slug}</p>
						</div>
						{#if post.draft !== 1}
							<a
								class="nav-pill"
								href={`/blog/${post.slug}`}
								target="_blank"
								rel="noreferrer noopener">Open</a
							>
						{/if}
					</div>

					<details
						class="rounded-2xl border border-ink-200/30 bg-white/5 p-4"
						open={isAction('updatePost') &&
							feedback?.itemId === post.id &&
							feedback?.success !== true}
					>
						<summary
							class="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-ink-100"
						>
							Edit writing
						</summary>
						{#if isAction('updatePost') && feedback?.itemId === post.id && feedback?.message}
							<p class={`mt-4 text-sm ${feedback?.success ? 'text-aurora-200' : 'text-ink-200'}`}>
								{feedback?.message}
							</p>
						{/if}
						<form class="mt-5 grid gap-4" method="POST" action="?/updatePost">
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={post.id} />
							<div class="grid gap-4 lg:grid-cols-2">
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-title-${post.id}`}
									>
										Title
									</label>
									<input
										id={`post-title-${post.id}`}
										name="title"
										value={post.title}
										required
										maxlength="120"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updatePost', 'title', post.id))}
									/>
									{#if fieldError('updatePost', 'title', post.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updatePost', 'title', post.id)}
										</p>
									{/if}
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-slug-${post.id}`}
									>
										Slug
									</label>
									<input
										id={`post-slug-${post.id}`}
										name="slug"
										value={post.slug}
										maxlength="120"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updatePost', 'slug', post.id))}
									/>
									{#if fieldError('updatePost', 'slug', post.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updatePost', 'slug', post.id)}
										</p>
									{/if}
								</div>
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`post-excerpt-${post.id}`}
								>
									Excerpt
								</label>
								<textarea
									id={`post-excerpt-${post.id}`}
									name="excerpt"
									maxlength="300"
									rows="3"
									class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									aria-invalid={Boolean(fieldError('updatePost', 'excerpt', post.id))}
									>{post.excerpt ?? ''}</textarea
								>
								{#if fieldError('updatePost', 'excerpt', post.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updatePost', 'excerpt', post.id)}
									</p>
								{/if}
							</div>
							<div>
								<label
									class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
									for={`post-content-${post.id}`}
								>
									Markdown body
								</label>
								<textarea
									id={`post-content-${post.id}`}
									name="content"
									maxlength="20000"
									rows="20"
									class="mt-2 min-h-[28rem] w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 font-mono text-sm leading-7 text-white"
									aria-invalid={Boolean(fieldError('updatePost', 'content', post.id))}
									>{post.content ?? ''}</textarea
								>
								{#if fieldError('updatePost', 'content', post.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updatePost', 'content', post.id)}
									</p>
								{/if}
							</div>
							<fieldset class="rounded-2xl border border-ink-200/30 bg-white/5 p-4">
								<legend class="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">
									References
								</legend>
								<p class="mt-1 text-sm text-ink-200">
									Ordered source links shown at the end of the public post.
								</p>
								{#if fieldError('updatePost', 'references', post.id)}
									<p class="mt-2 text-xs text-red-200">
										{fieldError('updatePost', 'references', post.id)}
									</p>
								{/if}
								<div class="mt-4 grid gap-3">
									{#each referenceRows(post.references) as reference, referenceIndex}
										<div
											class="grid gap-3 rounded-2xl border border-ink-200/20 bg-ink-900/30 p-3 lg:grid-cols-[0.28fr_0.34fr_0.38fr]"
										>
											<div>
												<label
													class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
													for={`post-reference-label-${post.id}-${referenceIndex}`}
												>
													Label
												</label>
												<input
													id={`post-reference-label-${post.id}-${referenceIndex}`}
													name="referenceLabel"
													value={reference.label}
													maxlength="160"
													class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
												/>
											</div>
											<div>
												<label
													class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
													for={`post-reference-url-${post.id}-${referenceIndex}`}
												>
													URL
												</label>
												<input
													id={`post-reference-url-${post.id}-${referenceIndex}`}
													name="referenceUrl"
													type="url"
													inputmode="url"
													value={reference.url}
													class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
												/>
											</div>
											<div>
												<label
													class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
													for={`post-reference-note-${post.id}-${referenceIndex}`}
												>
													Note
												</label>
												<textarea
													id={`post-reference-note-${post.id}-${referenceIndex}`}
													name="referenceNote"
													maxlength="500"
													rows="2"
													class="mt-2 w-full resize-y rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
													>{reference.note ?? ''}</textarea
												>
											</div>
										</div>
									{/each}
								</div>
							</fieldset>
							<div class="grid gap-4 lg:grid-cols-[1fr_12rem]">
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-tags-${post.id}`}
									>
										Tags
									</label>
									<input
										id={`post-tags-${post.id}`}
										name="tags"
										value={post.tags ?? ''}
										maxlength="200"
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
										aria-invalid={Boolean(fieldError('updatePost', 'tags', post.id))}
									/>
									{#if fieldError('updatePost', 'tags', post.id)}
										<p class="mt-2 text-xs text-red-200">
											{fieldError('updatePost', 'tags', post.id)}
										</p>
									{/if}
								</div>
								<div>
									<label
										class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
										for={`post-published-${post.id}`}
									>
										Publish date
									</label>
									<input
										id={`post-published-${post.id}`}
										name="publishedAt"
										type="date"
										value={post.publishedAt ?? ''}
										class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
									/>
								</div>
							</div>
							<div class="flex flex-wrap items-center justify-between gap-4">
								<label
									class="flex items-center gap-3 text-sm text-ink-200"
									for={`post-featured-${post.id}`}
								>
									<input type="hidden" name="featured" value="0" />
									<input
										id={`post-featured-${post.id}`}
										name="featured"
										type="checkbox"
										value="1"
										class="h-4 w-4"
										checked={post.featured === 1}
									/>
									Featured
								</label>
								<div class="flex flex-wrap gap-3">
									<button class="nav-pill" type="submit" name="publishState" value="draft">
										{post.draft === 1 ? 'Save draft' : 'Move to draft'}
									</button>
									<button
										class="nav-pill border-ink-100 bg-ink-900 text-white"
										type="submit"
										name="publishState"
										value="publish"
									>
										{post.draft === 1 ? 'Publish post' : 'Update published'}
									</button>
								</div>
							</div>
						</form>
					</details>

					<details class="rounded-2xl border border-red-200/20 bg-red-950/10 p-4">
						<summary
							class="cursor-pointer text-sm font-semibold uppercase tracking-[0.2em] text-red-100"
						>
							Delete post
						</summary>
						<form class="mt-5 space-y-4" method="POST" action="?/deletePost">
							<input type="hidden" name="csrfToken" value={data.csrfToken} />
							<input type="hidden" name="id" value={post.id} />
							<p class="text-sm text-ink-200">This permanently removes /{post.slug}.</p>
							<button class="nav-pill border-red-100 bg-red-950 text-red-50" type="submit">
								Delete post
							</button>
						</form>
					</details>
				</MotionReveal>
			{/each}
		</div>
	{:else}
		<div class="glass p-8 text-sm text-ink-200">No posts yet. Start with a draft above.</div>
	{/if}
</section>
