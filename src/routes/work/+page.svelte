<script lang="ts">
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import SafeImage from '$lib/components/SafeImage.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { resolveWorkCoverImage } from '$lib/utils/content';
	import type { PageData } from './$types';

	export let data: PageData;

	let featuredWork = data.featuredWork ?? [];
	let otherWork = data.workItems.filter((item) => item.featured !== 1);

	$: featuredWork = data.featuredWork ?? [];
	$: otherWork = data.workItems.filter((item) => item.featured !== 1);

	const parseHighlights = (value: string | null) =>
		value
			? value
					.split('\n')
					.map((line) => line.trim())
					.filter(Boolean)
			: [];
</script>

<SeoHead title={formatTitle('Work')} description={data.siteSettings.workIntro} />

<section class="section-pad">
	<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
		<div class="space-y-4">
			<p class="badge">Work</p>
			<h1 class="text-4xl font-semibold text-white sm:text-5xl">{data.siteSettings.workTitle}</h1>
			<p class="max-w-2xl text-lg text-ink-200">{data.siteSettings.workIntro}</p>
		</div>
		<a class="nav-pill border-ink-100 bg-ink-900 text-white" href="/contact">Contact</a>
	</div>
</section>

{#if data.workItems.length}
	{#if featuredWork.length}
		<section class="section-pad">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="badge">Featured</p>
					<h2 class="text-3xl font-semibold text-white">Featured projects</h2>
					<p class="mt-2 text-sm text-ink-200">Expanded rundowns with outcomes and highlights.</p>
				</div>
				<a class="link-underline" href="#all-work">See all work</a>
			</div>
			<div class="mt-8 space-y-6">
				{#each featuredWork as project, index}
					{@const highlightItems = parseHighlights(project.highlights)}
					{@const coverImage = resolveWorkCoverImage(project)}
					<MotionReveal
						delay={0.08 * index}
						className="card grid gap-6 lg:grid-cols-[0.55fr_0.45fr]"
					>
						<div class="space-y-4">
							<div class="flex flex-wrap gap-2">
								<span class="badge">Featured</span>
								{#if project.role}
									<span class="badge">{project.role}</span>
								{/if}
								{#if project.tech}
									<span class="badge">{project.tech}</span>
								{/if}
							</div>
							<h3 class="text-2xl font-semibold text-white">{project.title}</h3>
							<MarkdownContent
								source={project.longDescription ?? project.description}
								className="markdown-compact"
							/>
							{#if highlightItems.length}
								<ul class="space-y-2 text-sm text-ink-100">
									{#each highlightItems as highlight}
										<li class="flex items-start gap-2">
											<span class="mt-2 h-1.5 w-1.5 rounded-full bg-aurora-200"></span>
											<span>{highlight}</span>
										</li>
									{/each}
								</ul>
							{/if}
							{#if project.link}
								<a
									class="link-underline"
									href={project.link}
									target="_blank"
									rel="noreferrer noopener"
									aria-label={`View project: ${project.title} (opens in a new tab)`}
								>
									View project
								</a>
							{/if}
						</div>
						<div
							class="media-frame aspect-[4/3] rounded-2xl border border-ink-200/20 bg-white/5 shadow-soft flex items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
						>
							{#if coverImage}
								<SafeImage
									src={coverImage}
									alt={project.imageAlt ?? `${project.title} preview`}
									width={1200}
									height={900}
									className="h-full w-full rounded-2xl object-cover"
								>
									<svelte:fragment slot="fallback">Repository</svelte:fragment>
								</SafeImage>
							{:else}
								Repository
							{/if}
						</div>
					</MotionReveal>
				{/each}
			</div>
		</section>
	{/if}
	<section class="section-pad">
		<h2 id="all-work" class="text-3xl font-semibold text-white">All projects</h2>
		{#if otherWork.length}
			<div class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				{#each otherWork as project, index}
					{@const coverImage = resolveWorkCoverImage(project)}
					<MotionReveal delay={0.07 * index} className="card">
						<div
							class="media-frame aspect-[4/3] rounded-2xl border border-ink-200/20 bg-white/5 shadow-soft flex items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
						>
							{#if coverImage}
								<SafeImage
									src={coverImage}
									alt={project.imageAlt ?? `${project.title} preview`}
									width={1200}
									height={900}
									className="h-full w-full rounded-2xl object-cover"
								>
									<svelte:fragment slot="fallback">Repository</svelte:fragment>
								</SafeImage>
							{:else}
								Repository
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#if project.featured}
								<span class="badge">Featured</span>
							{/if}
							{#if project.role}
								<span class="badge">{project.role}</span>
							{/if}
							{#if project.tech}
								<span class="badge">{project.tech}</span>
							{/if}
						</div>
						<h3 class="mt-3 text-2xl font-semibold text-white">{project.title}</h3>
						<MarkdownContent source={project.description} className="markdown-compact mt-2" />
						{#if project.link}
							<a
								class="link-underline mt-6"
								href={project.link}
								target="_blank"
								rel="noreferrer noopener"
								aria-label={`View project: ${project.title} (opens in a new tab)`}
							>
								View project
							</a>
						{/if}
					</MotionReveal>
				{/each}
			</div>
		{:else}
			<div class="mt-6 glass p-8 text-sm text-ink-200">More projects are on the way.</div>
		{/if}
	</section>
{:else}
	<section class="section-pad">
		<div class="glass p-8 text-sm text-ink-200">No work items yet. Check back soon.</div>
	</section>
{/if}
