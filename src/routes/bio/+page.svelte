<script lang="ts">
	import { onMount } from 'svelte';
	import { HeaderBlock as Header, FooterBlock as Footer } from '$lib/sections';
	import { Button, Tagline } from '$lib/components';
	import { reveal } from '$lib/actions/reveal';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let paragraphs = $derived((data.content ?? '').split('\n\n').filter(Boolean));
	let block1 = $derived(paragraphs.slice(0, 2));
	let block3 = $derived(paragraphs.slice(-2));
	let block2 = $derived(paragraphs.slice(2, Math.max(2, paragraphs.length - 2)));

	let closingWords = $derived((data.closingLine ?? '').split(' ').filter(Boolean));
	let breakIndex = $derived.by(() => {
		const dashIndex = closingWords.findIndex((w: string) => w === '–' || w === '-');
		return dashIndex !== -1 ? dashIndex + 1 : Math.ceil(closingWords.length / 2);
	});
	let closingLine1 = $derived(closingWords.slice(0, breakIndex));
	let closingLine2 = $derived(closingWords.slice(breakIndex));

	let quoteEl: HTMLElement = $state()!;

	onMount(() => {
		let ctx: any;

		(async () => {
			const { default: gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);

			ctx = gsap.context(() => {
				const words = quoteEl.querySelectorAll('.quote-word');
				gsap.set(words, { color: 'rgba(16,20,28,0.15)' });

				gsap.to(words, {
					color: '#10141c',
					stagger: 0.5,
					ease: 'none',
					scrollTrigger: {
						trigger: quoteEl,
						start: 'top 75%',
						end: 'bottom 45%',
						scrub: true
					}
				});
			}, quoteEl);
		})();

		return () => ctx?.revert();
	});
</script>

<svelte:head>
	<title>Bio — Brussels Summit Academy</title>
	<meta
		name="description"
		content="Brussels Summit Academy — vision, mission et valeurs de notre centre de détection et de développement des talents du football."
	/>
</svelte:head>

<Header {...data.header} />

<main data-header-theme="light" class="min-h-screen bg-background">
	<div
		class="grid-section sm-grid-section px-5 pt-40 pb-10 sm:px-8 sm:pt-44 sm:pb-28 md:px-10 md:pt-48 md:pb-32 lg:px-12 xl:pt-56 xl:pb-40 3xl:container 3xl:mx-auto"
	>
		<div class="col-span-8 mb-14 md:col-span-6 md:col-start-1">
			{#if data.eyebrow}
				<Tagline text={data.eyebrow} />
			{/if}
			{#if data.title}
				<h1 class="mt-3 text-mobile-title-xl font-clash uppercase text-primary md:text-title-2xl">
					{data.title}
				</h1>
			{/if}
		</div>

		<!-- Bloc 1 — foto links -->
		<div
			class="col-span-8 flex flex-col lg:col-span-6 lg:col-start-1 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10"
		>
			<div class="relative lg:order-1">
				<div
					use:reveal
					class="h-64 w-full overflow-hidden rounded-lg bg-dark-accent/20 sm:h-80 md:h-96 lg:h-115"
				>
					{#if data.image1}
						<img src={data.image1} alt="" class="h-full w-full object-cover" />
					{/if}
				</div>
			</div>
			<div use:reveal={{ stagger: 0.1 }} class="mt-6 flex flex-col gap-4 lg:order-2 lg:mt-0">
				{#each block1 as paragraph}
					<p class="text-mobile-body font-jakarta leading-relaxed text-dark md:text-body">
						{paragraph}
					</p>
				{/each}
			</div>
		</div>

		<!-- Bloc 2 — foto rechts -->
		<div
			class="col-span-8 mt-16 flex flex-col lg:col-span-6 lg:col-start-3 lg:mt-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10"
		>
			<div class="relative lg:order-2">
				<div
					use:reveal
					class="h-64 w-full overflow-hidden rounded-lg bg-dark-accent/20 sm:h-80 md:h-96 lg:h-115"
				>
					{#if data.image2}
						<img src={data.image2} alt="" class="h-full w-full object-cover" />
					{/if}
				</div>
			</div>
			<div use:reveal={{ stagger: 0.1 }} class="mt-6 flex flex-col gap-4 lg:order-1 lg:mt-0">
				{#each block2 as paragraph}
					<p class="text-mobile-body font-jakarta leading-relaxed text-dark md:text-body">
						{paragraph}
					</p>
				{/each}
			</div>
		</div>

		<!-- Bloc 3 — foto links -->
		<div
			class="col-span-8 mt-16 flex flex-col lg:col-span-6 lg:col-start-1 lg:mt-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10"
		>
			<div class="relative lg:order-1">
				<div
					use:reveal
					class="h-64 w-full overflow-hidden rounded-lg bg-dark-accent/20 sm:h-80 md:h-96 lg:h-115"
				>
					{#if data.image3}
						<img src={data.image3} alt="" class="h-full w-full object-cover" />
					{/if}
				</div>
			</div>
			<div use:reveal={{ stagger: 0.1 }} class="mt-6 flex flex-col gap-4 lg:order-2 lg:mt-0">
				{#each block3 as paragraph}
					<p class="text-mobile-body font-jakarta leading-relaxed text-dark md:text-body">
						{paragraph}
					</p>
				{/each}
			</div>
		</div>
	</div>

	{#if data.closingLine}
		<section
			data-header-theme="light"
			class="grid-section sm-grid-section bg-background px-5 pt-4 pb-20 sm:px-8 sm:py-24 md:px-10 lg:px-12 xl:py-32 3xl:container 3xl:mx-auto"
		>
			<div
				bind:this={quoteEl}
				class="col-span-8 mx-auto min-w-0 text-center md:col-span-6 md:col-start-2 lg:col-span-6 lg:col-start-2"
			>
				<h2
					class="font-clash text-mobile-title-lg leading-[1.15] uppercase md:text-title-xl lg:text-title-3xl"
				>
					<span class="block">
						{#each closingLine1 as word, i}
							<span class="quote-word">{word}{i < closingLine1.length - 1 ? ' ' : ''}</span>
						{/each}
					</span>
					<span class="block">
						{#each closingLine2 as word, i}
							<span class="quote-word">{word}{i < closingLine2.length - 1 ? ' ' : ''}</span>
						{/each}
					</span>
				</h2>
			</div>
		</section>
	{/if}
</main>

<Footer {...data.footer} />
