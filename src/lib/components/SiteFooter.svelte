<script lang="ts">
	import type { FooterLink } from '$lib/server/db';
	export let footerLinks: FooterLink[] = [];
	export let currentYear: number;
	export let footerBadge = '';
	export let footerHeadline = '';
	export let footerBody = '';
	export let footerCtaLabel = '';
	export let footerCtaHref = '';

	const sectionOrder = ['Pages', 'Links'];

	const groupedLinks = () => {
		const groups = new Map<string, FooterLink[]>();
		for (const link of footerLinks) {
			if (!groups.has(link.section)) {
				groups.set(link.section, []);
			}
			groups.get(link.section)?.push(link);
		}

		for (const links of groups.values()) {
			links.sort((a, b) => a.sort - b.sort || a.id - b.id);
		}

		const ordered = sectionOrder
			.filter((section) => groups.has(section))
			.map((section) => ({
				title: section,
				links: groups.get(section) ?? [],
			}));

		for (const [section, links] of groups.entries()) {
			if (!sectionOrder.includes(section)) {
				ordered.push({ title: section, links });
			}
		}

		return ordered;
	};
</script>

<footer class="section-pad relative z-10">
	<div class="glass grid gap-10 p-10 md:grid-cols-[1.4fr_1fr_1fr]">
		<div class="space-y-4">
			<p class="badge">{footerBadge || 'Conner'}</p>
			<h2 class="text-3xl font-semibold text-white">
				{footerHeadline || 'Low-level systems engineer building hardware-specific software.'}
			</h2>
			<p class="text-base text-ink-200">
				{footerBody ||
					'Rust-heavy systems, embedded-adjacent tooling, filesystem indexing, and network appliance work by Conner.'}
			</p>
			{#if footerCtaLabel && footerCtaHref}
				<a class="link-underline" href={footerCtaHref}>{footerCtaLabel}</a>
			{:else}
				<a class="link-underline" href="/contact">Say hello</a>
			{/if}
		</div>
		{#each groupedLinks() as column}
			<div class="space-y-3">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">{column.title}</p>
				<div class="flex flex-col gap-2">
					{#each column.links as link}
						<a
							class="text-sm font-semibold text-ink-100 hover:text-white"
							href={link.href ? link.href : '#'}
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noreferrer noopener' : undefined}
							aria-label={link.external ? `${link.label} (opens in a new tab)` : undefined}
						>
							{link.label}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<div
		class="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-ink-300"
	>
		<span>© {currentYear} Conner</span>
		<span>Rust / systems / embedded fit</span>
	</div>
</footer>
