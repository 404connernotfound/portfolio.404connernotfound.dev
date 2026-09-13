<script lang="ts">
	import AdminNav from '$lib/components/AdminNav.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData | undefined;

	const appointmentLabel = (startsAt: string) =>
		new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
		}).format(new Date(startsAt));
</script>

<SeoHead
	title={formatTitle('Admin | Appointments')}
	description="Manage project consultation requests."
/>

<section class="section-pad">
	<div class="space-y-4">
		<p class="badge">Admin / Pipeline</p>
		<h1 class="text-4xl font-semibold text-white sm:text-5xl">Appointments</h1>
		<p class="max-w-2xl text-lg text-ink-200">
			Review project context, confirm a conversation, or reopen the time by cancelling it.
		</p>
		<AdminNav />
	</div>
</section>

<section class="section-pad">
	{#if form?.message}<p class={`admin-notice ${form.success ? 'success' : ''}`} role="status">
			{form.message}
		</p>{/if}
	<div class="appointment-list">
		{#each data.appointments as appointment}
			<article>
				<header>
					<div>
						<p>{appointmentLabel(appointment.startsAt)}</p>
						<h2>{appointment.name}</h2>
					</div>
					<span class={`status ${appointment.status}`}>{appointment.status}</span>
				</header>
				<div class="appointment-meta">
					<p><span>Project</span>{appointment.projectType}</p>
					<p><span>Company</span>{appointment.company || 'Independent'}</p>
					<p><span>Email</span><a href={`mailto:${appointment.email}`}>{appointment.email}</a></p>
					<p><span>Client zone</span>{appointment.visitorTimezone}</p>
				</div>
				<p class="description">{appointment.description}</p>
				<form method="POST" action="?/setStatus">
					<input type="hidden" name="csrfToken" value={data.csrfToken} />
					<input type="hidden" name="id" value={appointment.id} />
					<label>
						<span>Workflow status</span>
						<select name="status" aria-label={`Status for ${appointment.name}`}>
							<option value="pending" selected={appointment.status === 'pending'}>Pending</option>
							<option value="confirmed" selected={appointment.status === 'confirmed'}
								>Confirmed</option
							>
							<option value="cancelled" selected={appointment.status === 'cancelled'}
								>Cancelled</option
							>
						</select>
					</label>
					<button class="nav-pill" type="submit">Update</button>
				</form>
			</article>
		{:else}
			<div class="empty-state">
				<p class="badge">All clear</p>
				<h2>No consultation requests yet.</h2>
				<a class="link-underline" href="/book">Open the public booking page</a>
			</div>
		{/each}
	</div>
</section>

<style>
	.admin-notice {
		margin: 0 0 1rem;
		border-left: 2px solid #f59e0b;
		padding: 0.8rem 1rem;
		background: rgba(245, 158, 11, 0.08);
		color: var(--ink-soft);
	}
	.admin-notice.success {
		border-color: #34d399;
		background: rgba(52, 211, 153, 0.08);
	}
	.appointment-list {
		display: grid;
		gap: 1rem;
	}
	article,
	.empty-state {
		border: 1px solid var(--line);
		border-radius: 1.25rem;
		background: rgba(255, 255, 255, 0.025);
		padding: clamp(1.25rem, 3vw, 2rem);
	}
	article header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}
	article header p {
		margin: 0;
		font:
			650 0.66rem ui-monospace,
			monospace;
		color: var(--signal-bright);
	}
	article h2 {
		margin: 0.4rem 0 0;
		font-size: 2rem;
	}
	.status {
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		padding: 0.4rem 0.65rem;
		font:
			650 0.62rem ui-monospace,
			monospace;
		text-transform: uppercase;
	}
	.status.confirmed {
		border-color: rgba(52, 211, 153, 0.5);
		color: #6ee7b7;
	}
	.status.cancelled {
		color: var(--ink-faint);
	}
	.appointment-meta {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-top: 1.5rem;
		border-block: 1px solid var(--line);
		padding: 1rem 0;
	}
	.appointment-meta p {
		margin: 0;
		font-size: 0.8rem;
		overflow-wrap: anywhere;
	}
	.appointment-meta span,
	form label > span {
		display: block;
		margin-bottom: 0.35rem;
		font:
			600 0.59rem ui-monospace,
			monospace;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.description {
		max-width: 60rem;
		margin: 1.5rem 0;
		line-height: 1.65;
		color: var(--ink-soft);
		white-space: pre-wrap;
	}
	article form {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		align-items: end;
	}
	article select {
		min-width: 10rem;
		border: 1px solid var(--line-strong);
		border-radius: 0.65rem;
		background: #0a0a0d;
		padding: 0.72rem;
		color: white;
	}
	.empty-state h2 {
		margin: 1rem 0 2rem;
		font-size: 2rem;
	}
	@media (max-width: 800px) {
		.appointment-meta {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 520px) {
		.appointment-meta {
			grid-template-columns: 1fr;
		}
		article form {
			justify-content: stretch;
		}
		article form label {
			flex: 1;
		}
		article select {
			width: 100%;
		}
	}
</style>
