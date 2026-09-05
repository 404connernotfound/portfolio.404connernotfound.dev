<script lang="ts">
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { trackEvent } from '$lib/utils/tracking';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;

	const handleSubmit = () => trackEvent({ type: 'form_submit', name: 'collaborate' });
</script>

<SeoHead
	title={formatTitle('Collaborate')}
	description="Bring a product, application modification, or game tooling problem that crosses technical layers."
/>

<section class="section-pad">
	<div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
		<div class="space-y-5">
			<p class="badge">Collaborate</p>
			<h1 class="text-4xl font-semibold text-white sm:text-5xl">
				Bring me the problem that crosses layers.
			</h1>
			<p class="text-lg text-ink-200">
				Tell me what needs to ship, what existing software needs to change, and which constraints
				cannot move. I will turn that into a concrete technical path.
			</p>
			<div class="info-grid">
				<div class="info-item">
					<p class="info-label">Email</p>
					<p class="info-value">
						{data.siteSettings.contactEmail}
					</p>
				</div>
				<div class="info-item">
					<p class="info-label">Best fit</p>
					<p class="info-value">Product-to-runtime work</p>
				</div>
			</div>
		</div>
		<MotionReveal className="form-shell">
			<form class="space-y-4" method="POST" action="?/send" on:submit={handleSubmit}>
				<div>
					<label class="form-label" for="name"> Name </label>
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
					<label class="form-label" for="email"> Email </label>
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
					<label class="form-label" for="scope"> What needs to ship or change? </label>
					<textarea id="scope" name="scope" class="form-field" autocomplete="off" required
					></textarea>
				</div>
				<div class="space-y-2">
					{#if form?.message}
						<p class="text-sm text-ink-200">{form.message}</p>
					{:else if form?.success}
						<p class="text-sm text-aurora-200">Thanks — I’ll be in touch soon.</p>
					{/if}
					<button class="nav-pill cta-primary" type="submit"> Send request </button>
				</div>
			</form>
		</MotionReveal>
	</div>
</section>
