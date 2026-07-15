<script lang="ts">
	let { items = [] }: any = $props();
	const loop = [...items, ...items];
</script>

<section class="relative overflow-hidden bg-secondary py-6">
	<div class="marquee-left flex w-max items-center gap-6 whitespace-nowrap">
		{#each loop as item}
			<span class="text-tag font-jakarta uppercase text-dark">{item}</span>
			<span class="text-dark">—</span>
		{/each}
	</div>
</section>

<style>
	.marquee-left {
		animation: marquee-left 25s linear infinite;
	}
	.marquee-left:hover {
		animation-play-state: paused;
	}

	@keyframes marquee-left {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}
</style>
