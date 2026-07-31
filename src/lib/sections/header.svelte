<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components';
	import { page } from '$app/state';

	let { logo, cta_label, cta_href, nav_links = [] }: any = $props();

	let hidden = $state(false);
	let theme = $state<'primary' | 'light'>('primary');
	let mobileMenuOpen = $state(false);
	let lastY = 0;
	let headerEl: HTMLElement;

	let menuLinksVisible = $state(false);

	$effect(() => {
		if (mobileMenuOpen) {
			menuLinksVisible = false;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					menuLinksVisible = true;
				});
			});
		} else {
			menuLinksVisible = false;
		}
	});

	function updateTheme() {
		if (mobileMenuOpen) return;
		const sampleY = (headerEl?.offsetHeight ?? 80) + 10;
		const el = document.elementFromPoint(window.innerWidth / 2, sampleY);
		const themedEl = el?.closest('[data-header-theme]');
		if (themedEl) {
			theme = themedEl.getAttribute('data-header-theme') === 'light' ? 'light' : 'primary';
		}
	}

	function handleNavClick(e: MouseEvent, href: string) {
		mobileMenuOpen = false;

		const hashIndex = href.indexOf('#');
		if (hashIndex === -1) return;
		const id = href.slice(hashIndex + 1);

		if (page.url.pathname !== '/') return; // navigation normale vers /#id, géré à l'arrivée

		const target = document.getElementById(id);
		if (!target) {
			console.warn(`Header: aucun élément avec id="${id}" trouvé pour le lien "${href}"`);
			return;
		}
		e.preventDefault();
		const offset = (headerEl?.offsetHeight ?? 80) + 16;
		const top = target.getBoundingClientRect().top + window.scrollY - offset;
		window.scrollTo({ top, behavior: 'smooth' });
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function preventTouchMove(e: TouchEvent) {
		e.preventDefault();
	}

	// Verrouille le scroll pendant que le menu est ouvert sans jamais toucher
	// à la position de scroll (donc rien à restaurer, pas de saut à la fermeture)
	$effect(() => {
		if (mobileMenuOpen) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
			document.addEventListener('touchmove', preventTouchMove, { passive: false });
		} else {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
			document.removeEventListener('touchmove', preventTouchMove);
		}

		return () => {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
			document.removeEventListener('touchmove', preventTouchMove);
		};
	});

	onMount(() => {
		let ticking = false;

		const handleScroll = () => {
			if (mobileMenuOpen) return;
			if (ticking) return;
			ticking = true;

			requestAnimationFrame(() => {
				const currentY = window.scrollY;

				if (currentY < 80) {
					hidden = false;
				} else if (currentY > lastY + 5) {
					hidden = true;
				} else if (currentY < lastY - 5) {
					hidden = false;
				}

				lastY = currentY;
				updateTheme();
				ticking = false;
			});
		};

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') mobileMenuOpen = false;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('keydown', handleKeydown);
		updateTheme();

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('keydown', handleKeydown);
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
			document.removeEventListener('touchmove', preventTouchMove);
		};
	});
</script>

<header
	bind:this={headerEl}
	class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 {theme === 'light'
		? 'bg-background'
		: 'bg-primary'}"
	class:-translate-y-full={hidden}
>
	<div class="grid-section flex items-center justify-between px-5 py-4 sm:px-8 md:px-10 lg:px-12">
		<a
			href="/"
			class="flex items-center gap-2 xl:col-span-2"
			aria-label="Brussels Summit Academy - Accueil"
		>
			{#if logo}
				<img src={logo} alt="Brussels Summit Academy" class="h-12 w-auto" />
			{/if}
			<span
				class="hidden font-jakarta text-sm font-bold whitespace-nowrap xl:inline-block {theme ===
				'light'
					? 'text-primary'
					: 'text-white'}"
			>
				BRUSSELS SUMMIT ACADEMY
			</span>
		</a>

		<nav class="hidden items-center justify-center gap-8 xl:col-span-4 xl:flex">
			{#each nav_links as link}
				{@const isHash = link.href.startsWith('#')}
				{@const computedHref = isHash && page.url.pathname !== '/' ? `/${link.href}` : link.href}
				<a
					href={computedHref}
					onclick={(e) => handleNavClick(e, computedHref)}
					class="group flex overflow-hidden text-button {theme === 'light'
						? 'text-primary'
						: 'text-white'}"
				>
					{#each link.label.split('') as char, i}
						<span class="relative inline-block h-[1em] overflow-hidden align-top leading-none">
							<span
								class="flex flex-col leading-none transition-transform ease-out group-hover:-translate-y-1/2"
								style="transition-duration: 350ms; transition-delay: {i * 25}ms"
							>
								<span class="block h-[1em] leading-[1em]">{char === ' ' ? '\u00A0' : char}</span>
								<span aria-hidden="true" class="text-secondary block h-[1em] leading-[1em]"
									>{char === ' ' ? '\u00A0' : char}</span
								>
							</span>
						</span>
					{/each}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-4 xl:col-span-2 xl:justify-end">
			{#if cta_label}
				<div class="hidden xl:block">
					<Button href={cta_href} label={cta_label} variant="primary" />
				</div>
			{/if}

			<button
				type="button"
				aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
				aria-expanded={mobileMenuOpen}
				onclick={toggleMobileMenu}
				class="relative z-60 flex h-8 w-8 flex-col items-center justify-center gap-1.25 xl:hidden"
			>
				<span
					class="block h-0.5 w-6 rounded-full transition-all duration-300 {mobileMenuOpen
						? 'translate-y-1.75 rotate-45 bg-white'
						: theme === 'light'
							? 'bg-primary'
							: 'bg-white'}"
				></span>
				<span
					class="block h-0.5 w-6 rounded-full transition-all duration-300 {mobileMenuOpen
						? 'opacity-0'
						: theme === 'light'
							? 'bg-primary'
							: 'bg-white'}"
				></span>
				<span
					class="block h-0.5 w-6 rounded-full transition-all duration-300 {mobileMenuOpen
						? '-translate-y-1.75 -rotate-45 bg-white'
						: theme === 'light'
							? 'bg-primary'
							: 'bg-white'}"
				></span>
			</button>
		</div>
	</div>

	{#if mobileMenuOpen}
		<div
			transition:fade={{ duration: 120 }}
			class="fixed inset-0 z-40 flex flex-col bg-primary xl:hidden"
		>
			<nav class="flex flex-1 flex-col items-center justify-center gap-8 px-5">
				{#each nav_links as link, i}
					{@const isHash = link.href.startsWith('#')}
					{@const computedHref = isHash && page.url.pathname !== '/' ? `/${link.href}` : link.href}
					<a
						href={computedHref}
						onclick={(e) => handleNavClick(e, computedHref)}
						style="transition-delay: {150 + i * 100}ms"
						class="font-clash text-3xl uppercase text-white transition-all duration-500 ease-out sm:text-3xl lg:text-5xl {menuLinksVisible
							? 'translate-y-0 opacity-100'
							: 'translate-y-3 opacity-0'}"
					>
						{link.label}
					</a>
				{/each}

				{#if cta_label}
					<div
						style="transition-delay: {150 + nav_links.length * 100}ms"
						class="mt-4 transition-all duration-500 ease-out {menuLinksVisible
							? 'translate-y-0 opacity-100'
							: 'translate-y-3 opacity-0'}"
					>
						<Button
							href={cta_href}
							label={cta_label}
							variant="primary"
							class="!px-9 !py-4 !text-lg"
							onclick={() => (mobileMenuOpen = false)}
						/>
					</div>
				{/if}
			</nav>
		</div>
	{/if}
</header>
