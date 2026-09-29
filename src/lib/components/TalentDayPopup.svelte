<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	let {
		active = false,
		date = '',
		title = '',
		message = '',
		ctaLabel = "Je m'inscris",
		ctaHref = '/inscription',
		delay = 4000
	}: {
		active?: boolean;
		date?: string;
		title?: string;
		message?: string;
		ctaLabel?: string;
		ctaHref?: string;
		delay?: number;
	} = $props();

	let visible = $state(false);

	$effect(() => {
		if (!active) return;
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('talentDayPopupClosed')) {
			return;
		}

		const timer = setTimeout(() => {
			visible = true;
		}, delay);

		return () => clearTimeout(timer);
	});

	function preventScroll(e: Event) {
		e.preventDefault();
	}

	$effect(() => {
		if (visible) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
			document.addEventListener('touchmove', preventScroll, { passive: false });
			document.addEventListener('wheel', preventScroll, { passive: false });
		} else {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
			document.removeEventListener('touchmove', preventScroll);
			document.removeEventListener('wheel', preventScroll);
		}

		return () => {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
			document.removeEventListener('touchmove', preventScroll);
			document.removeEventListener('wheel', preventScroll);
		};
	});

	function close() {
		visible = false;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('talentDayPopupClosed', '1');
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') close();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (visible && e.key === 'Escape') close();
	}}
/>

{#if visible}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-100 flex items-center justify-center bg-dark/60 px-5"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="button"
		tabindex="0"
		aria-label="Fermer le pop-up"
	>
		<div
			transition:fly={{ y: 20, duration: 300 }}
			class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-6 text-center shadow-xl sm:p-8"
		>
			<button
				type="button"
				onclick={close}
				aria-label="Fermer"
				class="absolute top-4 right-4 text-dark/40 transition-colors hover:text-dark"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z"
					/>
				</svg>
			</button>

			{#if date}
				<p class="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">{date}</p>
			{/if}
			{#if title}
				<h3 class="mb-3 font-clash text-title-sm uppercase text-primary sm:text-title-md">
					{title}
				</h3>
			{/if}
			{#if message}
				<p class="mb-6 text-sm text-dark/70 sm:text-base">{message}</p>
			{/if}

			<a
				href={ctaHref}
				onclick={close}
				class="text-button inline-flex items-center justify-center rounded bg-secondary px-6 py-3 text-dark transition-opacity hover:opacity-90"
			>
				{ctaLabel}
			</a>
		</div>
	</div>
{/if}
