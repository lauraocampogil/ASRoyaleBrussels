<script lang="ts">
	import { getStoredConsent, storeConsent, loadGoogleAnalytics } from '$lib/analytics';

	let visible = $state(false);

	$effect(() => {
		const existing = getStoredConsent();
		if (existing === 'accepted') {
			loadGoogleAnalytics();
		} else if (existing === null) {
			const t = setTimeout(() => (visible = true), 1000);
			return () => clearTimeout(t);
		}
	});

	function accept() {
		storeConsent('accepted');
		loadGoogleAnalytics();
		visible = false;
	}

	function decline() {
		storeConsent('declined');
		visible = false;
	}
</script>

{#if visible}
	<div
		class="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-999 xl:right-6 xl:bottom-6 xl:left-auto xl:max-w-md"
	>
		<div class="rounded-2xl bg-dark p-5 shadow-2xl">
			<p class="mb-1 text-sm font-bold text-white">Ce site utilise des cookies</p>
			<p class="mb-4 text-sm leading-relaxed text-white/70">
				Nous utilisons des cookies analytiques (Google Analytics) pour améliorer votre expérience.
				<a href="/cookies" class="text-secondary underline underline-offset-2">En savoir plus</a>
			</p>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={decline}
					class="min-h-11 flex-1 cursor-pointer rounded-full border border-white/20 text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
				>
					Refuser
				</button>
				<button
					type="button"
					onclick={accept}
					class="min-h-11 flex-1 cursor-pointer rounded-full bg-secondary text-sm font-semibold text-dark transition-opacity hover:opacity-90"
				>
					Accepter
				</button>
			</div>
		</div>
	</div>
{/if}
