<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Tagline } from '$lib/components';

	let { eyebrow, title, description, steps = [] }: any = $props();

	let openIndex = $state(0);
	let sectionEl: HTMLElement;
	let headerEl: HTMLElement;

	function toggle(i: number) {
		openIndex = openIndex === i ? -1 : i;
	}

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
			}, sectionEl);
		})();

		return () => ctx?.revert();
	});
</script>

<section
	bind:this={sectionEl}
	class="grid-section sm-grid-section bg-primary px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div bind:this={headerEl} class="col-span-8 flex flex-col gap-y-4 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-title-2xl font-clash text-white">{title}</h2>
		{#if description}
			<p class="text-body font-jakarta text-white/70">{description}</p>
		{/if}
	</div>

	<div class="col-span-8 mt-10">
		{#each steps as step, i}
			<div class="border-t border-white/15 {i === steps.length - 1 ? 'border-b' : ''}">
				<button
					type="button"
					onclick={() => toggle(i)}
					class="-mx-5 flex w-[calc(100%+2.5rem)] items-center gap-6 px-5 py-7 text-left transition-colors hover:bg-white/5 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8"
				>
					<span class="text-title-md font-clash w-16 shrink-0 text-secondary">
						{String(step.order ?? i + 1).padStart(2, '0')}
					</span>
					<span class="text-title-md font-clash flex-1 text-white">{step.title}</span>
					<span class="relative h-11 w-11 shrink-0 overflow-hidden">
						<span
							class="absolute inset-0 transition-transform duration-300"
							style="transform: rotate({openIndex === i ? 135 : 0}deg);"
						>
							<svg
								class="arrow-a absolute inset-0 h-full w-full text-white"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								><path fill="currentColor" d="M6.4 18L5 16.6L14.6 7H6V5h12v12h-2V8.4z" /></svg
							>
							<svg
								class="arrow-b absolute inset-0 h-full w-full text-white"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								><path fill="currentColor" d="M6.4 18L5 16.6L14.6 7H6V5h12v12h-2V8.4z" /></svg
							>
						</span>
					</span>
				</button>

				{#if openIndex === i && step.description}
					<div transition:slide={{ duration: 250 }} class="pb-7 pl-24">
						<p class="text-body font-jakarta text-white/70">{step.description}</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.arrow-a {
		transform: translate(0, 0);
		opacity: 1;
	}
	.arrow-b {
		transform: translate(-140%, 140%);
		opacity: 0;
	}
	button:hover .arrow-a,
	button:hover .arrow-b {
		transition:
			transform 0.35s ease,
			opacity 0.35s ease;
	}
	button:hover .arrow-a {
		transform: translate(140%, -140%);
		opacity: 0;
	}
	button:hover .arrow-b {
		transform: translate(0, 0);
		opacity: 1;
	}
</style>
