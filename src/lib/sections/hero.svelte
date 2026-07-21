<!-- Hero.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { heroPinned } from '$lib/stores/heroPinned';
	import { Button, Tagline, DotGrid } from '$lib/components';

	let {
		tagline,
		title,
		cta_primary_label,
		cta_primary_href,
		cta_secondary_label,
		cta_secondary_href,
		background
	}: any = $props();

	let sectionEl: HTMLElement;
	let videoWrapEl: HTMLElement;
	let contentEl: HTMLElement;
	let videoEl: HTMLVideoElement | undefined = $state();

	onMount(() => {
		let ctx: any;

		(async () => {
			const { default: gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);

			ctx = gsap.context(() => {
				gsap.set(videoWrapEl, { xPercent: -50 });

				gsap.from(contentEl.children, {
					y: 40,
					opacity: 0,
					duration: 1,
					stagger: 0.15,
					ease: 'power3.out'
				});

				gsap
					.timeline({
						scrollTrigger: {
							trigger: sectionEl,
							start: 'top top',
							end: '+=100%',
							scrub: true,
							pin: true,
							onUpdate: (self) => {
								heroPinned.set(self.progress >= 0.5);
								if (self.progress >= 0.75) {
									videoEl?.play();
								} else {
									videoEl?.pause();
								}
							}
						}
					})
					.to(
						videoWrapEl,
						{
							width: '100vw',
							height: '100vh',
							borderRadius: 0,
							duration: 0.5,
							ease: 'power2.inOut'
						},
						0.5
					);
			}, sectionEl);
		})();

		return () => ctx?.revert();
	});
</script>

<section
	id="home"
	bind:this={sectionEl}
	role="presentation"
	data-header-theme="primary"
	class="relative h-screen w-full overflow-hidden bg-primary"
>
	<DotGrid fadeBottom />

	<div
		class="grid-section sm-grid-section content-center relative h-full px-5 pb-[20vh] sm:px-8 md:px-10 lg:px-12 3xl:container 3xl:mx-auto"
	>
		<div
			bind:this={contentEl}
			class="col-start-3 col-span-4 flex flex-col items-center gap-y-6 text-center text-white"
		>
			{#if tagline}
				<Tagline text={tagline} />
			{/if}
			<h1 class="text-title-6xl uppercase font-clash">{@html title}</h1>
			<div class="flex gap-4">
				{#if cta_primary_label}
					<Button href={cta_primary_href} label={cta_primary_label} variant="primary" />
				{/if}
				{#if cta_secondary_label}
					<Button href={cta_secondary_href} label={cta_secondary_label} variant="outline-white" />
				{/if}
			</div>
		</div>
	</div>

	<div
		bind:this={videoWrapEl}
		class="absolute bottom-0 left-1/2 h-[32vh] w-[75vw] overflow-hidden rounded-t-[10px] bg-dark"
	>
		{#if background}
			<video
				bind:this={videoEl}
				src={background}
				muted
				loop
				playsinline
				class="h-full w-full object-cover"
			></video>
		{/if}
	</div>
</section>
