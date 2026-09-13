<script lang="ts">
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import SafeImage from '$lib/components/SafeImage.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { resolveWorkCoverImage, workItemPath } from '$lib/utils/content';
	import { formatTitle } from '$lib/utils/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	let activeProjectId: number | null = null;

	function homepageProjectTitle(title: string): string {
		return title === 'Winux PTree' ? 'PTree' : title;
	}

	$: featuredProjects = data.featuredWork.slice(0, 4);
	$: if (activeProjectId === null && featuredProjects.length > 0) {
		activeProjectId = featuredProjects[0].id;
	}
	$: activeProject =
		featuredProjects.find((project) => project.id === activeProjectId) ?? featuredProjects[0];
	$: activeProjectIndex = activeProject ? featuredProjects.indexOf(activeProject) : 0;
	$: activeCover = activeProject ? resolveWorkCoverImage(activeProject) : null;
</script>

<SeoHead
	title={formatTitle('Home')}
	description="Independent software engineering for difficult cross-layer problems—clear decisions, accountable delivery, and systems your team can own."
/>

<div class="editorial-home">
	<section class="editorial-hero" aria-labelledby="home-title">
		<div class="hero-context" aria-label="Introduction">
			<span>Conner Adams</span>
			<span>Independent software engineer</span>
			<span>For difficult, cross-layer work</span>
		</div>

		<h1 id="home-title">
			<span>{data.siteSettings.heroHeadline}</span>
		</h1>

		<div class="hero-bottom">
			<p>{data.siteSettings.heroSubheadline}</p>
			<div class="hero-links">
				<a class="home-primary-link" href="/book"
					>Discuss your project <span aria-hidden="true">↗</span></a
				>
				<a class="home-text-link" href="/work">See the evidence</a>
			</div>
		</div>

		<a class="hero-cue" href="#value">
			<span>What your investment buys</span>
			<span aria-hidden="true">↓</span>
		</a>
	</section>

	<section class="value-chapter" id="value" aria-labelledby="value-title">
		<header>
			<p>Why the range matters</p>
			<h2 id="value-title">The return isn’t more code. It’s less uncertainty.</h2>
			<p>
				The right engineering partner should shorten the path to a sound decision, reduce rework,
				and leave you with software your team can actually own.
			</p>
		</header>
		<ol class="value-ledger">
			<li>
				<span>01</span>
				<strong>Get to the right decision sooner</strong>
				<p>
					I turn unclear constraints into a concrete technical path before they become expensive
					implementation mistakes.
				</p>
			</li>
			<li>
				<span>02</span>
				<strong>Keep one accountable owner</strong>
				<p>
					Interface, backend, infrastructure, and runtime decisions stay connected instead of
					getting lost between handoffs.
				</p>
			</li>
			<li>
				<span>03</span>
				<strong>Leave with a system—not a dependency</strong>
				<p>
					You get working software, explicit tradeoffs, and a handoff built for the people who will
					maintain what ships.
				</p>
			</li>
		</ol>
	</section>

	{#if activeProject}
		<section class="work-chapter" id="selected-work" aria-labelledby="selected-work-title">
			<header class="chapter-heading">
				<p>Selected evidence</p>
				<h2 id="selected-work-title">Judgment you can inspect.</h2>
				<a href="/work">View every project <span aria-hidden="true">↗</span></a>
			</header>

			<article class:project-stage-with-image={Boolean(activeCover)} class="project-stage">
				{#if activeCover}
					<SafeImage
						src={activeCover}
						alt={activeProject.imageAlt || `${activeProject.title} project preview`}
						className="home-project-image"
						width={1600}
						height={1000}
					/>
				{/if}

				<div class="project-stage-word" aria-hidden="true">
					{homepageProjectTitle(activeProject.title)}
				</div>
				<div class="project-stage-number" aria-hidden="true">
					{String(activeProjectIndex + 1).padStart(2, '0')}
				</div>

				{#key activeProject.id}
					<div class="project-stage-copy">
						<p>{activeProject.domain || activeProject.role || 'Software engineering'}</p>
						<h3>{homepageProjectTitle(activeProject.title)}</h3>
						<div class="project-stage-detail">
							<p>{activeProject.description}</p>
							<a href={workItemPath(activeProject)}
								>Open project <span aria-hidden="true">↗</span></a
							>
						</div>
					</div>
				{/key}
			</article>

			<div class="project-switcher" aria-label="Choose a featured project">
				{#each featuredProjects as project, index}
					<button
						type="button"
						aria-pressed={activeProject.id === project.id}
						on:click={() => (activeProjectId = project.id)}
						on:focus={() => (activeProjectId = project.id)}
						on:mouseenter={() => (activeProjectId = project.id)}
					>
						<span>{String(index + 1).padStart(2, '0')}</span>
						<strong>{homepageProjectTitle(project.title)}</strong>
						<small>{project.tech || project.role || 'Project'}</small>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.stackItems.length}
		<section class="working-set" aria-labelledby="working-set-title">
			<div class="working-set-heading">
				<p>Less coordination overhead</p>
				<h2 id="working-set-title">What one hire can cover.</h2>
			</div>
			<ul>
				{#each data.stackItems.slice(0, 8) as item}
					<li>
						<strong>{item.label}</strong>
						<span>{item.detail}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="focus-chapter" aria-labelledby="focus-title">
		<div class="focus-inner">
			<p class="focus-kicker">The cost of complexity</p>
			<h2 id="focus-title">{data.siteSettings.focusHeadline}</h2>
			<div class="focus-copy">
				<p>{data.siteSettings.focusBody}</p>
				<a href="/about">See how I protect the work <span aria-hidden="true">↗</span></a>
			</div>
		</div>
	</section>

	<section class="human-chapter" aria-labelledby="human-title">
		<div class="human-heading">
			<p>What working together feels like</p>
			<h2 id="human-title">Senior attention stays on the work.</h2>
		</div>
		<div class="human-copy">
			<p>
				You won’t explain the problem to one person and watch it disappear into a delivery chain.
				You’ll work directly with me from the first messy sketch through the decisions,
				implementation, and handoff—with plain language whenever plain language will do.
			</p>
			<div class="human-signals" aria-label="How I work">
				<span>Clear scope before the build</span>
				<span>Decisions you can audit</span>
				<span>A handoff your team can own</span>
			</div>
			<a href="/book">Talk through a project <span aria-hidden="true">↗</span></a>
		</div>
	</section>

	{#if data.testimonials.length}
		<section class="reviews-chapter" aria-labelledby="reviews-title">
			<header>
				<div>
					<p>Client signal</p>
					<h2 id="reviews-title">What the work felt like.</h2>
				</div>
				<a href="/reviews">Leave a review <span aria-hidden="true">↗</span></a>
			</header>
			<div class="review-rail">
				{#each data.testimonials as review}
					<article>
						<div class="review-rating" aria-label={`${review.rating} out of 5 stars`}>
							{'★'.repeat(review.rating)}
						</div>
						<blockquote>“{review.quote}”</blockquote>
						<footer>
							<strong>{review.name}</strong>
							{#if review.company || review.project}<span>{review.company || review.project}</span
								>{/if}
						</footer>
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<section class="notes-chapter" aria-labelledby="notes-title">
		<div>
			<p class="notes-kicker">Evaluate the thinking</p>
			<h2 id="notes-title">See how I reason before you hire me.</h2>
		</div>
		{#if data.latestNote}
			<a class="latest-note" href={`/blog/${data.latestNote.slug}`}>
				<span>{data.latestNote.publishedAt || data.latestNote.createdAt}</span>
				<strong>{data.latestNote.title}</strong>
				<MarkdownContent source={data.latestNote.excerpt || 'Read the latest technical note.'} />
				<span class="latest-note-arrow" aria-hidden="true">↗</span>
			</a>
		{:else}
			<div class="latest-note latest-note-empty">
				<span>Coming soon</span>
				<strong>The notebook is open.</strong>
				<p>Long-form technical writing will appear here when it is ready.</p>
			</div>
		{/if}
	</section>

	<section class="home-contact" aria-label="Book a consultation">
		<p>If the problem is costly to leave unresolved, let’s make it concrete.</p>
		<a href="/book">Scope the work <span aria-hidden="true">↗</span></a>
	</section>
</div>

<style>
	.editorial-home {
		--home-blue: #294cff;
		--home-paper: #f0f0ea;
		--home-black: #050505;
	}

	.editorial-hero,
	.value-chapter,
	.work-chapter,
	.working-set,
	.human-chapter,
	.reviews-chapter,
	.notes-chapter,
	.home-contact {
		width: min(100%, 100rem);
		margin-inline: auto;
		padding-inline: clamp(1.25rem, 5vw, 5rem);
	}

	.editorial-hero {
		display: flex;
		flex-direction: column;
		min-height: calc(100svh - var(--header-height));
		padding-top: clamp(2rem, 5vw, 5rem);
		padding-bottom: 1.5rem;
	}

	.hero-context {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1rem;
		border-top: 1px solid var(--line-strong);
		padding-top: 0.9rem;
		font-size: 0.72rem;
		font-weight: 620;
		color: var(--ink-soft);
	}

	.hero-context span:last-child {
		text-align: right;
	}

	.editorial-hero h1 {
		max-width: 13ch;
		margin: auto 0;
		padding-block: clamp(4rem, 8vw, 7.5rem);
		font-size: clamp(3.8rem, 8.4vw, 8.6rem);
		font-weight: 590;
		line-height: 0.96;
		letter-spacing: -0.055em;
		text-wrap: balance;
	}

	.editorial-hero h1 span {
		display: block;
	}

	.hero-bottom {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2rem;
		align-items: end;
		border-top: 1px solid var(--line-strong);
		padding-top: 1.5rem;
	}

	.hero-bottom > p {
		max-width: 46rem;
		margin: 0;
		font-size: clamp(1.05rem, 1.65vw, 1.35rem);
		line-height: 1.55;
		letter-spacing: -0.02em;
		color: var(--ink-soft);
	}

	.hero-links {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.home-primary-link,
	.home-text-link,
	.chapter-heading a,
	.project-stage-detail a,
	.focus-copy a {
		font-size: 0.82rem;
		font-weight: 680;
	}

	.home-primary-link {
		display: inline-flex;
		align-items: center;
		gap: 1rem;
		border-radius: 999px;
		background: #ffffff;
		padding: 0.9rem 1.15rem;
		color: #050505;
		transition: background-color 180ms ease;
	}

	.home-primary-link:hover {
		background: var(--home-blue);
		color: #ffffff;
	}

	.home-text-link,
	.chapter-heading a,
	.focus-copy a {
		border-bottom: 1px solid currentColor;
		padding-bottom: 0.2rem;
	}

	.hero-cue {
		display: flex;
		justify-content: space-between;
		margin-top: clamp(3rem, 8vw, 7rem);
		font-size: 0.7rem;
		font-weight: 650;
		color: var(--ink-faint);
	}

	.value-chapter {
		padding-top: clamp(5rem, 9vw, 9rem);
		padding-bottom: clamp(6rem, 11vw, 11rem);
	}

	.value-chapter > header {
		display: grid;
		grid-template-columns: 0.3fr minmax(0, 0.9fr) minmax(18rem, 0.48fr);
		gap: clamp(2rem, 5vw, 5rem);
		align-items: end;
		border-top: 1px solid var(--line-strong);
		padding-top: 1rem;
	}

	.value-chapter > header > p:first-child {
		align-self: start;
		margin: 0;
		font:
			680 0.68rem ui-monospace,
			monospace;
		color: var(--signal-bright);
	}

	.value-chapter h2 {
		margin: 0;
		font-size: clamp(2.8rem, 5.4vw, 5.6rem);
		font-weight: 570;
		line-height: 0.94;
		letter-spacing: -0.07em;
	}

	.value-chapter > header > p:last-child {
		margin: 0;
		font-size: clamp(0.98rem, 1.25vw, 1.12rem);
		line-height: 1.65;
		color: var(--ink-soft);
	}

	.value-ledger {
		margin: clamp(3.5rem, 7vw, 7rem) 0 0;
		padding: 0;
		border-top: 1px solid var(--line-strong);
		list-style: none;
	}

	.value-ledger li {
		display: grid;
		grid-template-columns: 3rem minmax(13rem, 0.65fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		align-items: baseline;
		border-bottom: 1px solid var(--line);
		padding: 1.5rem 0;
		transition:
			padding-left 220ms var(--ease-system),
			border-color 180ms ease;
	}

	.value-ledger li:hover {
		border-color: rgba(73, 103, 255, 0.6);
		padding-left: 0.7rem;
	}

	.value-ledger li > span {
		font:
			650 0.62rem ui-monospace,
			monospace;
		color: var(--signal-bright);
	}

	.value-ledger strong {
		font-size: clamp(1.15rem, 1.8vw, 1.6rem);
		font-weight: 590;
		letter-spacing: -0.025em;
	}

	.value-ledger p {
		max-width: 44rem;
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.65;
		color: var(--ink-soft);
	}

	.work-chapter {
		padding-top: clamp(6rem, 11vw, 11rem);
		padding-bottom: clamp(6rem, 10vw, 10rem);
	}

	.chapter-heading {
		display: grid;
		grid-template-columns: 0.32fr minmax(0, 1fr) auto;
		gap: 2rem;
		align-items: end;
		margin-bottom: clamp(2.5rem, 5vw, 4.5rem);
	}

	.chapter-heading p,
	.working-set-heading p,
	.focus-kicker,
	.notes-kicker {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 680;
		letter-spacing: 0.02em;
		color: var(--ink-faint);
	}

	.chapter-heading h2,
	.working-set-heading h2 {
		margin: 0;
		font-size: clamp(2.4rem, 5vw, 5.1rem);
		font-weight: 570;
		line-height: 0.95;
		letter-spacing: -0.065em;
	}

	.project-stage {
		position: relative;
		display: flex;
		align-items: flex-end;
		min-height: clamp(32rem, 58vw, 49rem);
		overflow: hidden;
		border-radius: 1.1rem;
		background: var(--home-blue);
		color: #ffffff;
		isolation: isolate;
	}

	.project-stage::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(180deg, transparent 32%, rgba(0, 0, 0, 0.8));
	}

	.project-stage :global(.home-project-image) {
		position: absolute;
		inset: 0;
		z-index: -2;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: saturate(0.75) contrast(1.08);
	}

	.project-stage-word {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: -1;
		width: 120%;
		font-size: clamp(7rem, 20vw, 22rem);
		font-weight: 760;
		line-height: 0.82;
		letter-spacing: -0.055em;
		text-align: center;
		color: rgba(0, 0, 0, 0.2);
		white-space: nowrap;
		transform: translate(-50%, -50%) rotate(-7deg);
		transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.project-stage:hover .project-stage-word {
		transform: translate(-50%, -50%) rotate(-5deg) scale(1.025);
	}

	.project-stage-number {
		position: absolute;
		top: 1.4rem;
		right: 1.6rem;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.project-stage-copy {
		width: 100%;
		padding: clamp(1.5rem, 4vw, 3.5rem);
		animation: project-copy-in 420ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.project-stage-copy > p {
		margin: 0 0 0.8rem;
		font-size: 0.72rem;
		font-weight: 680;
	}

	.project-stage-copy h3 {
		margin: 0;
		font-size: clamp(4rem, 10vw, 9rem);
		font-weight: 650;
		line-height: 0.94;
		letter-spacing: -0.045em;
	}

	.project-stage-detail {
		display: grid;
		grid-template-columns: minmax(0, 35rem) auto;
		gap: 2rem;
		align-items: end;
		justify-content: space-between;
		margin-top: 2rem;
	}

	.project-stage-detail p {
		margin: 0;
		font-size: clamp(0.95rem, 1.35vw, 1.12rem);
		line-height: 1.55;
	}

	.project-stage-detail a {
		display: inline-flex;
		gap: 1rem;
		white-space: nowrap;
	}

	.project-switcher {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		border-bottom: 1px solid var(--line-strong);
	}

	.project-switcher button {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.5rem 0.9rem;
		min-width: 0;
		border: 0;
		border-top: 1px solid var(--line-strong);
		background: transparent;
		padding: 1.25rem 1rem 1.35rem 0;
		text-align: left;
		color: var(--ink-faint);
		transition: color 180ms ease;
	}

	.project-switcher button + button {
		border-left: 1px solid var(--line);
		padding-left: 1rem;
	}

	.project-switcher button[aria-pressed='true'] {
		border-top-color: var(--home-blue);
		color: #ffffff;
	}

	.project-switcher button span,
	.project-switcher button small {
		font-size: 0.62rem;
	}

	.project-switcher button strong {
		overflow: hidden;
		font-size: 0.9rem;
		font-weight: 650;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-switcher button small {
		grid-column: 2;
		overflow: hidden;
		color: var(--ink-faint);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.working-set {
		display: grid;
		grid-template-columns: 0.42fr minmax(0, 1fr);
		gap: clamp(3rem, 8vw, 8rem);
		padding-bottom: clamp(7rem, 12vw, 12rem);
	}

	.working-set-heading h2 {
		margin-top: 0.8rem;
	}

	.working-set ul {
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--line-strong);
		list-style: none;
	}

	.working-set li {
		display: grid;
		grid-template-columns: 0.35fr minmax(0, 1fr);
		gap: 1.5rem;
		border-bottom: 1px solid var(--line);
		padding: 1.05rem 0;
		font-size: 0.8rem;
	}

	.working-set li strong {
		font-weight: 650;
		color: #ffffff;
	}

	.working-set li span {
		color: var(--ink-faint);
	}

	.focus-chapter {
		background: var(--home-paper);
		color: var(--home-black);
	}

	.focus-inner {
		width: min(100%, 100rem);
		margin-inline: auto;
		padding: clamp(6rem, 11vw, 11rem) clamp(1.25rem, 5vw, 5rem);
	}

	.focus-kicker {
		color: #56565b;
	}

	.focus-inner h2 {
		max-width: 14ch;
		margin: clamp(3rem, 7vw, 7rem) 0;
		font-size: clamp(4rem, 9vw, 9rem);
		font-weight: 590;
		line-height: 0.87;
		letter-spacing: -0.08em;
	}

	.focus-copy {
		display: grid;
		grid-template-columns: minmax(0, 42rem) auto;
		gap: 3rem;
		align-items: end;
		justify-content: space-between;
		border-top: 1px solid rgba(0, 0, 0, 0.24);
		padding-top: 1.5rem;
	}

	.focus-copy p {
		margin: 0;
		font-size: clamp(1.05rem, 1.5vw, 1.3rem);
		line-height: 1.6;
		color: #3f3f43;
	}

	.human-chapter {
		display: grid;
		grid-template-columns: minmax(0, 0.72fr) minmax(22rem, 0.52fr);
		gap: clamp(3rem, 9vw, 9rem);
		padding-top: clamp(7rem, 12vw, 12rem);
		padding-bottom: clamp(7rem, 12vw, 12rem);
	}

	.human-heading > p,
	.reviews-chapter header p {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 680;
		color: var(--ink-faint);
	}

	.human-heading h2,
	.reviews-chapter h2 {
		max-width: 11ch;
		margin: 1rem 0 0;
		font-size: clamp(3rem, 6.5vw, 6.6rem);
		font-weight: 570;
		line-height: 0.92;
		letter-spacing: -0.07em;
	}

	.human-copy {
		align-self: end;
	}

	.human-copy > p {
		margin: 0;
		font-size: clamp(1.05rem, 1.45vw, 1.25rem);
		line-height: 1.7;
		color: var(--ink-soft);
	}

	.human-signals {
		display: grid;
		margin: 2rem 0;
		border-top: 1px solid var(--line);
	}

	.human-signals span {
		border-bottom: 1px solid var(--line);
		padding: 0.85rem 0;
		font:
			650 0.68rem ui-monospace,
			monospace;
		color: var(--ink-faint);
	}

	.human-copy a,
	.reviews-chapter header a {
		display: inline-flex;
		gap: 1rem;
		border-bottom: 1px solid currentColor;
		padding-bottom: 0.2rem;
		font-size: 0.82rem;
		font-weight: 680;
	}

	.reviews-chapter {
		padding-bottom: clamp(7rem, 12vw, 12rem);
	}

	.reviews-chapter > header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: clamp(2rem, 5vw, 4rem);
	}

	.review-rail {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(20rem, 31rem);
		gap: 0.8rem;
		overflow-x: auto;
		padding-bottom: 1rem;
		scroll-snap-type: x proximity;
	}

	.review-rail article {
		display: flex;
		flex-direction: column;
		min-height: 24rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.025);
		padding: 1.5rem;
		scroll-snap-align: start;
		transition:
			transform 260ms var(--ease-system),
			border-color 180ms ease;
	}

	.review-rail article:hover {
		transform: translateY(-4px);
		border-color: rgba(73, 103, 255, 0.65);
	}

	.review-rating {
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		color: #ffd76a;
	}

	.review-rail blockquote {
		margin: auto 0;
		font-size: clamp(1.45rem, 2.3vw, 2.2rem);
		font-weight: 520;
		line-height: 1.2;
		letter-spacing: -0.035em;
	}

	.review-rail footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid var(--line);
		padding-top: 1rem;
		font-size: 0.72rem;
	}

	.review-rail footer span {
		color: var(--ink-faint);
	}

	.notes-chapter {
		display: grid;
		grid-template-columns: minmax(0, 0.8fr) minmax(22rem, 0.55fr);
		gap: clamp(3rem, 9vw, 9rem);
		padding-top: clamp(7rem, 12vw, 12rem);
		padding-bottom: clamp(7rem, 12vw, 12rem);
	}

	.notes-chapter h2 {
		max-width: 12ch;
		margin: 1rem 0 0;
		font-size: clamp(3rem, 6.5vw, 6.6rem);
		font-weight: 570;
		line-height: 0.92;
		letter-spacing: -0.07em;
	}

	.latest-note {
		position: relative;
		display: flex;
		flex-direction: column;
		align-self: end;
		min-height: 22rem;
		border-radius: 1rem;
		background: #ffffff;
		padding: 1.5rem;
		color: #080808;
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	a.latest-note:hover {
		transform: rotate(-1deg) translateY(-4px);
	}

	.latest-note > span:first-child {
		font-size: 0.65rem;
		color: #68686e;
	}

	.latest-note strong {
		max-width: 12ch;
		margin-top: auto;
		font-size: clamp(2rem, 3.5vw, 3.5rem);
		font-weight: 620;
		line-height: 0.95;
		letter-spacing: -0.055em;
	}

	.latest-note p {
		max-width: 30rem;
		margin: 1rem 3rem 0 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: #56565b;
	}

	.latest-note-arrow {
		position: absolute;
		right: 1.5rem;
		bottom: 1.5rem;
		font-size: 1.25rem;
	}

	.home-contact {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		border-top: 1px solid var(--line-strong);
		padding-top: clamp(3rem, 6vw, 6rem);
		padding-bottom: clamp(3rem, 6vw, 6rem);
	}

	.home-contact p {
		max-width: 15ch;
		margin: 0;
		font-size: clamp(2.6rem, 6vw, 6rem);
		font-weight: 580;
		line-height: 0.9;
		letter-spacing: -0.07em;
	}

	.home-contact a {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		width: clamp(11rem, 18vw, 16rem);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--home-blue);
		padding: 1.5rem;
		font-size: 1rem;
		font-weight: 680;
		color: #ffffff;
		transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.home-contact a:hover {
		transform: rotate(-4deg) scale(1.03);
	}

	@keyframes project-copy-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 900px) {
		.hero-context {
			grid-template-columns: 1fr auto;
		}

		.hero-context span:nth-child(2) {
			display: none;
		}

		.chapter-heading,
		.value-chapter > header,
		.working-set,
		.human-chapter,
		.notes-chapter {
			grid-template-columns: 1fr;
		}

		.chapter-heading a {
			width: fit-content;
		}

		.project-switcher {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.project-switcher button:nth-child(3) {
			border-left: 0;
		}

		.focus-copy {
			grid-template-columns: 1fr;
		}

		.focus-copy a {
			width: fit-content;
		}

		.latest-note {
			min-height: 19rem;
		}

		.value-chapter > header > p:first-child {
			grid-row: auto;
		}
	}

	@media (max-width: 640px) {
		.editorial-hero {
			min-height: auto;
		}

		.hero-context span:last-child {
			max-width: 9rem;
		}

		.editorial-hero h1 {
			padding-block: 5.5rem;
			font-size: clamp(3.6rem, 18vw, 6rem);
			line-height: 1.04;
		}

		.hero-bottom,
		.project-stage-detail {
			grid-template-columns: 1fr;
		}

		.hero-links {
			justify-content: space-between;
		}

		.project-stage {
			min-height: 34rem;
		}

		.project-stage-copy h3 {
			font-size: clamp(3.5rem, 18vw, 6rem);
		}

		.project-stage-detail a {
			width: fit-content;
		}

		.project-switcher {
			grid-template-columns: 1fr;
		}

		.project-switcher button + button,
		.project-switcher button:nth-child(3) {
			border-left: 0;
		}

		.working-set li {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}

		.value-ledger li {
			grid-template-columns: 2rem minmax(0, 1fr);
			gap: 0.75rem 1rem;
		}

		.value-ledger p {
			grid-column: 2;
		}

		.focus-inner h2 {
			font-size: clamp(3.7rem, 17vw, 6rem);
		}

		.home-contact {
			align-items: flex-start;
			flex-direction: column;
		}

		.reviews-chapter > header {
			align-items: start;
			flex-direction: column;
		}
		.review-rail {
			grid-auto-columns: minmax(17rem, 88vw);
		}

		.home-contact a {
			align-self: flex-end;
			width: 10rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.project-stage-word,
		.home-contact a,
		.latest-note,
		.project-stage-copy {
			animation: none;
			transition: none;
		}

		.review-rail article {
			transition: none;
		}

		.value-ledger li {
			transition: none;
		}
	}
</style>
