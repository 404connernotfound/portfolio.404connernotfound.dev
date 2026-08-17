<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';

	type SettingsCopy = {
		error403Title?: string;
		error403Body?: string;
		error404Title?: string;
		error404Body?: string;
		error500Title?: string;
		error500Body?: string;
	};

	export let status: number;
	export let error: unknown;
	export let data: { siteSettings?: SettingsCopy } | undefined;

	const errorMessage = error instanceof Error ? error.message : '';

	const fallbackCopy = {
		403: {
			title: 'Access denied',
			body: 'You do not have permission to view this page.',
		},
		404: {
			title: 'Page not found',
			body: 'We could not find the page you were looking for.',
		},
		500: {
			title: 'Something went wrong',
			body: 'An unexpected error occurred. Please try again shortly.',
		},
	};

	const statusKey = status === 403 || status === 404 ? status : 500;
	const settings = data?.siteSettings;
	const title =
		statusKey === 403
			? settings?.error403Title || fallbackCopy[403].title
			: statusKey === 404
				? settings?.error404Title || fallbackCopy[404].title
				: settings?.error500Title || fallbackCopy[500].title;
	const body =
		statusKey === 403
			? settings?.error403Body || fallbackCopy[403].body
			: statusKey === 404
				? settings?.error404Body || fallbackCopy[404].body
				: settings?.error500Body || fallbackCopy[500].body;
</script>

<SeoHead title={formatTitle(String(statusKey))} description={body} />

<section class="section-pad">
	<div class="glass p-8 sm:p-10">
		<p class="badge">{statusKey}</p>
		<h1 class="mt-4 text-4xl font-semibold text-white sm:text-5xl">{title}</h1>
		<p class="mt-3 max-w-2xl text-lg text-ink-200">{body}</p>
		{#if errorMessage}
			<span class="sr-only">{errorMessage}</span>
		{/if}
		<div class="mt-6 flex flex-wrap gap-3">
			<a class="nav-pill" href="/">Back home</a>
			<a class="nav-pill cta-primary" href="/contact">Contact</a>
		</div>
	</div>
</section>
