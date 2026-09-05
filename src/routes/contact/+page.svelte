<script lang="ts">
	import MetadataGrid from '$lib/components/MetadataGrid.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { trackEvent } from '$lib/utils/tracking';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;

	const handleSubmit = () => trackEvent({ type: 'form_submit', name: 'contact' });
</script>

<SeoHead title={formatTitle('Contact')} description={data.siteSettings.contactBody} />

<section class="section-pad">
	<div class="inspection-shell">
		<div>
			<p class="system-label">Start a conversation</p>
			<h1 class="inspection-title">{data.siteSettings.contactTitle}</h1>
			<p class="inspection-summary">{data.siteSettings.contactBody}</p>
		</div>
		<aside class="inspection-side">
			<MetadataGrid
				items={[
					{ label: 'Channel', value: 'Email' },
					{ label: 'Best fit', value: 'Cross-layer software' },
					{ label: 'Address', value: data.siteSettings.contactEmail },
				]}
				label="Contact channel"
			/>
		</aside>
	</div>
</section>

<section class="section-pad pt-0">
	<div class="inspection-content">
		<div class="form-shell">
			<form class="space-y-5" method="POST" action="?/send" on:submit={handleSubmit}>
				<div>
					<label class="form-label" for="name">Name</label>
					<input
						id="name"
						name="name"
						class="form-field"
						type="text"
						autocomplete="name"
						required
					/>
				</div>
				<div>
					<label class="form-label" for="email">Email</label>
					<input
						id="email"
						name="email"
						class="form-field"
						type="email"
						autocomplete="email"
						required
					/>
				</div>
				<div>
					<label class="form-label" for="scope">What needs to ship or change?</label>
					<textarea id="scope" name="scope" class="form-field" autocomplete="off" required
					></textarea>
				</div>
				<div class="flex flex-wrap items-center gap-4">
					<button class="nav-pill cta-primary" type="submit">Send message</button>
					<div role="status" aria-live="polite">
						{#if form?.message}
							<p class="text-sm text-ink-200">{form.message}</p>
						{:else if form?.success}
							<p class="text-sm text-signal-300">Message received.</p>
						{/if}
					</div>
				</div>
			</form>
		</div>

		<aside class="inspection-section self-start">
			<p class="system-label">Strong fits</p>
			<h2 class="!text-2xl">Problems that cross a boundary.</h2>
			<p class="mb-5 text-sm leading-6 text-ink-400">
				A product that needs end-to-end ownership. An application that must work beyond its public
				APIs. A game modification or tool that has to respect real engine and platform constraints.
			</p>
			<a class="inspection-link" href={`mailto:${data.siteSettings.contactEmail}`}>
				Start by email <span aria-hidden="true">→</span>
			</a>
		</aside>
	</div>
</section>
