<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte.js';

	interface Props {
		exerciseSessionId: string;
	}

	let { exerciseSessionId }: Props = $props();

	let remaining = $derived(timerStore.getRemainingSeconds(exerciseSessionId));
	let progress = $derived(timerStore.getProgress(exerciseSessionId));
	let formatted = $derived(timerStore.getRemainingFormatted(exerciseSessionId));
	let isActive = $derived(timerStore.isTimerActive(exerciseSessionId));

	const radius = 36;
	const circumference = 2 * Math.PI * radius;
	let strokeDashoffset = $derived(circumference * (1 - progress));
</script>

{#if isActive}
	<div class="flex items-center gap-3 rounded-xl bg-blue-50 p-3 dark:bg-blue-950">
		<div class="relative h-16 w-16 shrink-0">
			<svg class="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
				<circle
					cx="40"
					cy="40"
					r={radius}
					fill="none"
					stroke="currentColor"
					stroke-width="4"
					class="text-gray-200 dark:text-gray-700"
				/>
				<circle
					cx="40"
					cy="40"
					r={radius}
					fill="none"
					stroke="currentColor"
					stroke-width="4"
					stroke-linecap="round"
					stroke-dasharray={circumference}
					stroke-dashoffset={strokeDashoffset}
					class="text-blue-500 transition-[stroke-dashoffset] duration-1000"
				/>
			</svg>
			<span class="absolute inset-0 flex items-center justify-center text-xs font-semibold">
				{formatted}
			</span>
		</div>
		<div class="flex-1">
			<p class="text-sm font-medium text-blue-700 dark:text-blue-300">Pause</p>
		</div>
		<button
			onclick={() => timerStore.skipTimer(exerciseSessionId)}
			class="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
		>
			Überspringen
		</button>
	</div>
{/if}
