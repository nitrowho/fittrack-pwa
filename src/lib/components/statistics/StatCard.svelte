<script lang="ts">
	interface Props {
		label: string;
		value: string;
		sub?: string;
	}

	let { label, value, sub }: Props = $props();
</script>

<div class="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<p class="text-xs text-gray-500 dark:text-gray-400">{label}</p>
	<p class="mt-1 text-xl font-bold">{value}</p>
	{#if sub}
		<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
	{/if}
</div>
