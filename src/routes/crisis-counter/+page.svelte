<script lang="ts">
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	$: count = data.crisisItems.length;
	$: categories = Array.from(
		new Set(data.crisisItems.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value)))
	);
</script>

<SeoHead
	title={formatTitle('Crisis Counter')}
	description="A running count of Conner's known early and midlife crises."
/>

<section class="section-pad">
	<MotionReveal className="space-y-5 text-center">
		<p class="badge mx-auto">Meme</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">The Crisis Counter</h1>
		<p class="mx-auto max-w-2xl text-lg text-ink-200">
			A live, lovingly-maintained tally of my known early and midlife crises. Updated whenever I make a
			questionable decision.
		</p>
		<div class="glass mx-auto inline-block px-12 py-10">
			<p class="text-7xl font-bold text-white sm:text-8xl">{count}</p>
			<p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">
				crises and counting
			</p>
		</div>
		{#if categories.length}
			<div class="flex flex-wrap justify-center gap-2">
				{#each categories as category}
					<span class="badge">{category}</span>
				{/each}
			</div>
		{/if}
	</MotionReveal>
</section>

<section class="section-pad">
	{#if data.crisisItems.length}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.crisisItems as item, index}
				<MotionReveal delay={0.04 * index} className="card space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-xl font-semibold text-white">{item.title}</h2>
						{#if item.category}
							<span class="badge">{item.category}</span>
						{/if}
					</div>
					{#if item.description}
						<p class="text-sm text-ink-200">{item.description}</p>
					{/if}
				</MotionReveal>
			{/each}
		</div>
	{:else}
		<div class="glass p-10 text-center text-sm text-ink-200">
			No crises logged yet. Surprisingly well-adjusted, or just under-documented.
		</div>
	{/if}
</section>
