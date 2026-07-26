<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Tagline } from '$lib/components';
	import { reveal } from '$lib/actions/reveal';

	let { eyebrow, title, description, steps = [] }: any = $props();

	let openIndex = $state(0);

	function toggle(i: number) {
		openIndex = openIndex === i ? -1 : i;
	}
</script>

<section
	id="parcours"
	data-header-theme="primary"
	class="grid-section sm-grid-section bg-primary px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div use:reveal={{ stagger: 0.12 }} class="col-span-8 flex flex-col gap-y-4 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-mobile-title-xl font-semibold font-clash text-white md:text-title-2xl">
			{title}
		</h2>
		{#if description}
			<p class="text-mobile-body font-jakarta text-white/70 md:text-body">{description}</p>
		{/if}
	</div>

	<div use:reveal={{ stagger: 0.08 }} class="col-span-8 mt-8 md:mt-10">
		{#each steps as step, i}
			<div class="border-t border-white/15 {i === steps.length - 1 ? 'border-b' : ''}">
				<button
					type="button"
					onclick={() => toggle(i)}
					class="-mx-5 flex w-[calc(100%+2.5rem)] items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-white/5 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:gap-6 sm:px-8 sm:py-7"
				>
					<span
						class="text-[1.35rem] font-clash w-10 shrink-0 text-secondary sm:w-16 sm:text-title-lg"
					>
						{String(step.order ?? i + 1).padStart(2, '0')}
					</span>
					<span class="text-[1.05rem] font-jakarta flex-1 text-white sm:text-title-sm">
						{step.title}
					</span>
					<span class="relative h-9 w-9 shrink-0 overflow-hidden sm:h-11 sm:w-11">
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
					<div transition:slide={{ duration: 250 }} class="pb-5 pl-14 sm:pb-7 sm:pl-24">
						<p
							class="text-mobile-body font-jakarta text-white/70 max-w-xl text-balance sm:text-body"
						>
							{step.description}
						</p>
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
