<script lang="ts">
	import { onMount } from 'svelte';

	let { fadeBottom = false }: { fadeBottom?: boolean } = $props();

	let el: HTMLElement;

	onMount(() => {
		const parent = el.parentElement;
		if (!parent) return;

		function handleMouseMove(e: MouseEvent) {
			const rect = parent!.getBoundingClientRect();
			el.style.setProperty('--x', `${e.clientX - rect.left}px`);
			el.style.setProperty('--y', `${e.clientY - rect.top}px`);
		}

		parent.addEventListener('mousemove', handleMouseMove);
		return () => parent.removeEventListener('mousemove', handleMouseMove);
	});
</script>

<div bind:this={el} class="pointer-events-none absolute inset-0">
	<div class="dot-layer-lg absolute inset-0" class:fade-bottom={fadeBottom}></div>
	<div class="dot-layer-sm absolute inset-0" class:fade-bottom={fadeBottom}></div>
	<div class="dot-spotlight absolute inset-0"></div>
</div>

<style>
	.dot-layer-lg {
		background-image: radial-gradient(circle, rgba(244, 180, 0, 0.4) 2.5px, transparent 2.5px);
		background-size: 34px 34px;
	}
	.dot-layer-sm {
		background-image: radial-gradient(circle, rgba(244, 180, 0, 0.3) 1px, transparent 1px);
		background-size: 18px 18px;
	}
	.dot-layer-lg.fade-bottom {
		mask-image: linear-gradient(to bottom, black 0%, black 30%, transparent 55%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 30%, transparent 55%);
	}
	.dot-layer-sm.fade-bottom {
		mask-image: linear-gradient(to bottom, transparent 20%, black 40%, black 62%, transparent 88%);
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 20%,
			black 40%,
			black 62%,
			transparent 88%
		);
	}
	.dot-spotlight {
		background-image: radial-gradient(circle, rgba(244, 180, 0, 0.9) 2.5px, transparent 2.5px);
		background-size: 34px 34px;
		mask-image: radial-gradient(
			circle 180px at var(--x, 50%) var(--y, 50%),
			black,
			transparent 70%
		);
		-webkit-mask-image: radial-gradient(
			circle 180px at var(--x, 50%) var(--y, 50%),
			black,
			transparent 70%
		);
	}
</style>
