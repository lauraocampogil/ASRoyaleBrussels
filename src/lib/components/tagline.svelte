<script lang="ts">
	let { text }: { text: string } = $props();
</script>

<p class="text-tag flex items-center gap-2 uppercase tracking-wide text-secondary">
	<span class="h-px w-6 bg-secondary"></span>
	{text}
</p>
