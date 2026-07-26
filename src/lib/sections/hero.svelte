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

	let sectionEl: HTMLElement = $state()!;
	let videoWrapEl: HTMLElement = $state()!;
	let contentEl: HTMLElement = $state()!;
	let videoEl: HTMLVideoElement | undefined = $state();

	onMount(() => {
		let ctx: any;

		(async () => {
			const { default: gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);

			ScrollTrigger.normalizeScroll(true);

			ctx = gsap.context(() => {
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
							invalidateOnRefresh: true,
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
	class="relative h-[100dvh] w-full overflow-hidden bg-primary"
>
	<DotGrid fadeBottom />

	<div
		class="grid-section sm-grid-section content-start relative h-full px-5 pt-28 pb-[26vh] sm:content-center sm:px-8 sm:pt-0 sm:pb-[22vh] md:px-10 md:pb-[20vh] lg:px-12 3xl:container 3xl:mx-auto"
	>
		<div
			bind:this={contentEl}
			class="col-span-8 flex flex-col items-center gap-y-5 text-center text-white sm:gap-y-6 xl:col-start-3 xl:col-span-4"
		>
			{#if tagline}
				<Tagline text={tagline} />
			{/if}
			<h1
				class="text-[1.65rem] leading-[1.15] uppercase font-clash 2xs:text-[1.9rem] xs:text-[2.25rem] md:text-title-6xl md:leading-[1.15]"
			>
				{@html title}
			</h1>
			<div class="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
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
		class="absolute bottom-0 left-1/2 h-[26vh] w-[88vw] -translate-x-1/2 overflow-hidden rounded-t-[10px] bg-dark sm:h-[30vh] sm:w-[80vw] xl:h-[32vh] xl:w-[75vw]"
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
