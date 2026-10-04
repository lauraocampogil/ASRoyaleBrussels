<script lang="ts">
	import { Seo } from '$lib/components';
</script>

<Seo
	title="Politique de confidentialité"
	description="Politique de confidentialité de Brussels Summit Academy : comment tes données personnelles sont collectées, utilisées et protégées."
	noindex
/>

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

		<h1
			class="mb-2 text-[1.625rem] leading-tight text-balance text-dark sm:text-3xl md:text-4xl xl:text-title-2xl"
		>
			Politique de Confidentialité
		</h1>
		<p class="mb-10 text-sm text-dark/40">Dernière mise à jour : Octobre 2026</p>

		<div class="flex flex-col gap-8 text-dark">
			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">
					1. Responsable du traitement
				</h2>
				<p class="text-base leading-relaxed">
					<strong>Brussels Summit Academy</strong><br />
					Contact :
					<a href="mailto:brussels@summitacademy-info.com" class="text-primary underline"
						>brussels@summitacademy-info.com</a
					>
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">
					2. Données personnelles collectées
				</h2>
				<p class="text-base leading-relaxed">
					Dans le cadre du formulaire d'inscription (Talent Days / Rejoindre l'académie), Brussels
					Summit Academy collecte les données suivantes :
				</p>
				<ul class="flex flex-col gap-1 pl-4">
					{#each ['Prénom, nom et genre', 'Date de naissance', 'Poste préféré', 'Adresse email et numéro de téléphone', "Pour rejoindre l'académie : lieu de naissance, nationalité, adresse postale, code postal, club actuel et division", "Copie recto/verso de la carte d'identité"] as item}
						<li class="flex items-start gap-2 text-base">
							<span class="mt-1 text-primary">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">3. Mode de collecte</h2>
				<p class="text-base leading-relaxed">
					Les données personnelles sont collectées via le formulaire d'inscription disponible sur le
					site, et stockées sur notre système de gestion de contenu (Directus), hébergé sur un
					serveur dédié en Allemagne.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">
					4. Finalités du traitement
				</h2>
				<ul class="flex flex-col gap-1 pl-4">
					{#each ["Traiter les demandes d'inscription aux Talent Days ou à l'académie", 'Recontacter les candidats par email ou téléphone', "Vérifier l'identité et l'âge des candidats (16 à 28 ans)"] as item}
						<li class="flex items-start gap-2 text-base">
							<span class="mt-1 text-primary">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">5. Base légale</h2>
				<p class="text-base leading-relaxed">
					Le traitement des données du formulaire d'inscription est fondé sur le consentement de la
					personne lors de l'envoi du formulaire et sur l'intérêt légitime de l'académie à traiter
					les candidatures reçues.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">
					6. Durée de conservation
				</h2>
				<p class="text-base leading-relaxed">
					Les candidatures reçues via le formulaire d'inscription sont conservées 12 mois maximum,
					sauf nécessité de conservation plus longue pour le suivi d'une candidature ou d'un
					recrutement.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">7. Mesure d'audience</h2>
				<p class="text-base leading-relaxed">
					Le site utilise des outils de mesure d'audience pour comprendre comment les visiteurs
					l'utilisent :
				</p>
				<ul class="flex flex-col gap-1 pl-4">
					{#each ['Google Analytics — uniquement activé si vous acceptez les cookies via le bandeau de consentement. Base légale : votre consentement.', 'Plausible Analytics — outil sans cookie, ne collectant aucune donnée personnelle identifiable. Base légale : intérêt légitime.', "Google Search Console — sert uniquement à vérifier la propriété du site et suivre son référencement, aucune donnée sur les visiteurs n'est collectée."] as item}
						<li class="flex items-start gap-2 text-base">
							<span class="mt-1 text-primary">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
				<p class="text-base leading-relaxed">
					Pour plus de détails, consultez notre
					<a href="/cookies" class="text-primary underline">politique de cookies</a>.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">
					8. Destinataires des données
				</h2>
				<p class="text-base leading-relaxed">Les données peuvent être partagées avec :</p>
				<ul class="flex flex-col gap-1 pl-4">
					{#each ['Directus (système de gestion de contenu auto-hébergé) — Allemagne', 'Hetzner Online GmbH (hébergement du serveur) — Allemagne', 'Cloudflare (hébergement du site)', 'Google LLC (Google Analytics, sur consentement uniquement, et Search Console) — États-Unis, cadre de transfert conforme au RGPD', "Plausible Analytics — hébergé dans l'Union Européenne", 'Resend (envoi des emails de confirmation) — États-Unis, cadre de transfert conforme au RGPD', "Google Cloud Vision (lecture automatique des cartes d'identité pour vérifier leur validité) — États-Unis, cadre de transfert conforme au RGPD"] as item}
						<li class="flex items-start gap-2 text-base">
							<span class="mt-1 text-primary">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">9. Vos droits</h2>
				<p class="text-base leading-relaxed">
					Conformément au RGPD, vous disposez des droits suivants :
				</p>
				<ul class="flex flex-col gap-1 pl-4">
					{#each ["Droit d'accès à vos données", 'Droit de rectification', "Droit à l'effacement", 'Droit à la limitation du traitement', 'Droit à la portabilité des données', "Droit d'opposition"] as item}
						<li class="flex items-start gap-2 text-base">
							<span class="mt-1 text-primary">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
				<p class="text-base leading-relaxed">
					Pour exercer ces droits :
					<a href="mailto:brussels@summitacademy-info.com" class="text-primary underline"
						>brussels@summitacademy-info.com</a
					><br />
					Vous pouvez également introduire une réclamation auprès de l'
					<a
						href="https://www.autoriteprotectiondonnees.be"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary underline">Autorité de protection des données</a
					>.
				</p>
			</section>

			<div class="border-t border-dashed border-dark/10"></div>

			<section class="flex flex-col gap-3">
				<h2 class="text-lg leading-snug font-medium text-dark sm:text-xl">10. Modifications</h2>
				<p class="text-base leading-relaxed">
					Brussels Summit Academy se réserve le droit de mettre à jour cette politique à tout
					moment. Toute modification sera publiée sur cette page.
				</p>
			</section>
		</div>
	</div>
</main>
