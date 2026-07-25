<svelte:head>
	<title>Politique de Cookies</title>
	<meta name="description" content="Politique de cookies de Brussels Summit Academy." />
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-background px-5 sm:px-8 md:px-10 lg:px-12 py-16 xl:px-20 xl:py-24">
	<div class="mx-auto w-full" style="max-width: 48rem;">
		<a
			href="/"
			class="mb-8 inline-flex items-center gap-2 text-sm text-dark/50 transition-colors hover:text-primary"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path
					d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
				/>
			</svg>
			Retour
		</a>

		<h1 class="mb-2 text-mobile-title-2xl text-dark xl:text-title-2xl">Politique de Cookies</h1>
		<p class="mb-10 text-sm text-dark/40">Dernière mise à jour : Juillet 2026</p>

		<div class="flex flex-col gap-8 text-dark">
			<section class="flex flex-col gap-3">
				<h2 class="text-mobile-title-lg font-medium text-dark">Qu'est-ce qu'un cookie ?</h2>
				<p class="text-mobile-body leading-relaxed">
					Un cookie est un petit fichier texte déposé sur votre appareil lorsque vous visitez un
					site web. Il permet au site de mémoriser vos actions et préférences pendant une durée
					déterminée.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-mobile-title-lg font-medium text-dark">Cookies utilisés sur ce site</h2>

				<div class="flex flex-col gap-2 rounded-2xl bg-primary-dark/20 p-5">
					<div class="flex items-center justify-between">
						<h3 class="font-medium text-dark">Cookies nécessaires</h3>
						<span class="rounded-full bg-dark px-3 py-1 text-xs font-semibold text-white"
							>Toujours actifs</span
						>
					</div>
					<p class="text-mobile-body text-dark/70">
						Indispensables au fonctionnement du site. Ne peuvent pas être désactivés.
					</p>
					<ul class="flex flex-col gap-1 pl-4">
						{#each ['Sécurité et fonctionnement général du site', 'Mémorisation de votre choix concernant les cookies (cookie-consent)'] as item}
							<li class="flex items-start gap-2 text-sm text-dark/60">
								<span class="mt-0.5 text-primary">•</span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="flex flex-col gap-2 rounded-2xl border border-dark/10 p-5">
					<div class="flex items-center justify-between">
						<h3 class="font-medium text-dark">Cookies analytiques (Google Analytics)</h3>
						<span
							class="rounded-full border border-dark/20 px-3 py-1 text-xs font-semibold text-dark"
							>Sur consentement</span
						>
					</div>
					<p class="text-mobile-body text-dark/70">
						Ne sont déposés que si vous cliquez sur "Accepter" dans le bandeau de cookies. Nous
						permettent de mesurer la fréquentation du site (pages visitées, provenance des
						visiteurs).
					</p>
					<ul class="flex flex-col gap-1 pl-4">
						{#each ["_ga, _ga_* — identification de session, conservés jusqu'à 2 ans (Google)", '_gid — distinction des visiteurs, 24h'] as item}
							<li class="flex items-start gap-2 text-sm text-dark/60">
								<span class="mt-0.5 text-primary">•</span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="flex flex-col gap-2 rounded-2xl border border-dark/10 p-5">
					<div class="flex items-center justify-between">
						<h3 class="font-medium text-dark">Plausible Analytics</h3>
						<span
							class="rounded-full border border-dark/20 px-3 py-1 text-xs font-semibold text-dark"
							>Aucun cookie</span
						>
					</div>
					<p class="text-mobile-body text-dark/70">
						Outil de mesure d'audience respectueux de la vie privée, qui ne dépose aucun cookie et
						ne collecte aucune donnée personnelle identifiable. Fonctionne sans nécessiter votre
						consentement.
					</p>
				</div>

				<div class="flex flex-col gap-2 rounded-2xl border border-dark/10 p-5">
					<div class="flex items-center justify-between">
						<h3 class="font-medium text-dark">Google Search Console</h3>
						<span
							class="rounded-full border border-dark/20 px-3 py-1 text-xs font-semibold text-dark"
							>Aucun cookie</span
						>
					</div>
					<p class="text-mobile-body text-dark/70">
						Utilisé uniquement pour vérifier la propriété du site auprès de Google et suivre son
						référencement. Ne dépose aucun cookie et ne collecte aucune donnée sur les visiteurs.
					</p>
				</div>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-mobile-title-lg font-medium text-dark">Gérer vos préférences</h2>
				<p class="text-mobile-body leading-relaxed">
					Votre choix concernant Google Analytics est mémorisé sur votre appareil. Pour le modifier,
					effacez les données de navigation de ce site dans votre navigateur — le bandeau de
					consentement réapparaîtra à votre prochaine visite. Vous pouvez aussi configurer votre
					navigateur pour bloquer les cookies :
				</p>
				<ul class="flex flex-col gap-1 pl-4">
					{#each [{ label: 'Google Chrome', url: 'https://support.google.com/chrome/answer/95647' }, { label: 'Mozilla Firefox', url: 'https://support.mozilla.org/fr/kb/activer-desactiver-cookies' }, { label: 'Safari', url: 'https://support.apple.com/fr-fr/guide/safari/sfri11471/mac' }, { label: 'Microsoft Edge', url: 'https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09' }] as browser}
						<li class="flex items-start gap-2 text-mobile-body">
							<span class="mt-1 text-primary">•</span>
							<a
								href={browser.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary underline">{browser.label}</a
							>
						</li>
					{/each}
				</ul>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-mobile-title-lg font-medium text-dark">Contact</h2>
				<p class="text-mobile-body leading-relaxed">
					Pour toute question concernant notre politique de cookies :<br />
					<a href="mailto:as@royalebrussels.com" class="text-primary underline"
						>as@royalebrussels.com</a
					>
				</p>
			</section>
		</div>
	</div>
</main>
