<script lang="ts">
	const SITE_NAME = 'Brussels Summit Academy';
	const SITE_URL = 'https://brussels-summitacademy.be';
	const DEFAULT_DESCRIPTION =
		'Académie de football à Bruxelles. Talent Days de détection et formation pour les jeunes joueurs et joueuses dès 16 ans. From Potential to Greatness.';
	const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

	let {
		title,
		description = DEFAULT_DESCRIPTION,
		path = '',
		image = DEFAULT_IMAGE,
		type = 'website',
		noindex = false
	}: {
		title: string;
		description?: string;
		path?: string;
		image?: string;
		type?: string;
		noindex?: boolean;
	} = $props();

	let fullTitle = $derived(title ? `${title} | ${SITE_NAME}` : SITE_NAME);
	let canonical = $derived(`${SITE_URL}${path}`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:url" content={canonical} />
	<meta property="og:locale" content="fr_BE" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
