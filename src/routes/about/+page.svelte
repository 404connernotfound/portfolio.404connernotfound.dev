<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead
	title={formatTitle('About')}
	description="Why teams hire Conner Adams for difficult software work that crosses product, infrastructure, and runtime boundaries."
/>

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Why hire me / Conner Adams</p>
			<h1 class="inspection-title">A senior technical partner when the work crosses boundaries.</h1>
			<p class="inspection-summary">
				You do not need another person who can only move one ticket. You need someone who can find
				the real constraint, explain the tradeoffs, and carry the right solution through to working
				software.
			</p>
		</div>
		<aside class="inspection-side">
			<MetadataGrid
				items={data.stackItems.slice(0, 4).map((item) => ({
					label: item.category || 'Interest',
					value: item.label,
				}))}
				label="Coverage without handoffs"
			/>
		</aside>
	</div>
</section>

<section class="section-pad pt-0">
	<div class="evidence-grid">
		<div class="evidence-panel">
			<p class="system-label">Protect the investment</p>
			<h2>Resolve the expensive unknowns early.</h2>
			<p>
				I connect product intent to technical reality before architecture hardens around a bad
				assumption. That means clearer scope, faster diagnosis, and less budget lost to preventable
				rework.
			</p>
		</div>
		<div class="evidence-panel">
			<p class="system-label">Buy momentum, not activity</p>
			<h2 class="!text-3xl">One engineering context from decision to delivery.</h2>
			<p>
				The value of broad technical range is practical: fewer coordination loops, fewer partial
				answers, and one person accountable for making the pieces work together.
			</p>
		</div>
	</div>
</section>

{#if data.stackItems.length}
	<section class="section-pad pt-0" aria-labelledby="working-set-title">
		<div class="section-heading-row">
			<div>
				<p class="system-label">Coverage that saves handoffs</p>
				<h2 id="working-set-title">Bring the whole problem, not a pre-sliced ticket.</h2>
			</div>
			<p class="max-w-lg text-sm leading-6 text-ink-400">
				I will narrow the work to what matters, show you where specialist depth is genuinely needed,
				and keep the full system moving toward a useful result.
			</p>
		</div>
		<ol class="capability-list mt-10">
			{#each data.stackItems as item, index}
				<li class="capability-row">
					<span class="capability-index">{String(index + 1).padStart(2, '0')}</span>
					<h3>{item.label}</h3>
					<p>{item.detail || 'Maintained technical interest.'}</p>
				</li>
			{/each}
		</ol>
		<a class="inspection-link mt-10" href="/book"
			>See if the fit is right <span aria-hidden="true">→</span></a
		>
	</section>
{/if}
