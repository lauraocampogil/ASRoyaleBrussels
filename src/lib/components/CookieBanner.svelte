<script lang="ts">
	import { getStoredConsent, storeConsent, loadGoogleAnalytics } from '$lib/analytics';

	let visible = $state(false);

	$effect(() => {
		const existing = getStoredConsent();
		if (existing === 'accepted') {
			loadGoogleAnalytics();
		} else if (existing === null) {
			visible = true;
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
		class="fixed inset-x-0 bottom-0 z-50 border-t border-dark/10 bg-dark px-5 py-5 shadow-lg sm:px-8"
	>
		<div
			class="mx-auto flex max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-white/80">
				On utilise des cookies pour mesurer l'audience du site et améliorer ton expérience. Tu peux
				accepter ou refuser à tout moment.
				<a href="/cookies" class="underline hover:text-secondary">En savoir plus</a>
			</p>
			<div class="flex shrink-0 gap-3">
				<button
					type="button"
					onclick={decline}
					class="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition-colors hover:bg-white/10"
				>
					Refuser
				</button>
				<button
					type="button"
					onclick={accept}
					class="rounded-full bg-secondary px-5 py-2 text-sm font-medium text-dark transition-colors hover:brightness-95"
				>
					Accepter
				</button>
			</div>
		</div>
	</div>
{/if}
