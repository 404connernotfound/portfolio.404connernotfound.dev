<script lang="ts">
	import type { FooterLink } from '$lib/server/db';
	export let footerLinks: FooterLink[] = [];
	export let currentYear: number;
	export let footerBadge = '';
	export let footerCtaLabel = '';
	export let footerCtaHref = '';

	const sectionOrder = ['Pages', 'Links'];

	const groupedLinks = () => {
		const groups = new Map<string, FooterLink[]>();
		for (const link of footerLinks) {
			if (!groups.has(link.section)) groups.set(link.section, []);
			groups.get(link.section)?.push(link);
		}

		for (const links of groups.values()) {
			links.sort((a, b) => a.sort - b.sort || a.id - b.id);
		}

		const ordered = sectionOrder
			.filter((section) => groups.has(section))
			.map((section) => ({ title: section, links: groups.get(section) ?? [] }));

		for (const [section, links] of groups.entries()) {
			if (!sectionOrder.includes(section)) ordered.push({ title: section, links });
		}

		return ordered;
	};
</script>

<footer class="site-footer">
	<div class="footer-directory">
		<div>
			<p class="footer-signature">404 / Conner Adams</p>
			<p class="mt-3 max-w-sm text-sm leading-6 text-ink-400">
				{footerBadge || 'Instrumented Systems'} / portfolio index
			</p>
			{#if footerCtaHref && footerCtaLabel}
				<a class="inspection-link mt-5" href={footerCtaHref}>
					{footerCtaLabel} <span aria-hidden="true">→</span>
				</a>
			{/if}
		</div>
		{#each groupedLinks() as column}
			<div>
				<p class="footer-group-title">{column.title}</p>
				<div class="footer-link-list">
					{#each column.links as link}
						<a
							href={link.href || '#'}
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

	<div class="footer-bottom">
		<span>© {currentYear} Conner Adams</span>
		<span>System state: static public index</span>
	</div>
</footer>
