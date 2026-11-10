<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();
	let menuOpen = $state(false);
	let sidebarOpen = $state(true);
	$effect(() => {
		// Tablette : menu réduit en icônes par défaut
		if (typeof window !== 'undefined' && window.innerWidth < 1024) sidebarOpen = false;
	});
	let mobileNavOpen = $state(false);
	let initial = $derived(data.staffEmail?.[0]?.toUpperCase() ?? '?');

	let scrollY = 0;

	$effect(() => {
		if (mobileNavOpen) {
			scrollY = window.scrollY;
			document.body.style.position = 'fixed';
			document.body.style.top = `-${scrollY}px`;
			document.body.style.left = '0';
			document.body.style.right = '0';
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.position = '';
			document.body.style.top = '';
			document.body.style.left = '';
			document.body.style.right = '';
			document.body.style.overflow = '';
			window.scrollTo(0, scrollY);
		}

		return () => {
			document.body.style.position = '';
			document.body.style.top = '';
			document.body.style.left = '';
			document.body.style.right = '';
			document.body.style.overflow = '';
		};
	});

	let currentView = $derived(page.url.searchParams.get('view') ?? 'overview');

	const NAV = [
		{
			title: 'Pilotage',
			items: [
				{ id: 'overview', label: "Vue d'ensemble", href: '/admin', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' }
			]
		},
		{
			title: 'Candidatures',
			items: [
				{ id: 'talent_days', label: 'Talent Day', href: '/admin?view=talent_days', icon: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z' },
				{ id: 'academie', label: 'Faire un essai', href: '/admin?view=academie', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8' }
			]
		},
		{
			title: 'Suivi',
			items: [
				{ id: 'joueurs', label: 'Joueurs', href: '/admin/joueurs', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
				{ id: 'presences', label: 'Présences', href: '/admin?view=presences', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
				{ id: 'paiements', label: 'Paiements', href: '/admin?view=paiements', icon: 'M2 5h20v14H2zM2 10h20' },
				{ id: 'stats', label: 'Stats joueurs', href: '/admin?view=stats', icon: 'M18 20V10M12 20V4M6 20v-6' }
			]
		}
	];

	let currentItem = $derived(
		NAV.flatMap((g) => g.items).find((i) => isActive(i.id)) ?? NAV[0].items[0]
	);
	let todayLabel = new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

	function isActive(view: string) {
		if (view === 'joueurs') return page.url.pathname.startsWith('/admin/joueurs');
		if (page.url.pathname.startsWith('/admin/joueurs')) return false;
		return currentView === view;
	}

</script>

<svelte:window onclick={() => (menuOpen = false)} />

{#snippet navLinks(compact: boolean)}
	<div class="mb-8 flex items-center gap-3 {compact ? 'justify-center' : 'px-3'}">
		<img src="/assets/images/logo.svg" alt="Brussels Summit Academy" class="h-10 w-10 shrink-0 rounded-xl object-contain" />
		{#if !compact}
			<div class="min-w-0 leading-tight">
				<p class="font-clash truncate text-sm text-white">Brussels Summit</p>
				<p class="truncate text-[11px] text-white/40">Espace staff</p>
			</div>
		{/if}
	</div>

	<nav class="flex flex-1 flex-col gap-6 overflow-y-auto">
		{#each NAV as group}
			<div>
				{#if compact}
					<div class="mx-3 mb-2 h-px bg-white/10"></div>
				{:else}
					<p class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">{group.title}</p>
				{/if}
				<div class="flex flex-col gap-0.5">
					{#each group.items as item}
						{@const active = isActive(item.id)}
						<a
							href={item.href}
							onclick={() => (mobileNavOpen = false)}
							aria-current={active ? 'page' : undefined}
							title={compact ? item.label : undefined}
							class="group relative flex items-center rounded-xl py-2.5 text-sm transition-colors {compact ? 'justify-center' : 'gap-3 px-3'} {active
								? 'bg-white/10 font-medium text-white'
								: 'text-white/50 hover:bg-white/5 hover:text-white'}"
						>
							{#if active}<span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-secondary"></span>{/if}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 {active ? 'text-secondary' : ''}">
								<path d={item.icon} />
							</svg>
							{#if !compact}<span class="truncate">{item.label}</span>{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>

	<div class="mt-4 border-t border-white/10 pt-4">
		<div class="mb-2 flex items-center gap-3 {compact ? 'justify-center' : 'px-3'}">
			<span class="font-clash flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-dark">{initial}</span>
			{#if !compact}<p class="min-w-0 truncate text-xs text-white/60">{data.staffEmail}</p>{/if}
		</div>
		<form method="POST" action="?/logout">
			<button type="submit" title={compact ? 'Se déconnecter' : undefined} class="flex w-full items-center rounded-xl py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white {compact ? 'justify-center' : 'gap-3 px-3'}">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
				</svg>
				{#if !compact}<span class="truncate">Se déconnecter</span>{/if}
			</button>
		</form>
	</div>
{/snippet}

<div class="flex min-h-screen w-full gap-4 bg-[#f4f5f7] p-3 sm:p-4 print:block print:bg-white print:p-0">
	<!-- Sidebar desktop (réductible en rail d'icônes) -->
	<div class="hidden shrink-0 transition-[width] duration-300 sm:block {sidebarOpen ? 'w-60' : 'w-[76px]'}">
		<aside
			class="sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-dark py-6 shadow-sm transition-[padding] duration-300 {sidebarOpen ? 'px-3' : 'px-2.5'} print:hidden"
		>
			{@render navLinks(!sidebarOpen)}
		</aside>
	</div>

	<!-- Tiroir mobile -->
	{#if mobileNavOpen}
		<button type="button" onclick={() => (mobileNavOpen = false)} class="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-label="Fermer le menu"></button>
		<aside class="fixed inset-y-3 left-3 z-50 flex w-64 flex-col rounded-3xl bg-dark px-3 py-6 shadow-lg sm:hidden">
			<button type="button" onclick={() => (mobileNavOpen = false)} class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fermer le menu">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
			</button>
			{@render navLinks(false)}
		</aside>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<header class="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:px-6 print:hidden">
			<div class="flex min-w-0 items-center gap-3">
				<button type="button" onclick={() => (mobileNavOpen = true)} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dark-accent hover:bg-[#f4f5f7] sm:hidden" aria-label="Ouvrir le menu">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
				</button>
				<button
					type="button"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dark-accent/10 text-dark-accent transition-colors hover:bg-[#f4f5f7] hover:text-dark sm:flex"
					aria-label={sidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
					title={sidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="4" width="18" height="16" rx="3" />
						<path d="M9 4v16" />
					</svg>
				</button>
				<div class="min-w-0 leading-tight">
					<p class="truncate text-[11px] text-dark-accent">Espace staff <span class="mx-1">/</span> <span class="capitalize">{todayLabel}</span></p>
					<p class="font-clash truncate text-xl text-dark sm:text-3xl">{currentItem.label}</p>
				</div>
			</div>

			<div class="relative">
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						menuOpen = !menuOpen;
					}}
					class="flex items-center gap-2 rounded-full border border-dark-accent/10 py-1 pl-1 pr-3 transition-colors hover:bg-[#f4f5f7]"
				>
					<span class="font-clash flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs text-dark">{initial}</span>
					<span class="hidden max-w-40 truncate text-xs text-dark-accent sm:block">{data.staffEmail}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-dark-accent"><polyline points="6 9 12 15 18 9" /></svg>
				</button>

				{#if menuOpen}
					<div class="absolute right-0 top-12 z-30 w-60 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-2 shadow-lg ring-1 ring-dark-accent/10">
						<p class="truncate px-3 py-2 text-xs text-dark-accent">{data.staffEmail}</p>
						<form method="POST" action="?/logout">
							<button type="submit" class="w-full rounded-xl px-3 py-2 text-left text-sm text-dark hover:bg-[#f4f5f7]">Se déconnecter</button>
						</form>
					</div>
				{/if}
			</div>
		</header>

		<main class="flex-1 pb-4 print:px-0 print:py-0">
			{@render children()}
		</main>
	</div>
</div>
