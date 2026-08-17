<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SeoHead title={formatTitle('Maintenance')} description={data.siteSettings.maintenanceBody} />

<section class="section-pad">
	<div class="glass p-8 sm:p-10">
		<p class="badge">Maintenance</p>
		<h1 class="mt-4 text-4xl font-semibold text-white sm:text-5xl">
			{data.siteSettings.maintenanceTitle}
		</h1>
		<p class="mt-3 max-w-2xl text-lg text-ink-200">{data.siteSettings.maintenanceBody}</p>
		<div class="mt-6 flex flex-wrap gap-3">
			<a class="nav-pill" href="/">Back home</a>
			<a class="nav-pill cta-primary" href="/contact">Contact</a>
		</div>
	</div>
</section>
