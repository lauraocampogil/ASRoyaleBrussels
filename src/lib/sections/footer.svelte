<!-- Footer.svelte -->
<script lang="ts">
	let {
		email,
		social_links = [],
		credit = 'Made with love by Unix',
		legal_links = [
			{ label: 'Mentions légales', href: '/mentions-legales' },
			{ label: 'Cookies', href: '/cookies' },
			{ label: 'Politique de confidentialité', href: '/politique-de-confidentialite' }
		],
		wordmark = 'AS ROYALE'
	}: any = $props();
</script>

<footer
	class="relative w-full overflow-hidden bg-primary px-5 pt-24 pb-40 sm:px-8 md:px-10 lg:px-12 xl:pt-32 xl:pb-56"
>
	<div
		class="relative z-10 flex flex-col justify-between gap-10 sm:flex-row sm:items-start 3xl:container 3xl:mx-auto"
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
				© {new Date().getFullYear()} Tous droits réservés · {credit}
			</span>
			<nav class="mt-3 flex flex-wrap gap-6">
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

	<div
		class="relative z-10 mt-16 flex flex-wrap justify-center gap-4 sm:mt-20 sm:justify-end 3xl:container 3xl:mx-auto"
	>
		{#each legal_links as link, i}
			<a
				href={link.href}
				class="font-jakarta text-xs text-white/40 transition-colors hover:text-white/70"
			>
				{link.label}
			</a>
			{#if i < legal_links.length - 1}
				<span class="text-xs text-white/20">·</span>
			{/if}
		{/each}
	</div>

	<div
		class="pointer-events-none absolute bottom-0 left-1/2 w-full -translate-x-1/2 text-center font-clash text-[16vw] leading-[0.8] font-bold whitespace-nowrap text-white/20 uppercase select-none"
	>
		{wordmark}
	</div>
</footer>
