<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;

	let selectedDate =
		data.availability.find((day) =>
			day.slots.some((slot) => slot.startsAt === form?.fields?.startsAt),
		)?.date ??
		data.availability[0]?.date ??
		'';
	let selectedStartsAt = form?.fields?.startsAt ?? '';
	let visitorTimezone = data.portfolioTimeZone;

	$: selectedDay = data.availability.find((day) => day.date === selectedDate);

	onMount(() => {
		visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || data.portfolioTimeZone;
	});

	const localTime = (startsAt: string) =>
		new Intl.DateTimeFormat('en-US', {
			timeZone: visitorTimezone,
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
		}).format(new Date(startsAt));

	const confirmationTime = (startsAt: string) =>
		new Intl.DateTimeFormat('en-US', {
			timeZone: visitorTimezone,
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
		}).format(new Date(startsAt));
</script>

<SeoHead
	title={formatTitle('Book a project consultation')}
	description="Choose an available time to discuss a software project and receive a tailored quote."
/>

<main class="booking-page">
	<section class="booking-intro" aria-labelledby="booking-title">
		<div>
			<p class="booking-kicker">Project consultation / 30 minutes</p>
			<h1 id="booking-title">Let’s put the hard parts on the table.</h1>
		</div>
		<div class="booking-intro-copy">
			<p>
				Bring the idea, the constraint, or the system that refuses to cooperate. We’ll use this
				first conversation to understand the work and shape a useful next step—not force a sales
				pitch.
			</p>
			<ul aria-label="Consultation details">
				<li><span>Format</span> Video call</li>
				<li><span>Response</span> Personally reviewed</li>
				<li><span>Time zone</span> <strong>{visitorTimezone}</strong></li>
			</ul>
		</div>
	</section>

	{#if form?.success && form.startsAt}
		<section class="booking-confirmation" role="status" aria-live="polite">
			<p class="booking-kicker">Request received</p>
			<h2>Your conversation is on my desk.</h2>
			<p>
				You requested <strong>{confirmationTime(form.startsAt)}</strong>. I’ll review the project
				details and follow up by email to confirm.
			</p>
			<a href="/work">Explore the work while you wait <span aria-hidden="true">↗</span></a>
		</section>
	{:else}
		<form class="booking-workspace" method="POST" action="?/request">
			<input type="hidden" name="visitorTimezone" value={visitorTimezone} />
			<div class="honeypot" aria-hidden="true">
				<label for="website">Website</label>
				<input id="website" name="website" tabindex="-1" autocomplete="off" />
			</div>

			<section class="booking-step" aria-labelledby="date-step">
				<header>
					<span>01</span>
					<div>
						<p>Availability</p>
						<h2 id="date-step">Choose a day</h2>
					</div>
				</header>
				{#if data.availability.length}
					<div class="date-strip">
						{#each data.availability as day}
							<button
								type="button"
								class:active={selectedDate === day.date}
								aria-pressed={selectedDate === day.date}
								on:click={() => {
									selectedDate = day.date;
									selectedStartsAt = '';
								}}
							>
								<strong>{day.label}</strong>
								<span>{day.slots.length} open</span>
							</button>
						{/each}
					</div>
				{:else}
					<p class="booking-empty">
						No online times are open right now. Email {data.siteSettings.contactEmail}.
					</p>
				{/if}
			</section>

			<section class="booking-step" aria-labelledby="time-step">
				<header>
					<span>02</span>
					<div>
						<p>Your local time</p>
						<h2 id="time-step">Choose a start time</h2>
					</div>
				</header>
				<div class="time-grid">
					{#each selectedDay?.slots ?? [] as slot}
						<label class:active={selectedStartsAt === slot.startsAt}>
							<input
								bind:group={selectedStartsAt}
								type="radio"
								name="startsAt"
								value={slot.startsAt}
								required
							/>
							<strong>{localTime(slot.startsAt)}</strong>
							<span>{slot.ownerLabel} for Conner</span>
						</label>
					{/each}
				</div>
			</section>

			<section class="booking-step details-step" aria-labelledby="details-step">
				<header>
					<span>03</span>
					<div>
						<p>Project context</p>
						<h2 id="details-step">Give me the useful signal</h2>
					</div>
				</header>
				<div class="booking-fields">
					<label>
						<span>Name *</span>
						<input
							name="name"
							autocomplete="name"
							required
							maxlength="120"
							value={form?.fields?.name ?? ''}
						/>
					</label>
					<label>
						<span>Email *</span>
						<input
							name="email"
							type="email"
							autocomplete="email"
							required
							maxlength="320"
							value={form?.fields?.email ?? ''}
						/>
					</label>
					<label>
						<span>Company / organization</span>
						<input
							name="company"
							autocomplete="organization"
							maxlength="160"
							value={form?.fields?.company ?? ''}
						/>
					</label>
					<label>
						<span>Project type *</span>
						<select name="projectType" required>
							<option value="">Choose a category</option>
							{#each data.projectCategories as category}
								<option value={category} selected={form?.fields?.projectType === category}
									>{category}</option
								>
							{/each}
						</select>
					</label>
					<label class="description-field">
						<span>What are you trying to build or change? *</span>
						<textarea
							name="description"
							required
							maxlength="3000"
							rows="5"
							placeholder="The goal, the current state, and the constraint that matters most."
							>{form?.fields?.description ?? ''}</textarea
						>
					</label>
				</div>
				<div class="booking-submit">
					<div aria-live="polite">
						{#if form?.message}<p class="form-message">{form.message}</p>{/if}
						<p>Submitting requests the time; it is confirmed after I review the details.</p>
					</div>
					<button type="submit" disabled={!selectedStartsAt}
						>Request consultation <span aria-hidden="true">↗</span></button
					>
				</div>
			</section>
		</form>
	{/if}
</main>

<style>
	.booking-page {
		width: min(100%, 100rem);
		margin: 0 auto;
		padding: clamp(3rem, 7vw, 7rem) clamp(1.25rem, 5vw, 5rem) clamp(6rem, 10vw, 10rem);
	}
	.booking-intro {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.55fr);
		gap: clamp(3rem, 9vw, 9rem);
		align-items: end;
		border-top: 1px solid var(--line-strong);
		padding-top: 1rem;
	}
	.booking-kicker,
	.booking-step header p {
		margin: 0;
		font:
			650 0.66rem/1.4 ui-monospace,
			monospace;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--signal-bright);
	}
	h1 {
		max-width: 12ch;
		margin: clamp(2.5rem, 7vw, 7rem) 0 0;
		font-size: clamp(3.5rem, 8.3vw, 8.5rem);
		font-weight: 580;
		line-height: 0.9;
		letter-spacing: -0.075em;
	}
	.booking-intro-copy > p {
		margin: 0;
		font-size: clamp(1rem, 1.4vw, 1.2rem);
		line-height: 1.65;
		color: var(--ink-soft);
	}
	.booking-intro-copy ul {
		margin: 2rem 0 0;
		padding: 0;
		border-top: 1px solid var(--line);
		list-style: none;
	}
	.booking-intro-copy li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--line);
		padding: 0.85rem 0;
		font-size: 0.78rem;
	}
	.booking-intro-copy li span {
		color: var(--ink-faint);
	}
	.booking-intro-copy strong {
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.booking-workspace {
		margin-top: clamp(5rem, 10vw, 10rem);
	}
	.booking-step {
		display: grid;
		grid-template-columns: minmax(14rem, 0.35fr) minmax(0, 1fr);
		gap: clamp(2rem, 6vw, 6rem);
		border-top: 1px solid var(--line-strong);
		padding: clamp(2rem, 5vw, 4rem) 0;
	}
	.booking-step header {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-content: start;
	}
	.booking-step header > span {
		font:
			650 0.66rem ui-monospace,
			monospace;
		color: var(--ink-faint);
	}
	.booking-step h2 {
		margin: 0.4rem 0 0;
		font-size: clamp(1.8rem, 3vw, 3.2rem);
		font-weight: 580;
	}
	.date-strip {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(8.5rem, 1fr);
		gap: 0.65rem;
		overflow-x: auto;
		padding: 0 0 0.75rem;
		scroll-snap-type: x proximity;
	}
	.date-strip button,
	.time-grid label {
		min-height: 5.7rem;
		border: 1px solid var(--line);
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.025);
		padding: 1rem;
		color: var(--ink);
		text-align: left;
		transition:
			transform var(--motion-base) var(--ease-system),
			border-color var(--motion-fast),
			background var(--motion-fast);
	}
	.date-strip button {
		scroll-snap-align: start;
	}
	.date-strip button:hover,
	.time-grid label:hover {
		transform: translateY(-2px);
		border-color: rgba(73, 103, 255, 0.7);
	}
	.date-strip button.active,
	.time-grid label.active {
		border-color: var(--signal);
		background: rgba(73, 103, 255, 0.13);
		box-shadow: inset 0 0 0 1px rgba(73, 103, 255, 0.25);
	}
	.date-strip strong,
	.date-strip span,
	.time-grid strong,
	.time-grid span {
		display: block;
	}
	.date-strip strong {
		font-size: 0.9rem;
	}
	.date-strip span,
	.time-grid span {
		margin-top: 0.55rem;
		font-size: 0.68rem;
		color: var(--ink-faint);
	}
	.time-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.time-grid label {
		cursor: pointer;
	}
	.time-grid input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.booking-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.2rem;
	}
	.booking-fields label > span {
		display: block;
		margin-bottom: 0.55rem;
		font:
			650 0.64rem ui-monospace,
			monospace;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.booking-fields input,
	.booking-fields select,
	.booking-fields textarea {
		width: 100%;
		border: 1px solid var(--line-strong);
		border-radius: 0.75rem;
		background: #0a0a0d;
		padding: 0.9rem 1rem;
		color: white;
	}
	.description-field {
		grid-column: 1 / -1;
	}
	.booking-fields textarea {
		resize: vertical;
	}
	.booking-submit {
		grid-column: 2;
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		align-items: center;
	}
	.booking-submit p {
		max-width: 35rem;
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--ink-faint);
	}
	.booking-submit .form-message {
		margin-bottom: 0.45rem;
		color: #ffb4b4;
	}
	.booking-submit button,
	.booking-confirmation a {
		display: inline-flex;
		justify-content: space-between;
		gap: 2rem;
		border: 0;
		border-radius: 999px;
		background: white;
		padding: 1rem 1.25rem;
		font-size: 0.82rem;
		font-weight: 680;
		color: #050505;
		white-space: nowrap;
		transition:
			background var(--motion-fast),
			color var(--motion-fast),
			transform var(--motion-fast);
	}
	.booking-submit button:hover,
	.booking-confirmation a:hover {
		transform: translateY(-2px);
		background: var(--signal);
		color: white;
	}
	.booking-submit button:disabled {
		cursor: not-allowed;
		opacity: 0.35;
		transform: none;
	}
	.booking-confirmation {
		max-width: 70rem;
		margin: clamp(6rem, 12vw, 12rem) 0;
		border-left: 3px solid var(--signal);
		padding: clamp(2rem, 5vw, 4rem);
		background: rgba(73, 103, 255, 0.08);
	}
	.booking-confirmation h2 {
		margin: 1rem 0;
		font-size: clamp(2.7rem, 6vw, 6rem);
		line-height: 0.95;
	}
	.booking-confirmation > p:not(.booking-kicker) {
		max-width: 42rem;
		color: var(--ink-soft);
		line-height: 1.7;
	}
	.booking-confirmation a {
		margin-top: 1.5rem;
	}
	.booking-empty {
		color: var(--ink-soft);
	}
	.honeypot {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	@media (max-width: 800px) {
		.booking-intro,
		.booking-step {
			grid-template-columns: 1fr;
		}
		.booking-step {
			gap: 2rem;
		}
		.booking-submit {
			grid-column: 1;
		}
	}
	@media (max-width: 560px) {
		.booking-page {
			padding-top: 2rem;
		}
		h1 {
			font-size: clamp(3.5rem, 17vw, 5.5rem);
		}
		.time-grid,
		.booking-fields {
			grid-template-columns: 1fr;
		}
		.booking-submit {
			align-items: stretch;
			flex-direction: column;
		}
		.booking-submit button {
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.date-strip button,
		.time-grid label,
		.booking-submit button,
		.booking-confirmation a {
			transition: none;
		}
	}
</style>
