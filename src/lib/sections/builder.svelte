<script lang="ts">
	import * as Sections from './index';

	let { blocks = [] }: { blocks: { type: string; props: Record<string, any> }[] } = $props();
</script>

{#each blocks as block}
	{@const Component = (Sections as Record<string, any>)[block.type]}
	{#if Component}
		<Component {...block.props} />
	{/if}
{/each}
