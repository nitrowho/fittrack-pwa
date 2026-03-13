<script lang="ts">
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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
			<h3 class="mb-2 text-lg font-semibold">{title}</h3>
			<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">{message}</p>
			<div class="flex gap-3">
				<button
					onclick={oncancel}
					class="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium dark:bg-gray-800"
				>
					{cancelText}
				</button>
				<button
					onclick={onconfirm}
					class="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
