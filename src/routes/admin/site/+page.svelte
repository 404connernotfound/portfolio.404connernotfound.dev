<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import MotionReveal from '$lib/components/MotionReveal.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;
</script>

<SeoHead title={formatTitle('Admin | Site')} description="Update global hero and focus content." />

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Site settings</h1>
		<p class="max-w-2xl text-lg text-ink-200">Hero, highlights, and focus content.</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	<MotionReveal className="glass p-8">
		<h2 class="text-2xl font-semibold text-white">Update site content</h2>
		{#if form?.message}
			<p class="mt-3 text-sm text-ink-200">{form.message}</p>
		{:else if form?.success}
			<p class="mt-3 text-sm text-aurora-200">Saved.</p>
		{/if}
		<form class="mt-6 grid gap-4" method="POST" action="?/updateSite">
			<input type="hidden" name="csrfToken" value={data.csrfToken} />
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="heroHeadline"
				>
					Hero headline
				</label>
				<textarea
					id="heroHeadline"
					name="heroHeadline"
					rows="2"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					>{data.siteSettings.heroHeadline}</textarea
				>
			</div>
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="heroSubheadline"
				>
					Hero subheadline
				</label>
				<textarea
					id="heroSubheadline"
					name="heroSubheadline"
					rows="2"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					>{data.siteSettings.heroSubheadline}</textarea
				>
			</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="heroNoteTitle"
					>
						Hero note title
					</label>
					<input
						id="heroNoteTitle"
						name="heroNoteTitle"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						value={data.siteSettings.heroNoteTitle}
					/>
				</div>
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="heroNoteBody"
					>
						Hero note body
					</label>
					<input
						id="heroNoteBody"
						name="heroNoteBody"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						value={data.siteSettings.heroNoteBody}
					/>
				</div>
			</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="heroHighlightsTitle"
					>
						Hero highlights title
					</label>
					<input
						id="heroHighlightsTitle"
						name="heroHighlightsTitle"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						value={data.siteSettings.heroHighlightsTitle}
					/>
				</div>
				<div>
					<label
						class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
						for="heroHighlightsBody"
					>
						Hero highlights body
					</label>
					<input
						id="heroHighlightsBody"
						name="heroHighlightsBody"
						class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
						value={data.siteSettings.heroHighlightsBody}
					/>
				</div>
			</div>
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="focusHeadline"
				>
					Focus headline
				</label>
				<textarea
					id="focusHeadline"
					name="focusHeadline"
					rows="2"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					>{data.siteSettings.focusHeadline}</textarea
				>
			</div>
			<div>
				<label
					class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200"
					for="focusBody"
				>
					Focus body
				</label>
				<textarea
					id="focusBody"
					name="focusBody"
					rows="2"
					class="mt-2 w-full rounded-2xl border border-ink-200/40 bg-white/5 px-4 py-3 text-sm text-white"
					>{data.siteSettings.focusBody}</textarea
				>
			</div>
			<div class="flex justify-end">
				<button class="nav-pill border-ink-100 bg-ink-900 text-white" type="submit">
					Save settings
				</button>
			</div>
		</form>
		<div class="mt-8 border-t border-ink-200/20 pt-6">
			<h3 class="text-lg font-semibold text-white">Restore portfolio copy</h3>
			<p class="mt-2 max-w-2xl text-sm text-ink-200">
				Reset a section to the conversion-focused copy shipped with the site. Other sections and
				contact details will not change.
			</p>
			<div class="mt-4 flex flex-wrap gap-3">
				<form method="POST" action="?/restoreHeroDefaults">
					<input type="hidden" name="csrfToken" value={data.csrfToken} />
					<button class="nav-pill border-ink-200/40 bg-white/5 text-white" type="submit">
						Restore hero defaults
					</button>
				</form>
				<form method="POST" action="?/restoreFocusDefaults">
					<input type="hidden" name="csrfToken" value={data.csrfToken} />
					<button class="nav-pill border-ink-200/40 bg-white/5 text-white" type="submit">
						Restore focus defaults
					</button>
				</form>
			</div>
		</div>
	</MotionReveal>
</section>
