<script lang="ts">
	import { slide } from 'svelte/transition';
	import { heroPinned } from '$lib/stores/heroPinned';

	let { logo, cta_label, cta_href, nav_links = [] }: any = $props();

	let visible = $state(true);
	let lastScrollY = $state(0);
	let menuOpen = $state(false);
	let insideHero = $state(false);

	heroPinned.subscribe((v) => (insideHero = v));

	function handleScroll() {
		const currentScrollY = window.scrollY;
		if (currentScrollY < 50) {
			visible = true;
		} else if (currentScrollY > lastScrollY) {
			visible = false;
			menuOpen = false;
		} else {
			visible = true;
		}
		lastScrollY = currentScrollY;
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class="fixed top-0 left-0 z-50 w-full px-4 pt-4 transition-transform duration-300 {visible &&
	!insideHero
		? 'translate-y-0'
		: '-translate-y-full'}"
>
	<div class="mx-auto w-full max-w-170.25 rounded bg-background shadow-sm">
		<div class="flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				{#if logo}
					<img src={logo} alt="AS Royale Brussels" class="h-9 w-auto" />
				{/if}
			</div>

			<div class="flex items-center gap-3">
				{#if cta_label}
					<a
						href={cta_href}
						class="text-button rounded bg-secondary px-5 py-2.5 text-dark transition-opacity hover:opacity-90"
					>
						{cta_label}
					</a>
				{/if}

				<button
					type="button"
					onclick={() => (menuOpen = !menuOpen)}
					aria-expanded={menuOpen}
					class="text-button flex items-center gap-2 rounded border border-primary px-5 py-2.5 text-primary transition-colors hover:bg-primary hover:text-white"
				>
					Menu
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
						<path
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 6h18M3 12h18M3 18h18"
						/>
					</svg>
				</button>
			</div>
		</div>

		{#if menuOpen}
			<nav
				transition:slide={{ duration: 250 }}
				class="flex flex-col gap-4 border-t border-dark-accent/20 px-4 py-6"
			>
				{#each nav_links as link}
					<a
						href={link.href}
						onclick={() => (menuOpen = false)}
						class="text-title-sm text-dark transition-colors hover:text-primary"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
</header>
