<script lang="ts">
	import { heroPinned } from '$lib/stores/heroPinned';
	import { Button } from '$lib/components';

	let { logo, cta_label, cta_href, nav_links = [] }: any = $props();

	let visible = $state(true);
	let lastScrollY = $state(0);
	let insideHero = $state(false);

	heroPinned.subscribe((v) => (insideHero = v));

	function handleScroll() {
		const currentScrollY = window.scrollY;

		if (currentScrollY < 50) {
			visible = true;
		} else if (currentScrollY > lastScrollY) {
			visible = false;
		} else {
			visible = true;
		}

		lastScrollY = currentScrollY;
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class="fixed top-0 left-0 z-50 w-full bg-primary transition-transform duration-300 {visible &&
	!insideHero
		? 'translate-y-0'
		: '-translate-y-full'}"
>
	<div class="grid-section sm-grid-section items-center py-4 3xl:container 3xl:mx-auto">
		<a
			href="/"
			onclick={(e) => {
				e.preventDefault();
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}}
			class="col-span-2 flex items-center gap-2"
		>
			{#if logo}
				<img src={logo} alt="AS Royale Brussels" class="h-15 w-auto" />
			{/if}
			<span class="font-clash text-sm font-bold whitespace-nowrap text-white"
				>AS ROYALE BRUSSELS</span
			>
		</a>

		<nav class="col-span-4 hidden items-center justify-center gap-8 sm:flex">
			{#each nav_links as link}
				<a href={link.href} class="text-button text-white transition-colors hover:text-secondary">
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="col-span-2 flex justify-end">
			{#if cta_label}
				<Button href={cta_href} label={cta_label} variant="primary" />
			{/if}
		</div>
	</div>
</header>
