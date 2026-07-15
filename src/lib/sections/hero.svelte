<script lang="ts">
	import { onMount } from 'svelte';
	import { heroPinned } from '$lib/stores/heroPinned';

	let {
		tagline,
		title,
		subtitle,
		cta_primary_label,
		cta_primary_href,
		cta_secondary_label,
		cta_secondary_href,
		background
	}: any = $props();

	let sectionEl: HTMLElement;
	let videoWrapEl: HTMLElement;
	let contentEl: HTMLElement;
	let videoEl: HTMLVideoElement;

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

<section bind:this={sectionEl} class="relative h-screen w-full overflow-hidden bg-primary">
	<div
		class="grid-section sm-grid-section relative h-full px-5 pt-20 pb-12 sm:px-8 sm:pt-24 md:px-10 lg:px-12 xl:pb-20 xl:pt-28 3xl:container 3xl:mx-auto"
	>
		<div
			bind:this={contentEl}
			class="col-start-3 col-span-4 flex flex-col items-center gap-y-6 text-center text-white"
		>
			{#if tagline}
				<p class="text-tag uppercase tracking-wide text-secondary">{tagline}</p>
			{/if}
			<h1 class="text-title-6xl font-clash">{@html title}</h1>
			{#if subtitle}
				<p class="text-subtitle font-jakarta max-w-2xl text-white/80">{subtitle}</p>
			{/if}
			<div class="flex gap-4">
				{#if cta_primary_label}
					<a href={cta_primary_href} class="text-button rounded bg-secondary px-6 py-3 text-dark">
						{cta_primary_label}
					</a>
				{/if}
				{#if cta_secondary_label}
					<a
						href={cta_secondary_href}
						class="text-button rounded border border-white px-6 py-3 text-white"
					>
						{cta_secondary_label}
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div
		bind:this={videoWrapEl}
		class="absolute bottom-0 left-1/2 h-[42vh] w-[60vw] overflow-hidden rounded-3xl bg-dark"
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
