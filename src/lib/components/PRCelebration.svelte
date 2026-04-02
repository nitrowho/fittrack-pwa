<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { DetectedPR } from '$lib/domain/workouts/personal-records.js';
	import { formatWeight, formatVolume } from '$lib/services/formatter.js';

	interface Props {
		prs: DetectedPR[];
		exerciseName: string;
		ondismiss: () => void;
	}

	let { prs, exerciseName, ondismiss }: Props = $props();

	const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

	// Regenerate confetti each time new PRs arrive so the animation looks fresh
	let confettiPieces = $derived(
		prs.length > 0
			? Array.from({ length: 40 }, () => ({
					x: Math.random() * 100,
					delay: Math.random() * 600,
					color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
					size: 4 + Math.random() * 6
				}))
			: []
	);

	function formatPRValue(pr: DetectedPR): string {
		switch (pr.type) {
			case 'weight':
			case 'e1rm':
				return formatWeight(pr.value);
			case 'reps':
				return `${pr.value} Wdh`;
			case 'volume':
				return formatVolume(pr.value);
		}
	}

	$effect(() => {
		if (prs.length > 0) {
			const timer = setTimeout(ondismiss, 4000);
			return () => clearTimeout(timer);
		}
	});
</script>

{#if prs.length > 0}
	<!-- Confetti overlay -->
	<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
		{#each confettiPieces as piece}
			<div
				class="confetti-piece absolute"
				style:left="{piece.x}%"
				style:background-color={piece.color}
				style:width="{piece.size}px"
				style:height="{piece.size * 1.4}px"
				style:animation-delay="{piece.delay}ms"
			></div>
		{/each}
	</div>

	<!-- Toast -->
	<button
		type="button"
		class="fixed inset-x-4 top-4 z-50 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-4 text-left shadow-lg"
		in:fly={{ y: -60, duration: 400 }}
		out:fade={{ duration: 200 }}
		onclick={ondismiss}
	>
		<div class="flex items-start gap-3">
			<span class="text-2xl" aria-hidden="true">🏆</span>
			<div class="min-w-0 flex-1">
				<p class="font-bold text-white">Neuer Rekord!</p>
				<p class="mt-0.5 text-sm font-medium text-white/90">{exerciseName}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each prs as pr}
						<span class="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
							{pr.label}: {formatPRValue(pr)}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</button>
{/if}

<style>
	@keyframes confetti-fall {
		0% {
			transform: translateY(-10vh) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(110vh) rotate(720deg);
			opacity: 0;
		}
	}

	.confetti-piece {
		border-radius: 2px;
		animation: confetti-fall 2.5s ease-in forwards;
	}

	@media (prefers-reduced-motion: reduce) {
		.confetti-piece {
			animation: none;
			display: none;
		}
	}
</style>
