<script lang="ts">
	import { onMount } from 'svelte';

	// Navigateur intégré d'Instagram, TikTok, Facebook, Snapchat… : les formulaires (envoi de photos,
	// cartes d'identité) y fonctionnent mal. On invite à ouvrir la page dans Safari / Chrome.
	let inApp = $state(false);
	let android = $state(false);
	let name = $state('');
	let copied = $state(false);
	let dismissed = $state(false);
	let href = $state('');

	onMount(() => {
		const ua = navigator.userAgent || '';
		const found =
			/Instagram/i.test(ua)
				? 'Instagram'
				: /musical_ly|TikTok|Bytedance|BytedanceWebview/i.test(ua)
					? 'TikTok'
					: /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)
						? 'Facebook'
						: /Snapchat/i.test(ua)
							? 'Snapchat'
							: /; wv\)|\bLine\//i.test(ua)
								? 'ce navigateur'
								: '';
		inApp = !!found;
		name = found;
		android = /Android/i.test(ua);
		href = window.location.href;
	});

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(href);
			copied = true;
			setTimeout(() => (copied = false), 3000);
		} catch {
			window.prompt('Copie ce lien puis colle-le dans Safari ou Chrome :', href);
		}
	}

	let intentUrl = $derived(
		href
			? `intent://${href.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
			: ''
	);
</script>

{#if inApp && !dismissed}
	<div class="mb-8 rounded-lg border border-secondary bg-secondary/20 p-4 text-sm text-dark" role="alert">
		<p class="font-semibold">Pour que le formulaire fonctionne bien, ouvre cette page dans ton navigateur.</p>
		<p class="mt-1 text-dark/80">
			Dans {name || 'ce navigateur'}, l'envoi de photos et de documents peut bloquer. Ouvre la page dans
			{android ? 'Chrome' : 'Safari ou Chrome'} :
			touche les <strong>trois points « ⋯ »</strong> (ou l'icône de partage) puis
			<strong>« Ouvrir dans le navigateur »</strong>.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			{#if android}
				<a href={intentUrl} class="rounded bg-dark px-4 py-2 font-medium text-white">Ouvrir dans Chrome</a>
			{/if}
			<button type="button" onclick={copyLink} class="rounded bg-white px-4 py-2 font-medium text-dark ring-1 ring-dark/20">
				{copied ? 'Lien copié ✓' : 'Copier le lien'}
			</button>
			<button type="button" onclick={() => (dismissed = true)} class="px-2 py-2 text-dark/60 underline">Continuer ici</button>
		</div>
	</div>
{/if}
