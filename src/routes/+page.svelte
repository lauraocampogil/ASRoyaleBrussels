<script lang="ts">
	import Builder from '$lib/sections/builder.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>AS Royale Brussels | Académie de football à Bruxelles</title>
</svelte:head>

<Builder blocks={data.blocks} />
