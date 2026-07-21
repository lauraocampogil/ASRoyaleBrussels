<script lang="ts">
	let {
		href,
		label,
		variant = 'primary'
	}: {
		href?: string;
		label: string;
		variant?: 'primary' | 'outline-white' | 'outline-primary';
	} = $props();

	const variants: Record<string, string> = {
		primary: 'bg-secondary text-dark hover:opacity-90',
		'outline-white': 'border border-white text-white hover:bg-white hover:text-dark',
		'outline-primary': 'border border-primary text-primary hover:bg-primary hover:text-white'
	};
</script>

<a
	{href}
	class="group text-button inline-flex items-center overflow-hidden rounded px-6 py-3 transition-colors {variants[
		variant
	]}"
>
	{#each label.split('') as char, i}
		<span class="relative inline-block h-[1em] overflow-hidden align-top leading-none">
			<span
				class="flex flex-col leading-none transition-transform ease-out group-hover:-translate-y-1/2"
				style="transition-duration: 350ms; transition-delay: {i * 20}ms"
			>
				<span class="block h-[1em] leading-[1em]">{char === ' ' ? '\u00A0' : char}</span>
				<span aria-hidden="true" class="block h-[1em] leading-[1em]"
					>{char === ' ' ? '\u00A0' : char}</span
				>
			</span>
		</span>
	{/each}
</a>
