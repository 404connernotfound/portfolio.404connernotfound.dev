<script lang="ts">
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import SafeImage from '$lib/components/SafeImage.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator.svelte';
	import TraceMode from '$lib/components/TraceMode.svelte';
	import { parseLineList, resolveWorkCoverImage } from '$lib/utils/content';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	$: subsystems = parseLineList(data.project.subsystems);
	$: highlights = parseLineList(data.project.highlights);
	$: traceSteps = parseLineList(data.project.trace);
	$: coverImage = resolveWorkCoverImage(data.project);
</script>

<SeoHead
	title={formatTitle(data.project.title)}
	description={data.project.description}
	image={coverImage || ''}
	imageAlt={data.project.imageAlt || `${data.project.title} project preview`}
/>

<section class="section-pad">
	<a class="source-link" href="/work">← Project index</a>
	<div class="inspection-shell mt-8">
		<div>
			<p class="system-label">Project / engineering inspection</p>
			<h1 class="inspection-title">{data.project.title}</h1>
			<p class="inspection-summary">{data.project.description}</p>
		</div>
		<aside class="inspection-side">
			<StatusIndicator state={data.project.lifecycle} />
			<div class="mt-6">
				<MetadataGrid
					items={[
						{ label: 'Domain', value: data.project.domain || data.project.role },
						{ label: 'Language / stack', value: data.project.tech },
						{ label: 'Version', value: data.project.version },
						{ label: 'Owner', value: data.project.owner },
					]}
					label={`${data.project.title} inspection metadata`}
				/>
			</div>
		</aside>
	</div>
</section>

{#if coverImage}
	<section class="section-pad pt-0">
		<div class="media-frame aspect-[16/8] border border-white/10 bg-white/[0.02]">
			<SafeImage
				src={coverImage}
				alt={data.project.imageAlt || `${data.project.title} preview`}
				width={1600}
				height={800}
				className="h-full w-full object-cover"
			/>
		</div>
	</section>
{/if}

{#if traceSteps.length}
	<section class="section-pad pt-0">
		<TraceMode steps={traceSteps} title={`${data.project.title} execution path`} />
	</section>
{/if}

<section class="section-pad pt-0">
	<div class="inspection-content">
		<div>
			<section class="inspection-section" aria-labelledby="system-overview">
				<p class="system-label">01 / What was built</p>
				<h2 id="system-overview">Overview</h2>
				<MarkdownContent
					source={data.project.longDescription || data.project.description}
					className="blog-markdown"
				/>
			</section>

			{#if highlights.length}
				<section class="inspection-section" aria-labelledby="engineering-notes">
					<p class="system-label">02 / Maintained project notes</p>
					<h2 id="engineering-notes">Engineering evidence</h2>
					<ul class="inspection-subsystems">
						{#each highlights as highlight, index}
							<li>
								<span>{String(index + 1).padStart(2, '0')}</span>
								<span>{highlight}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>

		<aside>
			{#if subsystems.length}
				<section class="inspection-section" aria-labelledby="subsystem-heading">
					<p class="system-label">Architecture index</p>
					<h2 id="subsystem-heading" class="!text-2xl">Subsystems</h2>
					<ul class="inspection-subsystems">
						{#each subsystems as subsystem, index}
							<li>
								<span>{String(index + 1).padStart(2, '0')}</span>
								<span>{subsystem}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="inspection-section" aria-labelledby="source-heading">
				<p class="system-label">Source of truth</p>
				<h2 id="source-heading" class="!text-2xl">Repository</h2>
				{#if data.project.link}
					<a
						class="inspection-link"
						href={data.project.link}
						target="_blank"
						rel="noreferrer noopener"
					>
						Open source <span aria-hidden="true">↗</span>
					</a>
				{:else}
					<p class="text-sm leading-6 text-ink-400">
						No public source link is maintained for this project.
					</p>
				{/if}
			</section>
		</aside>
	</div>
</section>
