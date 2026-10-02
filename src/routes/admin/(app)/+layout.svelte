<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data, children } = $props();
	let menuOpen = $state(false);
	let inscriptionOpen = $state(false);
	let sidebarOpen = $state(true);
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

	function isActive(view: string) {
		return currentView === view;
	}

	function goToInscription() {
		if (currentView !== 'talent_days' && currentView !== 'academie') {
			goto('/admin?view=talent_days', { keepFocus: true, noScroll: true, replaceState: true });
		}
	}
</script>

<svelte:window
	onclick={() => {
		menuOpen = false;
		inscriptionOpen = false;
	}}
/>

{#snippet navLinks()}
	<div class="mb-4 flex items-center gap-3 px-2">
		<img
			src="/assets/images/logo.svg"
			alt="Brussels Summit Academy"
			class="h-10 w-10 shrink-0 rounded-xl object-contain"
		/>
		<span class="font-clash truncate text-sm text-white">Brussels Summit</span>
	</div>

	<nav class="flex flex-1 flex-col gap-1">
		<a
			href="/admin"
			onclick={() => (mobileNavOpen = false)}
			class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors {isActive(
				'overview'
			)
				? 'bg-white text-dark'
				: 'text-white/50 hover:bg-white/10 hover:text-white'}"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="shrink-0"
			>
				<rect x="3" y="3" width="7" height="7" rx="1.5" />
				<rect x="14" y="3" width="7" height="7" rx="1.5" />
				<rect x="3" y="14" width="7" height="7" rx="1.5" />
				<rect x="14" y="14" width="7" height="7" rx="1.5" />
			</svg>
			<span class="truncate">Overview</span>
		</a>

		<div class="relative">
			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation();
					inscriptionOpen = !inscriptionOpen;
					goToInscription();
				}}
				class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors {isActive(
					'talent_days'
				) || isActive('academie')
					? 'bg-white text-dark'
					: 'text-white/50 hover:bg-white/10 hover:text-white'}"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="shrink-0"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="8" y1="13" x2="16" y2="13" />
					<line x1="8" y1="17" x2="16" y2="17" />
				</svg>
				<span class="truncate">Inscription</span>
			</button>

			{#if inscriptionOpen}
				<div
					onclick={(e) => e.stopPropagation()}
					class="relative z-20 mt-1 w-full rounded-xl bg-white p-2 shadow-lg sm:absolute sm:left-0 sm:top-full"
				>
					<a
						href="/admin?view=talent_days"
						onclick={() => (mobileNavOpen = false)}
						class="block rounded-lg px-3 py-2 text-sm text-dark transition-colors hover:bg-[#f4f5f7]"
					>
						Talent Day
					</a>
					<a
						href="/admin?view=academie"
						onclick={() => (mobileNavOpen = false)}
						class="block rounded-lg px-3 py-2 text-sm text-dark transition-colors hover:bg-[#f4f5f7]"
					>
						Rejoindre l'académie
					</a>
				</div>
			{/if}
		</div>

		<a
			href="/admin?view=inscrits"
			onclick={() => (mobileNavOpen = false)}
			class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors {isActive(
				'inscrits'
			)
				? 'bg-white text-dark'
				: 'text-white/50 hover:bg-white/10 hover:text-white'}"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="shrink-0"
			>
				<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
			<span class="truncate">Joueurs académie</span>
		</a>
	</nav>

	<form method="POST" action="?/logout">
		<button
			type="submit"
			class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="shrink-0"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</svg>
			<span class="truncate">Se déconnecter</span>
		</button>
	</form>
{/snippet}

<div
	class="flex min-h-screen w-full gap-4 bg-[#f4f5f7] p-3 sm:p-4 print:block print:bg-white print:p-0"
>
	<!-- Sidebar desktop -->
	<div
		class="relative hidden shrink-0 transition-all duration-200 sm:block {sidebarOpen
			? 'w-56'
			: 'w-3'}"
	>
		<aside
			class="sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-dark px-3 py-6 shadow-sm transition-all duration-200 {sidebarOpen
				? 'w-56 opacity-100'
				: 'w-0 opacity-0'} print:hidden"
		>
			{@render navLinks()}
		</aside>

		<button
			type="button"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			class="absolute -right-3 top-10 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-dark text-white shadow-sm ring-2 ring-[#f4f5f7] print:hidden"
			aria-label={sidebarOpen ? 'Réduire le menu' : 'Afficher le menu'}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
			>
				{#if sidebarOpen}
					<polyline points="15 18 9 12 15 6" />
				{:else}
					<polyline points="9 18 15 12 9 6" />
				{/if}
			</svg>
		</button>
	</div>

	<!-- Tiroir mobile -->
	{#if mobileNavOpen}
		<button
			type="button"
			onclick={() => (mobileNavOpen = false)}
			class="fixed inset-0 z-40 bg-black/40 sm:hidden"
			aria-label="Fermer le menu"
		></button>
		<aside
			class="fixed inset-y-3 left-3 z-50 flex w-64 flex-col rounded-2xl bg-dark px-3 py-6 shadow-lg sm:hidden"
		>
			<button
				type="button"
				onclick={() => (mobileNavOpen = false)}
				class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Fermer le menu"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
			{@render navLinks()}
		</aside>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<header
			class="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm sm:px-5 print:hidden"
		>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (mobileNavOpen = true)}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-dark-accent transition-colors hover:bg-[#f4f5f7] sm:hidden"
					aria-label="Ouvrir le menu"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="4" y1="7" x2="20" y2="7" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="17" x2="20" y2="17" />
					</svg>
				</button>
				<span class="font-clash text-sm text-dark sm:text-lg">Dashboard — Staff</span>
			</div>

			<div class="relative">
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						menuOpen = !menuOpen;
					}}
					class="flex items-center gap-2 rounded-full border border-dark-accent/10 py-1 pl-1 pr-3 transition-colors hover:bg-dark-accent/5"
				>
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-clash text-xs text-dark"
					>
						{initial}
					</span>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="text-dark-accent"
					>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>

				{#if menuOpen}
					<div
						class="absolute right-0 top-12 z-10 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 shadow-lg"
					>
						<p class="truncate text-sm text-dark-accent">{data.staffEmail}</p>
					</div>
				{/if}
			</div>
		</header>

		<main class="flex-1 pb-4 print:px-0 print:py-0">
			{@render children()}
		</main>
	</div>
</div>
