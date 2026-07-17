<script lang="ts">
	import { onMount } from 'svelte';
	import { Tagline, DotGrid } from '$lib/components';

	let { eyebrow, title, description, staff = [] }: any = $props();

	let sectionEl: HTMLElement;
	let headerEl: HTMLElement;
	let gridEl: HTMLElement;

	onMount(() => {
		let ctx: any;

		(async () => {
			const { default: gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);

			ctx = gsap.context(() => {
				gsap.from(headerEl.children, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					stagger: 0.12,
					ease: 'power3.out',
					scrollTrigger: { trigger: sectionEl, start: 'top 75%' }
				});

				gsap.from(gridEl.children, {
					y: 40,
					opacity: 0,
					duration: 0.8,
					stagger: 0.1,
					ease: 'power3.out',
					scrollTrigger: { trigger: gridEl, start: 'top 80%' }
				});
			}, sectionEl);
		})();

		return () => ctx?.revert();
	});
</script>

<section
	bind:this={sectionEl}
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div bind:this={headerEl} class="col-span-8 flex flex-col gap-y-4 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-title-2xl uppercase font-clash text-primary">{title}</h2>
		{#if description}
			<p class="text-body font-jakarta text-dark">{description}</p>
		{/if}
	</div>

	<div bind:this={gridEl} class="col-span-8 mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
		{#each staff as member}
			<div class="flex flex-col">
				<div class="group relative aspect-3/4 w-full overflow-hidden rounded-lg bg-dark-accent/20">
					{#if member.image}
						<img
							src={member.image}
							alt={member.name}
							class="absolute inset-0 h-full w-full object-cover"
						/>
					{/if}

					<div
						class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					>
						<DotGrid />
					</div>

					{#if member.image_subject}
						<img
							src={member.image_subject}
							alt=""
							class="pointer-events-none absolute inset-0 h-full w-full object-cover"
						/>
					{/if}
				</div>

				<h3 class="text-title-sm font-clash text-primary mt-5">{member.name}</h3>
				<p class="text-body-sm font-jakarta text-dark/70 mt-1">{member.role}</p>
			</div>
		{/each}
	</div>
</section>
