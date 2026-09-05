<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const formatSize = (value: number) => {
		if (!Number.isFinite(value)) return '0 B';
		if (value < 1024) return `${value} B`;
		if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
		return `${(value / (1024 * 1024)).toFixed(1)} MB`;
	};

	const formatUpdated = (value: string) => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('en', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(date);
	};
</script>

<SeoHead
	title={formatTitle('Resume')}
	description="Review Conner Adams's experience across full-stack delivery, low-level systems, application modification, and game tooling."
/>

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Experience / résumé</p>
			<h1 class="inspection-title">Experience behind the range.</h1>
			<p class="inspection-summary">
				A closer look at the work behind my product-to-runtime engineering practice, available
				inline or as a direct download.
			</p>
		</div>
		<aside class="inspection-side">
			{#if data.resume}
				<MetadataGrid
					items={[
						{ label: 'State', value: 'Current file' },
						{ label: 'Format', value: 'PDF' },
						{ label: 'Updated', value: formatUpdated(data.resume.updatedAt) },
						{ label: 'Size', value: formatSize(data.resume.size) },
					]}
					label="Resume document metadata"
				/>
			{/if}
		</aside>
	</div>
</section>

{#if data.resume}
	<section class="section-pad pt-0">
		<div class="document-inspector">
			<header class="document-inspector-header">
				<div>
					<p class="system-label">Inline preview</p>
					<h2 class="mt-3 text-2xl font-semibold text-white">resume.pdf</h2>
				</div>
				<div class="flex flex-wrap gap-3">
					<a class="nav-pill" href={data.resume.path} target="_blank" rel="noreferrer noopener">
						Open in new tab
					</a>
					<a class="nav-pill cta-primary" href={data.resume.path} download>Download PDF</a>
				</div>
			</header>
			<div class="document-frame">
				<iframe src={`${data.resume.path}#zoom=94`} title="Resume PDF preview" loading="lazy"
				></iframe>
			</div>
		</div>
	</section>
{:else}
	<section class="section-pad pt-0">
		<div class="glass p-8 text-sm text-ink-200">The resume document is not available yet.</div>
	</section>
{/if}
