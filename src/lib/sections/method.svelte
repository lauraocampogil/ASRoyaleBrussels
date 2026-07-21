<script lang="ts">
	import { onMount } from 'svelte';
	import { Tagline, DotGrid } from '$lib/components';

	let { eyebrow, title, description, image, image_subject }: any = $props();

	let sectionEl: HTMLElement;
	let imageEl: HTMLDivElement;
	let textEl: HTMLElement;

	onMount(() => {
		let ctx: any;

		(async () => {
			const { default: gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);

			ctx = gsap.context(() => {
				gsap.from(imageEl, {
					x: -60,
					opacity: 0,
					duration: 1,
					ease: 'power3.out',
					scrollTrigger: { trigger: sectionEl, start: 'top 75%' }
				});

				gsap.from(textEl.children, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					stagger: 0.12,
					ease: 'power3.out',
					scrollTrigger: { trigger: sectionEl, start: 'top 75%' }
				});
			}, sectionEl);
		})();

		return () => ctx?.revert();
	});
</script>

<section
	id="methode"
	data-header-theme="light"
	bind:this={sectionEl}
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div class="relative col-span-3">
		<div
			bind:this={imageEl}
			class="group relative h-115 w-full overflow-hidden rounded-lg bg-dark-accent/20"
		>
			{#if image}
				<img src={image} alt={title} class="absolute inset-0 h-full w-full object-cover" />
			{/if}

			<div
				class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
			>
				<DotGrid />
			</div>

			{#if image_subject}
				<img
					src={image_subject}
					alt=""
					class="pointer-events-none absolute inset-0 h-full w-full object-cover"
				/>
			{/if}
		</div>
	</div>

	<div bind:this={textEl} class="col-span-3 col-start-4 flex flex-col justify-center gap-y-6">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-title-2xl font-clash text-primary">{title}</h2>
		{#if description}
			{#each description.split('\n\n') as paragraph}
				<p class="text-body font-jakarta text-dark">{paragraph}</p>
			{/each}
		{/if}
	</div>
</section>
