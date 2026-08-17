<script lang="ts">
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';

	const lastUpdated = 'February 6, 2026';
</script>

<SeoHead
	title={formatTitle('Privacy Policy')}
	description="How information is collected, used, and protected across this site."
/>

<section class="section-pad">
	<div class="grid gap-10 lg:grid-cols-[0.7fr_0.3fr]">
		<MotionReveal className="space-y-5">
			<p class="badge">Legal</p>
			<h1 class="text-4xl font-semibold text-white sm:text-5xl">Privacy Policy</h1>
			<p class="text-lg text-ink-200">
				This policy explains how information is collected, used, and protected when you visit this
				site, subscribe to updates, or get in touch.
			</p>
			<p class="text-xs uppercase tracking-[0.2em] text-ink-300">Last updated: {lastUpdated}</p>
		</MotionReveal>
		<MotionReveal delay={0.08} className="glass space-y-4 p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">At a glance</p>
			<ul class="space-y-2 text-sm text-ink-200">
				<li>Only collect what is needed to run the site and respond to you.</li>
				<li>No selling or renting of personal data.</li>
				<li>Requests to access or delete data are honored.</li>
			</ul>
			<a class="link-underline" href="/contact">Contact for questions</a>
		</MotionReveal>
	</div>
</section>

<section class="section-pad">
	<div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
		<div class="space-y-8">
			<MotionReveal className="space-y-3">
				<h2 class="text-2xl font-semibold text-white">Information collected</h2>
				<p class="text-sm text-ink-200">
					Information may be collected when you contact me, subscribe, or browse the site. The types
					of data include:
				</p>
				<ul class="space-y-2 text-sm text-ink-200">
					<li>Contact details you provide, such as name, email, and message content.</li>
					<li>Subscription details, like email address and optional name.</li>
					<li>Basic usage data such as pages viewed, browser type, and device details.</li>
				</ul>
			</MotionReveal>
			<MotionReveal delay={0.06} className="space-y-3">
				<h2 class="text-2xl font-semibold text-white">How information is used</h2>
				<p class="text-sm text-ink-200">Data is used to:</p>
				<ul class="space-y-2 text-sm text-ink-200">
					<li>Respond to inquiries and project requests.</li>
					<li>Send updates you opt into.</li>
					<li>Improve site performance and content quality.</li>
					<li>Protect against abuse, spam, and security issues.</li>
				</ul>
			</MotionReveal>
			<MotionReveal delay={0.12} className="space-y-3">
				<h2 class="text-2xl font-semibold text-white">Sharing and third parties</h2>
				<p class="text-sm text-ink-200">
					Data is not sold. Limited data may be shared with service providers that keep the site
					running, such as hosting, analytics, or email delivery tools. These partners only process
					data to perform their services.
				</p>
			</MotionReveal>
			<MotionReveal delay={0.18} className="space-y-3">
				<h2 class="text-2xl font-semibold text-white">Retention</h2>
				<p class="text-sm text-ink-200">
					Information is kept only as long as needed to respond to your request, deliver
					subscriptions, or maintain site security. You can ask for deletion at any time.
				</p>
			</MotionReveal>
			<MotionReveal delay={0.24} className="space-y-3">
				<h2 class="text-2xl font-semibold text-white">Your choices</h2>
				<p class="text-sm text-ink-200">You can request to:</p>
				<ul class="space-y-2 text-sm text-ink-200">
					<li>Access or correct your information.</li>
					<li>Delete your data or unsubscribe from updates.</li>
					<li>Ask questions about how your data is used.</li>
				</ul>
			</MotionReveal>
		</div>
		<div class="space-y-6">
			<MotionReveal delay={0.08} className="glass space-y-4 p-6">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Contact</p>
				<p class="text-sm text-ink-200">
					Send requests or questions through the contact form, and I will respond promptly.
				</p>
				<a class="nav-pill cta-primary" href="/contact"> Request access </a>
			</MotionReveal>
			<MotionReveal delay={0.16} className="glass space-y-3 p-6">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Updates</p>
				<p class="text-sm text-ink-200">
					If this policy changes, the updated date will be posted here. Continued use of the site
					means the new policy applies.
				</p>
			</MotionReveal>
		</div>
	</div>
</section>
