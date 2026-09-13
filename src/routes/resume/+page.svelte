<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { formatTitle } from '$lib/utils/seo';

	// Transcribed from the original resume PDF, with updated contact and employment details.
	const skills = [
		{ label: 'Languages', detail: 'Rust, Python, JavaScript / TypeScript, C++, HTML / CSS, SQL' },
		{
			label: 'Tools & platforms',
			detail: 'Git / GitHub, Docker, Discord.py, Node.js, Linux, Windows',
		},
		{ label: 'Infrastructure', detail: 'PostgreSQL, MongoDB, AWS, CI/CD pipelines' },
		{
			label: 'Specializations',
			detail: 'Systems programming, API design, DevOps, language interoperability',
		},
	];

	const projects = [
		{
			name: 'Node.rs',
			stack: 'Rust / Node.js / C ABI',
			href: 'https://github.com/ConnerAdamsMaine/Node.rs',
			detail:
				'A language bridge between Node.js and Rust with bidirectional function bindings and an ABI-safe FFI layer. Connects performance-critical Rust code to Node.js applications, and back again.',
		},
		{
			name: 'RustCraft Server',
			stack: 'Rust / WASM / Lua',
			href: 'https://github.com/ConnerAdamsMaine/RustCraft-Server',
			detail:
				'A Minecraft 1.21.7 server built from scratch in Rust. Custom world generation, compressed chunk storage to reduce memory use, and a plugin system supporting WASM, Lua, Rust, and compiled DLLs.',
		},
		{
			name: 'TimekeeperV2',
			stack: 'Python / Discord.py / SQL',
			href: 'https://github.com/ConnerAdamsMaine/TimekeeperV2-Development',
			detail:
				'A Discord bot for time tracking and project management, with SQL-backed persistence, role-based permissions, and a real-time analytics dashboard for team productivity.',
		},
	];

	const certifications = [
		{ name: 'Broadband Operator Certification', status: '' },
		{ name: 'Certified Fiber Optic Technician', status: '' },
		{ name: 'FBA OpTIC Path', status: 'In Progress' },
		{ name: 'SCTE Broadband Fiber Installer', status: '' },
		{ name: 'BICSI Installer 2, Optical Fiber', status: '' },
		{ name: 'FOA CFOS/O (Outside Plant)', status: 'In Progress' },
		{ name: 'FOA CFOS/S (Splicing)', status: 'In Progress' },
		{ name: 'FOA CFOS/T (Testing)', status: 'In Progress' },
		{ name: 'Flagger Certification', status: 'Current' },
		{ name: 'Driver’s License, Non-CDL Class C', status: 'Valid through August 2029' },
	];
</script>

<SeoHead
	title={formatTitle('Resume')}
	description="Conner Adams’s resume: full-stack software engineering, systems programming, fiber optics, technical projects, education, and certifications. Based in Lewiston, Maine."
/>

<article class="resume" aria-labelledby="resume-title">
	<header class="section-pad resume-header">
		<div class="inspection-shell">
			<div>
				<p class="system-label">Experience / résumé</p>
				<h1 id="resume-title" class="inspection-title">Conner Adams</h1>
				<p class="resume-role">Full-stack software engineer</p>
				<p class="inspection-summary">
					I build across the stack, from the interface to the systems underneath it. My work spans
					backend infrastructure, language bridges, game servers, and integration platforms, with
					Rust, Python, and DevOps at the core. I carry that work from architecture through
					deployment and maintenance.
				</p>
			</div>
			<aside class="inspection-side resume-contact" aria-label="Contact details">
				<p class="system-label">Based in</p>
				<p>Lewiston, ME 04240</p>
				<address>
					<a href="mailto:conner@404connernotfound.dev">conner@404connernotfound.dev</a>
					<a href="https://github.com/ConnerAdamsMaine"
						>GitHub / ConnerAdamsMaine <span aria-hidden="true">↗</span></a
					>
				</address>
			</aside>
		</div>
		<nav class="resume-index" aria-label="Resume sections">
			<a href="#experience">01 / Experience</a>
			<a href="#skills">02 / Skills</a>
			<a href="#projects">03 / Projects</a>
			<a href="#education">04 / Education</a>
			<a href="#certifications">05 / Certifications</a>
		</nav>
	</header>

	<div class="section-pad resume-body">
		<section class="resume-section" id="experience" aria-labelledby="experience-title">
			<header class="resume-section-heading">
				<p class="system-label">01 / Work history</p>
				<h2 id="experience-title">Experience.</h2>
			</header>
			<div class="resume-entries">
				<article class="resume-entry resume-current" aria-labelledby="hawkeye-title">
					<p class="resume-date">
						<time datetime="2026-07">July 2026</time> – present
						<span class="resume-current-label">Current</span>
					</p>
					<h3 id="hawkeye-title">Groundhand Apprentice</h3>
					<p class="resume-context">
						Hawkeye Fiber Optics <span aria-hidden="true">/</span> Poland, ME
					</p>
				</article>
				<article class="resume-entry" aria-labelledby="ace-title">
					<p class="resume-date">
						<time datetime="2025-08">August 2025</time> – <time datetime="2026-06">June 2026</time>
					</p>
					<h3 id="ace-title">Traffic Controller</h3>
					<p class="resume-context">ACE Security <span aria-hidden="true">/</span> Lisbon, ME</p>
					<ul>
						<li>
							Directed traffic through construction zones, balancing worker and public safety with
							efficient flow.
						</li>
						<li>
							Coordinated with crews using radios and signals to manage complex traffic patterns in
							real time.
						</li>
					</ul>
				</article>
				<article class="resume-entry" aria-labelledby="software-title">
					<p class="resume-date"><time datetime="2024-08">August 2024</time> – present</p>
					<h3 id="software-title">Software Engineer</h3>
					<p class="resume-context">Self-employed <span aria-hidden="true">/</span> Bethel, ME</p>
					<ul>
						<li>
							Architected an integration platform connecting Discord, Slack, Microsoft Teams, and
							cloud storage with custom authentication and real-time synchronization.
						</li>
						<li>
							Built production backend services in Rust, Go, C++, and Python, with JavaScript and
							TypeScript frontends.
						</li>
						<li>
							Developed custom SDKs and client libraries for C#, Lua, Kotlin, and JVM environments.
						</li>
						<li>
							Integrated and deployed an 18-billion-parameter LLM with 8-bit quantization and a 26
							GB memory footprint for natural language processing.
						</li>
						<li>
							Built ML classifiers achieving 80%+ accuracy for automated content analysis and
							anomaly detection.
						</li>
						<li>
							Owned architecture, implementation, testing, deployment, and ongoing maintenance.
						</li>
					</ul>
				</article>
				<article class="resume-entry" aria-labelledby="walmart-title">
					<p class="resume-date">
						<time datetime="2024-01">January 2024</time> –
						<time datetime="2024-10">October 2024</time>
					</p>
					<h3 id="walmart-title">Personal Shopper</h3>
					<p class="resume-context">
						Walmart Supercenter #2183 <span aria-hidden="true">/</span> Oxford, ME
					</p>
					<ul>
						<li>
							Managed order fulfillment, including product selection, quality checks, substitutions,
							and customer coordination.
						</li>
						<li>Troubleshot point-of-sale systems and inventory management software.</li>
					</ul>
				</article>
			</div>
		</section>

		<section class="resume-section" id="skills" aria-labelledby="skills-title">
			<header class="resume-section-heading">
				<p class="system-label">02 / Working set</p>
				<h2 id="skills-title">Technical skills.</h2>
			</header>
			<dl class="resume-skills">
				{#each skills as skill}
					<div>
						<dt>{skill.label}</dt>
						<dd>{skill.detail}</dd>
					</div>
				{/each}
			</dl>
		</section>

		<section class="resume-section" id="projects" aria-labelledby="projects-title">
			<header class="resume-section-heading">
				<p class="system-label">03 / Technical proof</p>
				<h2 id="projects-title">Selected projects.</h2>
				<a class="inspection-link" href="/work"
					>Explore the work <span aria-hidden="true">↗</span></a
				>
			</header>
			<div class="resume-entries">
				{#each projects as project}
					<article class="resume-entry">
						<p class="resume-date">{project.stack}</p>
						<h3><a href={project.href}>{project.name} <span aria-hidden="true">↗</span></a></h3>
						<p class="resume-detail">{project.detail}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="resume-section" id="education" aria-labelledby="education-title">
			<header class="resume-section-heading">
				<p class="system-label">04 / Foundations</p>
				<h2 id="education-title">Education.</h2>
			</header>
			<div class="resume-entries">
				<article class="resume-entry" aria-labelledby="it-title">
					<p class="resume-date">
						<time datetime="2021-08">August 2021</time> – <time datetime="2024-06">June 2024</time>
					</p>
					<h3 id="it-title">Information Technology</h3>
					<p class="resume-context">
						Oxford Hills Technical School <span aria-hidden="true">/</span> Oxford, ME
					</p>
					<ul>
						<li>
							Worked on network infrastructure modernization, including fiber deployment and 40 Gb
							switches, alongside system administration.
						</li>
						<li>Completed CCNA 1 &amp; 2 coursework, placing in the top 10% nationally.</li>
						<li>
							Held roles in system administration, network administration, IT support, and as a
							teacher’s assistant.
						</li>
					</ul>
				</article>
				<article class="resume-entry" aria-labelledby="diploma-title">
					<p class="resume-date">
						<time datetime="2020-08">August 2020</time> – <time datetime="2024-06">June 2024</time>
					</p>
					<h3 id="diploma-title">High School Diploma</h3>
					<p class="resume-context">
						Oxford Hills Comprehensive High School <span aria-hidden="true">/</span> South Paris, ME
					</p>
				</article>
			</div>
		</section>

		<section class="resume-section" id="certifications" aria-labelledby="certifications-title">
			<header class="resume-section-heading">
				<p class="system-label">05 / Credentials</p>
				<h2 id="certifications-title">Certifications.</h2>
			</header>
			<ul class="resume-certifications">
				{#each certifications as certification}
					<li>
						<span>{certification.name}</span>{#if certification.status}<span
								class:in-progress={certification.status === 'In Progress'}
								class="certification-status">{certification.status}</span
							>{/if}
					</li>
				{/each}
			</ul>
		</section>
	</div>
</article>

<style>
	.resume-header {
		padding-bottom: 0;
	}
	.resume-role {
		margin: 0 0 1.25rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--signal-bright);
	}
	.resume-contact {
		border-left: 1px solid var(--line);
		padding-left: 1.5rem;
		font-size: 0.88rem;
	}
	.resume-contact > p + p {
		margin-top: 0.6rem;
	}
	.resume-contact address {
		display: grid;
		gap: 0.85rem;
		margin-top: 1.5rem;
		font-style: normal;
		overflow-wrap: anywhere;
	}
	.resume-contact a:hover,
	.resume-entry a:hover,
	.resume-index a:hover {
		color: var(--signal-bright);
	}
	.resume-contact span,
	.resume-entry h3 span {
		color: var(--signal);
	}
	.resume-index {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 2rem;
		margin-top: 3.5rem;
		border-top: 1px solid var(--line);
		padding-top: 1rem;
	}
	.resume-index a,
	.resume-date {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.7rem;
		line-height: 1.7;
		color: var(--ink-soft);
	}
	.resume-index a {
		padding-block: 0.6rem;
	}
	.resume-body {
		padding-top: 3rem;
	}
	.resume-section {
		display: grid;
		grid-template-columns: minmax(0, 0.32fr) minmax(0, 0.68fr);
		gap: clamp(2rem, 5vw, 5rem);
		border-top: 1px solid var(--line);
		padding-block: 2.5rem 3.5rem;
		scroll-margin-top: calc(var(--header-height) + 1.5rem);
	}
	.resume-section-heading h2 {
		margin: 0.9rem 0 1.5rem;
		font-size: clamp(1.8rem, 3.4vw, 3rem);
		font-weight: 560;
		line-height: 1.05;
		letter-spacing: -0.04em;
	}
	.resume-entry + .resume-entry {
		margin-top: 2rem;
		border-top: 1px solid var(--line);
		padding-top: 2rem;
	}
	.resume-entry h3 {
		margin: 0.6rem 0;
		font-size: clamp(1.25rem, 2.3vw, 1.8rem);
		font-weight: 590;
		line-height: 1.25;
		letter-spacing: -0.025em;
	}
	.resume-current {
		border-left: 2px solid var(--signal);
		padding-left: 1.25rem;
	}
	.resume-current-label {
		display: inline-block;
		margin-left: 0.75rem;
		color: var(--signal-bright);
	}
	.resume-context {
		font-size: 0.88rem;
		line-height: 1.7;
		color: var(--ink-soft);
	}
	.resume-context span {
		margin-inline: 0.4rem;
		color: var(--ink-faint);
	}
	.resume-entry ul {
		margin: 1.15rem 0 0;
		padding-left: 1.1rem;
		list-style: disc;
	}
	.resume-entry li,
	.resume-detail,
	.resume-skills dd {
		font-size: 0.95rem;
		line-height: 1.8;
		color: var(--ink-soft);
	}
	.resume-entry li + li {
		margin-top: 0.5rem;
	}
	.resume-entry li::marker {
		color: var(--signal-bright);
	}
	.resume-detail {
		margin-top: 1rem;
	}
	.resume-skills {
		margin: 0;
	}
	.resume-skills > div + div {
		margin-top: 1.25rem;
		border-top: 1px solid var(--line);
		padding-top: 1.25rem;
	}
	.resume-skills dt {
		font-weight: 600;
		font-size: 0.95rem;
	}
	.resume-skills dd {
		margin: 0.5rem 0 0;
	}
	.resume-certifications {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.resume-certifications li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem 1.5rem;
		padding-block: 1rem;
		border-bottom: 1px solid var(--line);
		font-size: 0.95rem;
	}
	.resume-certifications li:first-child {
		padding-top: 0;
	}
	.certification-status {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}
	.in-progress {
		color: var(--signal-bright);
	}
	@media (max-width: 900px) {
		.resume-contact {
			border-left: 0;
			padding-left: 0;
		}
		.resume-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
	@media print {
		:global(body:has(.resume)) {
			background: white;
			color: black;
		}
		:global(body:has(.resume) .site-header),
		:global(body:has(.resume) .site-footer),
		:global(body:has(.resume) .site-backdrop),
		:global(body:has(.resume) .scroll-progress),
		:global(body:has(.resume) .skip-link) {
			display: none;
		}
		.resume {
			--ink: #111;
			--ink-soft: #333;
			--ink-faint: #555;
			--signal: #333;
			--signal-bright: #222;
			--line: #ccc;
		}
		.resume-header,
		.resume-body {
			width: 100%;
			padding: 0;
		}
		.resume-header {
			margin-bottom: 1.5rem;
		}
		.resume :global(.inspection-shell) {
			display: block;
		}
		.resume :global(.inspection-title) {
			font-size: 2.5rem;
			margin: 0.5rem 0;
		}
		.resume :global(.inspection-summary) {
			font-size: 10pt;
			line-height: 1.5;
		}
		.resume-role {
			margin-bottom: 0.5rem;
		}
		.resume-contact {
			margin-top: 1rem;
			border: 0;
			padding: 0;
		}
		.resume-contact address {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 1.5rem;
			margin-top: 0.5rem;
		}
		.resume-index,
		.resume-section-heading > a {
			display: none;
		}
		.resume-section {
			display: block;
			padding-block: 1rem;
		}
		.resume-section-heading {
			break-after: avoid;
		}
		.resume-section-heading h2 {
			font-size: 18pt;
			margin: 0.4rem 0 1rem;
		}
		.resume-entry,
		.resume-skills > div,
		.resume-certifications li {
			break-inside: avoid;
		}
		.resume-entry h3 {
			font-size: 13pt;
		}
		.resume-entry + .resume-entry {
			margin-top: 1rem;
			padding-top: 1rem;
		}
		.resume-entry li,
		.resume-detail,
		.resume-skills dd {
			font-size: 10pt;
			line-height: 1.5;
		}
		.resume-entry ul,
		.resume-detail {
			margin-top: 0.6rem;
		}
		.resume-skills > div + div {
			margin-top: 0.6rem;
			padding-top: 0.6rem;
		}
		.resume-certifications li {
			padding-block: 0.5rem;
			font-size: 10pt;
		}
	}
</style>
