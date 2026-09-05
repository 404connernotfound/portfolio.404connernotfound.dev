<script lang="ts">
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import { trackEvent } from '$lib/utils/tracking';
	import type { ActionData } from './$types';

	export let form: ActionData | undefined;

	const handleSubmit = () => trackEvent({ type: 'form_submit', name: 'subscribe' });

	const perks = [
		{
			title: 'Build notes',
			body: 'Short debriefs on what shipped, what failed, and which decisions held up.',
		},
		{
			title: 'Runtime investigations',
			body: 'Practical looks at low-level behavior, instrumentation, and difficult failure modes.',
		},
		{
			title: 'Modification field notes',
			body: 'What application hooks, game mods, and their supporting tools teach in practice.',
		},
	];

	const topics = [
		'Full-stack delivery',
		'Rust and systems',
		'Runtime debugging',
		'Application hooking',
		'Game modifications',
		'Engineering tradeoffs',
	];

	const faqs = [
		{
			question: 'How often will you email?',
			answer: 'About twice a month, with occasional extra notes when a launch ships.',
		},
		{
			question: 'Is there a paid tier?',
			answer: 'No. The list is free and I will never sell your data.',
		},
		{
			question: 'Can I unsubscribe anytime?',
			answer: 'Yes. Every email includes a one-click unsubscribe link.',
		},
	];
</script>

<SeoHead
	title={formatTitle('Subscribe')}
	description="Subscribe for engineering notes spanning full-stack delivery, low-level systems, application hooking, and game modification."
/>

<section class="section-pad">
	<div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
		<MotionReveal className="space-y-5">
			<p class="badge">Subscribe</p>
			<h1 class="text-4xl font-semibold text-white sm:text-5xl">Notes from every layer</h1>
			<p class="text-lg text-ink-200">
				Get concise field notes from the product surface down to the runtime.
			</p>
			<ul class="space-y-2 text-sm text-ink-200">
				<li>What shipped, what broke, and why.</li>
				<li>Practical lessons from systems and modification work.</li>
				<li>Early looks at new tools, experiments, and projects.</li>
			</ul>
		</MotionReveal>
		<MotionReveal delay={0.08} className="form-shell">
			<form class="space-y-4" method="POST" on:submit={handleSubmit}>
				<div>
					<label class="form-label" for="name"> Name (optional) </label>
					<input id="name" name="name" class="form-field" type="text" autocomplete="name" />
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
					<label class="form-label" for="interest"> Main interest </label>
					<select id="interest" name="interest" class="form-field">
						<option value="">Select one</option>
						<option value="full-stack">Full-stack development</option>
						<option value="systems">Low-level systems</option>
						<option value="hooking">Application hooking</option>
						<option value="game-mods">Game modifications</option>
					</select>
				</div>
				<div class="space-y-2" role="status" aria-live="polite">
					{#if form?.message}
						<p class="text-sm text-ink-200">{form.message}</p>
					{:else if form?.success}
						<p class="text-sm text-aurora-200">Thanks for subscribing. See you in the inbox.</p>
					{/if}
					<button class="nav-pill cta-primary" type="submit"> Join the list </button>
				</div>
			</form>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<MotionReveal className="space-y-4">
		<h2 class="text-3xl font-semibold text-white">What you get</h2>
		<p class="text-sm text-ink-200">
			A focused engineering newsletter for builders and technically ambitious teams.
		</p>
	</MotionReveal>
	<div class="mt-8 grid gap-6 md:grid-cols-3">
		{#each perks as perk, index}
			<MotionReveal delay={0.08 * index} className="card space-y-3">
				<h3 class="text-xl font-semibold text-white">{perk.title}</h3>
				<p class="text-sm text-ink-200">{perk.body}</p>
			</MotionReveal>
		{/each}
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
		<MotionReveal className="space-y-4">
			<h2 class="text-3xl font-semibold text-white">Topics in rotation</h2>
			<p class="text-sm text-ink-200">
				The decisions between product behavior, system behavior, and everything underneath.
			</p>
			<ul class="grid gap-3 text-sm text-ink-200 sm:grid-cols-2">
				{#each topics as topic}
					<li class="rounded-2xl border border-ink-200/30 bg-white/5 px-4 py-3">{topic}</li>
				{/each}
			</ul>
		</MotionReveal>
		<MotionReveal delay={0.08} className="glass space-y-4 p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Privacy note</p>
			<p class="text-sm text-ink-200">
				Your email is only used for this newsletter. No spam, no selling, no surprises.
			</p>
			<a class="link-underline" href="/privacy-policy">Read the privacy policy</a>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<MotionReveal className="space-y-4">
		<h2 class="text-3xl font-semibold text-white">FAQ</h2>
		<p class="text-sm text-ink-200">A few quick answers before you join.</p>
	</MotionReveal>
	<div class="mt-8 grid gap-6 md:grid-cols-3">
		{#each faqs as faq, index}
			<MotionReveal delay={0.08 * index} className="card space-y-3">
				<p class="text-xs uppercase tracking-[0.2em] text-ink-200">{faq.question}</p>
				<p class="text-sm text-ink-200">{faq.answer}</p>
			</MotionReveal>
		{/each}
	</div>
</section>
