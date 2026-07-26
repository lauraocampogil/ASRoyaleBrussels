<script lang="ts">
	import { Tagline, DotGrid } from '$lib/components';
	import { reveal } from '$lib/actions/reveal';

	let { eyebrow, title, description, staff = [] }: any = $props();
</script>

<section
	id="staff"
	data-header-theme="light"
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div use:reveal={{ stagger: 0.12 }} class="col-span-8 flex flex-col gap-y-4 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2
			class="text-mobile-title-xl font-semibold uppercase font-clash text-primary md:text-title-2xl"
		>
			{title}
		</h2>
		{#if description}
			<p class="text-mobile-body font-jakarta text-dark md:text-body">{description}</p>
		{/if}
	</div>

	<div
		use:reveal={{ stagger: 0.1 }}
		class="col-span-8 mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-10 sm:gap-x-6 sm:gap-y-10 md:mt-14 md:grid-cols-4 md:gap-y-12"
	>
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

				<h3
					class="text-base font-semibold font-clash text-primary mt-3 sm:mt-5 sm:text-title-sm sm:font-normal"
				>
					{member.name}
				</h3>
				<p class="text-xs font-jakarta text-dark/70 mt-1 sm:text-body-sm">{member.role}</p>
			</div>
		{/each}
	</div>
</section>
