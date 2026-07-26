<script lang="ts">
	import { Tagline, DotGrid } from '$lib/components';
	import { reveal } from '$lib/actions/reveal';

	let { eyebrow, title, description, image, image_subject }: any = $props();
</script>

<section
	id="methode"
	data-header-theme="light"
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div class="relative col-span-8 lg:col-span-3">
		<div
			use:reveal
			class="group relative h-64 w-full overflow-hidden rounded-lg bg-dark-accent/20 sm:h-80 md:h-96 lg:h-115"
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

	<div
		use:reveal={{ stagger: 0.12 }}
		class="col-span-8 mt-8 flex flex-col justify-center gap-y-4 lg:col-span-3 lg:col-start-4 lg:mt-0 lg:gap-y-6"
	>
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-mobile-title-xl font-semibold font-clash text-primary lg:text-title-2xl">
			{title}
		</h2>
		{#if description}
			{#each description.split('\n\n') as paragraph}
				<p class="text-mobile-body font-jakarta text-dark lg:text-body">{paragraph}</p>
			{/each}
		{/if}
	</div>
</section>
