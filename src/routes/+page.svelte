<script lang="ts">
	import { onMount } from 'svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	let heroRef: HTMLElement;
	const defaultOgImage = '';

	const parseHighlights = (value: string | null) =>
		value
			? value
					.split('\n')
					.map((line) => line.trim())
					.filter(Boolean)
			: [];

	const summarizeCaseStudy = (value: string | null) => {
		if (!value) return null;
		const cleaned = value
			.replace(/\r/g, '\n')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.join(' ');
		if (!cleaned) return null;
		return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
	};

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (media.matches) {
			return;
		}

		let active = true;
		let ctx: { revert: () => void } | null = null;

		import('gsap').then(({ gsap }) => {
			if (!active) return;
			ctx = gsap.context(() => {
				const heroTargets = heroRef?.querySelectorAll('[data-hero]');
				if (heroTargets?.length) {
					gsap.from(heroTargets, {
						opacity: 0,
						y: 24,
						duration: 0.9,
						ease: 'power3.out',
						stagger: 0.12,
					});
				}

				const statTargets = heroRef?.querySelectorAll('[data-stat]');
				if (statTargets?.length) {
					gsap.from(statTargets, {
						opacity: 0,
						y: 16,
						duration: 0.8,
						ease: 'power3.out',
						stagger: 0.1,
						delay: 0.2,
					});
				}

				const heroPanel = heroRef?.querySelector<HTMLElement>('[data-hero-card]');
				if (heroPanel) {
					gsap.from(heroPanel, {
						opacity: 0,
						y: 28,
						scale: 0.98,
						duration: 1,
						ease: 'power3.out',
						delay: 0.18,
					});
					gsap.to(heroPanel, {
						y: -10,
						duration: 3.3,
						repeat: -1,
						yoyo: true,
						ease: 'sine.inOut',
					});
				}
			}, heroRef);
		});

		return () => {
			active = false;
			ctx?.revert();
		};
	});
</script>

<SeoHead
	title={formatTitle('Home')}
	description={data.siteSettings.heroSubheadline || data.siteSettings.heroHeadline}
	image={data.featuredWork[0]?.imagePath ?? defaultOgImage}
	imageAlt={data.featuredWork[0]?.imageAlt ?? 'Featured project preview'}
/>

<section class="section-pad" bind:this={heroRef}>
	<div class="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
		<div class="space-y-6">
			<p class="badge" data-hero>Portfolio</p>
			<h1 class="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl" data-hero>
				{data.siteSettings.heroHeadline}
			</h1>
			<p class="max-w-xl text-lg text-ink-200" data-hero>{data.siteSettings.heroSubheadline}</p>
			<div class="flex flex-wrap gap-4" data-hero>
				<a class="nav-pill cta-primary border-ink-100 bg-ink-900 text-white" href="/work"
					>View systems work</a
				>
				<a class="nav-pill" href="/resume">Resume</a>
			</div>
			{#if data.stackItems.length}
				<div class="flex flex-wrap gap-2" data-hero>
					{#each data.stackItems.slice(0, 3) as item}
						<span class="badge badge-glow" data-stat>{item.label}</span>
					{/each}
				</div>
			{/if}
		</div>
		{#if data.siteSettings.heroHighlightsTitle || data.siteSettings.heroHighlightsBody || data.siteSettings.heroNoteTitle || data.siteSettings.heroNoteBody}
			<div class="glass space-y-6 p-8" data-hero-card>
				{#if data.siteSettings.heroHighlightsTitle || data.siteSettings.heroHighlightsBody}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">
							{data.siteSettings.heroHighlightsTitle}
						</p>
						<p class="text-base text-ink-200">{data.siteSettings.heroHighlightsBody}</p>
					</div>
				{/if}
				{#if data.siteSettings.heroNoteTitle || data.siteSettings.heroNoteBody}
					<div class="rounded-2xl bg-night-900 p-5 text-white">
						<p class="text-sm uppercase tracking-[0.2em] text-white/70">
							{data.siteSettings.heroNoteTitle}
						</p>
						<p class="mt-2 text-lg font-semibold">{data.siteSettings.heroNoteBody}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
		<MotionReveal className="space-y-4">
			<p class="badge">Focus</p>
			<h2 class="text-3xl font-semibold text-white">{data.siteSettings.focusHeadline}</h2>
			<p class="text-base text-ink-200">{data.siteSettings.focusBody}</p>
			<a class="link-underline" href="/about">More about me</a>
		</MotionReveal>
		{#if data.stackItems.length}
			<div class="grid gap-6 sm:grid-cols-2">
				{#each data.stackItems.slice(0, 4) as item, index}
					<MotionReveal delay={0.1 * index} className="card">
						<p class="text-sm uppercase tracking-[0.18em] text-ink-200">0{index + 1}</p>
						<h3 class="mt-3 text-xl font-semibold text-white">{item.label}</h3>
						{#if item.detail}
							<p class="mt-2 text-sm text-ink-200">{item.detail}</p>
						{/if}
					</MotionReveal>
				{/each}
			</div>
		{:else}
			<div class="card text-sm text-ink-200">Stack updates are in progress. Check back soon.</div>
		{/if}
	</div>
</section>

{#if data.featuredWork.length}
	<section class="section-pad">
		<div class="flex items-center justify-between">
			<h2 class="text-3xl font-semibold text-white">Featured work</h2>
			<a class="link-underline" href="/work">See all</a>
		</div>
		<div class="mt-8 grid gap-6 lg:grid-cols-3">
			{#each data.featuredWork as project, index}
				{@const highlights = parseHighlights(project.highlights)}
				{@const caseSummary = summarizeCaseStudy(project.longDescription)}
				<MotionReveal delay={0.08 * index} className="card flex h-full flex-col justify-between">
					<div class="space-y-3">
						<div
							class="media-frame aspect-[4/3] rounded-2xl border border-ink-200/20 bg-white/5 shadow-soft flex items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-200"
						>
							{#if project.imagePath}
								<img
									src={project.imagePath}
									alt={project.imageAlt ?? `${project.title} preview`}
									class="h-full w-full rounded-2xl object-cover"
									loading="lazy"
								/>
							{:else}
								Repository
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#if project.role}
								<span class="badge">{project.role}</span>
							{/if}
							{#if project.tech}
								<span class="badge">{project.tech}</span>
							{/if}
						</div>
						<h3 class="text-2xl font-semibold text-white">{project.title}</h3>
						<p class="text-sm text-ink-200">{project.description}</p>
						{#if highlights.length}
							<ul class="space-y-2 text-sm text-ink-100">
								{#each highlights.slice(0, 2) as highlight}
									<li class="flex items-start gap-2">
										<span class="mt-2 h-1.5 w-1.5 rounded-full bg-aurora-200"></span>
										<span>{highlight}</span>
									</li>
								{/each}
							</ul>
						{:else if caseSummary}
							<p class="text-sm text-ink-100">{caseSummary}</p>
						{/if}
					</div>
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
	</section>
{:else}
	<section class="section-pad">
		<div class="glass p-8 text-sm text-ink-200">Featured work is being curated.</div>
	</section>
{/if}
