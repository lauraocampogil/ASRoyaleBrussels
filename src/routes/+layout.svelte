<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';
	import { TalentDayPopup } from '$lib/components';

	let { children, data } = $props();

	afterNavigate(() => {
		if (page.url.pathname === '/' && window.location.hash) {
			const id = window.location.hash.slice(1);
			setTimeout(() => {
				const target = document.getElementById(id);
				if (!target) return;
				const header = document.querySelector('header');
				const offset = (header?.clientHeight ?? 80) + 16;
				const top = target.getBoundingClientRect().top + window.scrollY - offset;
				window.scrollTo({ top, behavior: 'smooth' });
			}, 600);
		}
	});
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SportsOrganization',
		name: 'Brussels Summit Academy',
		alternateName: 'BSA',
		url: 'https://brussels-summitacademy.be',
		logo: 'https://brussels-summitacademy.be/images/logo.svg',
		image: 'https://brussels-summitacademy.be/og-image.png',
		description:
			'Académie et agence de carrière football à Bruxelles. Talent Days de détection et formation pour les joueuses et joueurs de tous âges.',
		sport: 'Football',
		email: 'brussels@summitacademy-info.com',
		telephone: '+32491328986',
		address: {
			'@type': 'PostalAddress',
			streetAddress: 'Rue de Ransbeek 227',
			postalCode: '1120',
			addressLocality: 'Bruxelles',
			addressCountry: 'BE'
		},
		sameAs: [
			'https://www.facebook.com/profile.php?id=61593354967029',
			'https://www.instagram.com/brusselssummitacademy/',
			'https://www.tiktok.com/@brussels.summit.academy'
		]
	})}</script>`}
</svelte:head>

<TalentDayPopup {...data.talentDayPopup} />

{@render children()}
