<!-- Footer.svelte -->
<script lang="ts">
	let {
		email,
		social_links = [],
		credit_label = 'Made with love by',
		legal_links = [
			{ label: 'Mentions légales', href: '/mentions-legales' },
			{ label: 'Cookies', href: '/cookies' },
			{ label: 'Politique de confidentialité', href: '/politique-de-confidentialite' }
		],
		wordmark = 'AS ROYALE'
	}: any = $props();

	let wordmarkWrapEl: HTMLElement;

	function handleWordmarkMouseMove(e: MouseEvent) {
		const rect = wordmarkWrapEl.getBoundingClientRect();
		wordmarkWrapEl.style.setProperty('--x', `${e.clientX - rect.left}px`);
		wordmarkWrapEl.style.setProperty('--y', `${e.clientY - rect.top}px`);
	}

	function handleWordmarkMouseLeave() {
		wordmarkWrapEl.style.setProperty('--x', '-9999px');
		wordmarkWrapEl.style.setProperty('--y', '-9999px');
	}
</script>

<footer
	data-header-theme="primary"
	class="grid-section sm-grid-section relative w-full overflow-hidden bg-primary px-5 pt-24 pb-40 sm:px-8 md:px-10 lg:px-12 xl:pt-32 xl:pb-56"
>
	<div
		class="relative z-10 col-span-8 flex flex-col justify-between gap-10 sm:flex-row sm:items-start"
	>
		<div class="flex flex-col gap-4">
			<h2 class="text-title-2xl font-clash text-white">Contacts</h2>
			{#if email}
				<a
					href="mailto:{email}"
					class="font-jakarta inline-flex items-center gap-1 text-secondary underline underline-offset-4 transition-opacity hover:opacity-80"
				>
					{email}
					<span aria-hidden="true">↗</span>
				</a>
			{/if}
		</div>

		<div class="flex flex-col items-start gap-3 sm:items-end">
			<span class="font-jakarta text-sm whitespace-nowrap text-white/50">
				© {new Date().getFullYear()} Tous droits réservés · {credit_label}
				<a
					href="https://unixcreativestudio.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="underline transition-colors hover:text-white"
				>
					Unix
				</a>
			</span>
			<nav class="mt-3 flex flex-wrap justify-end gap-6">
				{#each social_links as link}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="font-jakarta inline-flex items-center gap-1 text-white transition-colors hover:text-secondary"
					>
						{link.label}
						<span aria-hidden="true">↗</span>
					</a>
				{/each}
			</nav>
		</div>
	</div>

	<div class="relative z-10 col-span-8 mt-16 flex flex-wrap justify-end gap-4 sm:mt-20">
		{#each legal_links as link, i}
			<a
				href={link.href}
				class="font-jakarta text-xs whitespace-nowrap text-white/40 transition-colors hover:text-white/70"
			>
				{link.label}
			</a>
			{#if i < legal_links.length - 1}
				<span class="text-xs text-white/20">·</span>
			{/if}
		{/each}
	</div>

	<div
		bind:this={wordmarkWrapEl}
		onmousemove={handleWordmarkMouseMove}
		onmouseleave={handleWordmarkMouseLeave}
		role="presentation"
		class="absolute bottom-0 left-1/2 w-full -translate-x-1/2 text-center"
	>
		<span
			class="pointer-events-none block font-clash text-[16vw] leading-[0.8] font-bold whitespace-nowrap text-white/20 uppercase select-none"
		>
			{wordmark}
		</span>

		<span
			class="wordmark-dots pointer-events-none absolute inset-0 block font-clash text-[16vw] leading-[0.8] font-bold whitespace-nowrap uppercase select-none"
		>
			{wordmark}
		</span>
	</div>
</footer>

<style>
	.wordmark-dots {
		color: transparent;
		background-image: radial-gradient(circle, rgba(244, 180, 0, 0.9) 3px, transparent 3px);
		background-size: 20px 20px;
		background-clip: text;
		-webkit-background-clip: text;
		mask-image: radial-gradient(
			circle 160px at var(--x, -9999px) var(--y, -9999px),
			black,
			transparent 70%
		);
		-webkit-mask-image: radial-gradient(
			circle 160px at var(--x, -9999px) var(--y, -9999px),
			black,
			transparent 70%
		);
	}
</style>
