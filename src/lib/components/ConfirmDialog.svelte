<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmText = 'Bestätigen',
		cancelText = 'Abbrechen',
		onconfirm,
		oncancel
	}: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			aria-label="Dialog schließen"
			onclick={oncancel}
			in:fade={{ duration: 180 }}
			out:fade={{ duration: 120 }}
		></button>
		<div
			class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			in:scale={{ duration: 180, start: 0.96 }}
			out:scale={{ duration: 140, start: 0.98 }}
		>
			<h3 class="mb-2 text-lg font-semibold">{title}</h3>
			<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{message}</p>
			<div class="flex gap-3">
				<button
					onclick={oncancel}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium dark:bg-gray-800"
				>
					{cancelText}
				</button>
				<button
					onclick={onconfirm}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
