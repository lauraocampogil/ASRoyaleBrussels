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

<a {href} class="text-button rounded px-6 py-3 transition-colors {variants[variant]}">
	{label}
</a>
