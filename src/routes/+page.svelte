<script lang="ts">
	import Builder from '$lib/sections/builder.svelte';
	import { Seo } from '$lib/components';

	let { data } = $props();
</script>

<Seo
	title="Accueil"
	description="Brussels Summit Academy forme des joueuses et joueurs de tous âges à Bruxelles, du premier ballon jusqu'à la recherche d'un contrat professionnel. Talent Days et agents FIFA licenciés."
/>

<Builder blocks={data.blocks} />
