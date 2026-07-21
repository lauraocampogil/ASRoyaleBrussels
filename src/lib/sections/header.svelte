<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components';

	let { logo, cta_label, cta_href, nav_links = [] }: any = $props();

	let hidden = $state(false);
	let theme = $state<'primary' | 'light'>('primary');
	let lastY = 0;
	let headerEl: HTMLElement;

	function updateTheme() {
		const sampleY = (headerEl?.offsetHeight ?? 80) + 10;
		const el = document.elementFromPoint(window.innerWidth / 2, sampleY);
		const themedEl = el?.closest('[data-header-theme]');
		if (themedEl) {
			theme = themedEl.getAttribute('data-header-theme') === 'light' ? 'light' : 'primary';
		}
	}

	function handleNavClick(e: MouseEvent, href: string) {
		const hashIndex = href.indexOf('#');
		if (hashIndex === -1) return; // pas une ancre, comportement par défaut
		const id = href.slice(hashIndex + 1);
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

	onMount(() => {
		const handleScroll = () => {
			const currentY = window.scrollY;
			if (currentY < 80) {
				hidden = false;
			} else if (currentY > lastY) {
				hidden = true;
			} else {
				hidden = false;
			}
			lastY = currentY;

			updateTheme();
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		updateTheme();

		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<header
	bind:this={headerEl}
	class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 {theme === 'light'
		? 'bg-background'
		: 'bg-primary'}"
	class:-translate-y-full={hidden}
>
	<div class="grid-section sm-grid-section items-center py-4 3xl:container 3xl:mx-auto">
		<a
			href="/"
			class="col-span-2 flex items-center gap-2"
			aria-label="AS Royale Brussels - Accueil"
		>
			{#if logo}
				<img src={logo} alt="AS Royale Brussels" class="h-15 w-auto" />
			{/if}
			<span
				class="font-jakarta text-sm font-bold whitespace-nowrap {theme === 'light'
					? 'text-primary'
					: 'text-white'}"
			>
				AS ROYALE BRUSSELS
			</span>
		</a>

		<nav class="col-span-4 hidden items-center justify-center gap-8 sm:flex">
			{#each nav_links as link}
				<a
					href={link.href}
					onclick={(e) => handleNavClick(e, link.href)}
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

		<div class="col-span-2 flex justify-end">
			{#if cta_label}
				<Button href={cta_href} label={cta_label} variant="primary" />
			{/if}
		</div>
	</div>
</header>
