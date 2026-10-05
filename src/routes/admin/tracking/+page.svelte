<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead title={formatTitle('Admin | Tracking')} description="View tracking metrics and events." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Tracking</h1>
		<p class="max-w-2xl text-lg text-ink-200">Recent tracking activity and summaries.</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-6 md:grid-cols-3">
		<MotionReveal className="card space-y-2">
			<p class="text-xs uppercase tracking-[0.2em] text-ink-200">Total events</p>
			<p class="text-3xl font-semibold text-white">{data.counts.total}</p>
		</MotionReveal>
		<MotionReveal delay={0.06} className="card space-y-2">
			<p class="text-xs uppercase tracking-[0.2em] text-ink-200">Last 24 hours</p>
			<p class="text-3xl font-semibold text-white">{data.counts.lastDay}</p>
		</MotionReveal>
		<MotionReveal delay={0.12} className="card space-y-2">
			<p class="text-xs uppercase tracking-[0.2em] text-ink-200">Last 7 days</p>
			<p class="text-3xl font-semibold text-white">{data.counts.lastWeek}</p>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-6 lg:grid-cols-[0.5fr_0.5fr]">
		<MotionReveal className="glass p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">By type</p>
			<ul class="mt-4 space-y-2 text-sm text-ink-200">
				{#if data.counts.byType.length}
					{#each data.counts.byType as row}
						<li class="flex items-center justify-between">
							<span>{row.type}</span>
							<span class="text-white">{row.count}</span>
						</li>
					{/each}
				{:else}
					<li>No events yet.</li>
				{/if}
			</ul>
		</MotionReveal>
		<MotionReveal delay={0.08} className="glass p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Top paths</p>
			<ul class="mt-4 space-y-2 text-sm text-ink-200">
				{#if data.counts.topPaths.length}
					{#each data.counts.topPaths as row}
						<li class="flex items-center justify-between">
							<span>{row.path}</span>
							<span class="text-white">{row.count}</span>
						</li>
					{/each}
				{:else}
					<li>No paths yet.</li>
				{/if}
			</ul>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<MotionReveal className="glass p-6">
		<h2 class="text-2xl font-semibold text-white">Recent events</h2>
		<div class="mt-4 space-y-3">
			{#if data.events.length}
				{#each data.events as item}
					<div class="rounded-2xl border border-ink-200/30 bg-white/5 p-4 text-sm text-ink-200">
						<div class="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-ink-300">
							<span>{item.actorType === 'admin' && item.source === 'server' ? 'Admin audit' : item.source === 'legacy' ? 'Historical activity' : 'Visitor telemetry'} · {item.type}</span>
							<span>{item.createdAt}</span>
						</div>
						<p class="mt-2 text-white">{item.name ?? 'Unnamed event'}</p>
						{#if item.path}
							<p class="mt-1">Path: {item.path}</p>
						{/if}
						{#if item.referrer}
							<p class="mt-1">Referrer: {item.referrer}</p>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="text-sm text-ink-200">No tracking events yet.</p>
			{/if}
		</div>
	</MotionReveal>
</section>
