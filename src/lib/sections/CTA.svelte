<script lang="ts">
	import { DotGrid, Button } from '$lib/components';
	let { title, cta_label, cta_href, hover_images = [] }: any = $props();

	const IMG_SIZE = 176; // px (h-44 w-44)
	const PADDING = 16; // marge par rapport aux bords de la section

	let sectionEl: HTMLElement;
	let textEl: HTMLElement;
	let positions = $state<{ x: number; y: number; rotate: number; aboveText: boolean }[]>([]);
	let activeIndex = $state(-1);
	const RADIUS = 260;

	let lastClientX = 0;
	let lastClientY = 0;

	function rectsOverlap(
		ax: number,
		ay: number,
		aw: number,
		ah: number,
		bx: number,
		by: number,
		bw: number,
		bh: number
	) {
		return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
	}

	function computePositions() {
		if (!sectionEl) return;
		const secRect = sectionEl.getBoundingClientRect();
		const textRect = textEl?.getBoundingClientRect();

		const tx = textRect ? textRect.left - secRect.left : 0;
		const ty = textRect ? textRect.top - secRect.top : 0;
		const tw = textRect ? textRect.width : 0;
		const th = textRect ? textRect.height : 0;

		const maxX = Math.max(PADDING, secRect.width - IMG_SIZE - PADDING);
		const maxY = Math.max(PADDING, secRect.height - IMG_SIZE - PADDING);

		const result: { x: number; y: number; rotate: number; aboveText: boolean }[] = [];
		let attempts = 0;

		while (result.length < hover_images.length && attempts < hover_images.length * 150) {
			attempts++;
			const x = PADDING + Math.random() * (maxX - PADDING);
			const y = PADDING + Math.random() * (maxY - PADDING);

			const tooClose = result.some((p) => Math.hypot(p.x - x, p.y - y) < IMG_SIZE * 0.55);
			if (tooClose) continue;

			const aboveText = textRect ? rectsOverlap(x, y, IMG_SIZE, IMG_SIZE, tx, ty, tw, th) : false;

			const rotate = Math.round((Math.random() - 0.5) * 28);
			result.push({ x, y, rotate, aboveText });
		}

		positions = result;
	}

	$effect(() => {
		hover_images.length;
		computePositions();
	});

	function handleResize() {
		computePositions();
	}

	function handleScroll() {
		if (!sectionEl) return;
		const rect = sectionEl.getBoundingClientRect();
		const inside =
			lastClientX >= rect.left &&
			lastClientX <= rect.right &&
			lastClientY >= rect.top &&
			lastClientY <= rect.bottom;
		if (!inside) activeIndex = -1;
	}

	function handleMouseMove(e: MouseEvent) {
		lastClientX = e.clientX;
		lastClientY = e.clientY;

		if (!sectionEl) return;

		if ((e.target as HTMLElement).closest('a, button')) {
			activeIndex = -1;
			return;
		}

		const rect = sectionEl.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		let closestIndex = -1;
		let closestDist = Infinity;

		positions.forEach((pos, i) => {
			const cx = pos.x + IMG_SIZE / 2;
			const cy = pos.y + IMG_SIZE / 2;
			const dist = Math.hypot(mx - cx, my - cy);
			if (dist < RADIUS && dist < closestDist) {
				closestDist = dist;
				closestIndex = i;
			}
		});

		activeIndex = closestIndex;
	}

	function handleMouseLeave() {
		activeIndex = -1;
	}
</script>

<svelte:window onresize={handleResize} onscroll={handleScroll} />

<section
	bind:this={sectionEl}
	data-header-theme="light"
	aria-label="Section d'appel à l'action"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	class="grid-section sm-grid-section relative overflow-hidden px-5 py-24 sm:px-8 md:px-10 lg:px-12 xl:py-40 3xl:container 3xl:mx-auto"
>
	<DotGrid />

	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each hover_images as img, i}
			{@const pos = positions[i]}
			{#if pos}
				<img
					src={img}
					alt=""
					style="top: {pos.y}px; left: {pos.x}px; --rotate: {pos.rotate}deg;"
					class="absolute h-44 w-44 rotate-(--rotate) scale-75 rounded-lg object-cover opacity-0 shadow-xl transition-all duration-500 ease-out {activeIndex ===
					i
						? 'scale-100 opacity-100'
						: ''} {pos.aboveText ? 'z-40' : activeIndex === i ? 'z-20' : 'z-0'}"
				/>
			{/if}
		{/each}
	</div>

	<div
		bind:this={textEl}
		class="relative z-30 col-span-8 mx-auto flex max-w-xl flex-col items-center gap-8 text-center"
	>
		<h2 class="text-title-2xl font-clash text-primary whitespace-pre-line uppercase">{title}</h2>
		{#if cta_label}<Button href={cta_href} label={cta_label} variant="primary" />{/if}
	</div>
</section>
