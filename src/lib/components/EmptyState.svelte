<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		message: string;
		compact?: boolean;
		children?: Snippet;
	}

	let { title, message, compact = false, children }: Props = $props();
</script>

<div class="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
	<div class={`mx-auto flex items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
		<svg class={compact ? 'h-5 w-5' : 'h-6 w-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M7 8h10M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
		</svg>
	</div>
	<h2 class="mt-4 text-base font-semibold">{title}</h2>
	<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
	{@render children?.()}
</div>
