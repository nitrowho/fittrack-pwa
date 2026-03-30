<script lang="ts">
	import {
		buildCalendarGrid,
		getMonthLabel,
		getWeekdayHeaders,
		type CalendarDay
	} from '$lib/application/history/calendar.js';
	import type { CalendarDayData } from '$lib/application/history/queries.js';
	import { formatCalendarDate, formatMonthName } from '$lib/services/formatter.js';
	import { MUSCLE_GROUP_COLORS, type MuscleGroup } from '$lib/models/types.js';

	interface Props {
		year: number;
		month: number;
		trainingDays: Map<string, CalendarDayData>;
		selectedDate: string | null;
		onselect: (dateKey: string | null) => void;
		onnavigate: (year: number, month: number) => void;
	}

	let { year, month, trainingDays, selectedDate, onselect, onnavigate }: Props = $props();

	let grid = $derived(buildCalendarGrid(year, month));
	let monthLabel = $derived(getMonthLabel(year, month));
	let weekdays = getWeekdayHeaders();

	let totalSessions = $derived(() => {
		let count = 0;
		for (const day of trainingDays.values()) {
			count += day.sessionCount;
		}
		return count;
	});

	let summaryText = $derived.by(() => {
		if (selectedDate) {
			const dayData = trainingDays.get(selectedDate);
			const count = dayData?.sessionCount ?? 0;
			const [yearStr, monthStr, dayStr] = selectedDate.split('-');
			const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
			const dateLabel = formatCalendarDate(date);
			if (count === 0) return `Keine Einheiten am ${dateLabel}`;
			return `${count} ${count === 1 ? 'Einheit' : 'Einheiten'} am ${dateLabel}`;
		}
		const count = totalSessions();
		const monthName = formatMonthName(year, month);
		if (count === 0) return `Keine Einheiten im ${monthName}`;
		return `${count} ${count === 1 ? 'Einheit' : 'Einheiten'} im ${monthName}`;
	});

	function navigatePrev() {
		if (month === 0) {
			onnavigate(year - 1, 11);
		} else {
			onnavigate(year, month - 1);
		}
	}

	function navigateNext() {
		if (month === 11) {
			onnavigate(year + 1, 0);
		} else {
			onnavigate(year, month + 1);
		}
	}

	function jumpToToday() {
		const now = new Date();
		onnavigate(now.getFullYear(), now.getMonth());
	}

	function handleDayClick(day: CalendarDay) {
		if (!day.isCurrentMonth) return;
		if (selectedDate === day.dateKey) {
			onselect(null);
		} else {
			onselect(day.dateKey);
		}
	}

	function getDotColors(dateKey: string): string[] {
		const data = trainingDays.get(dateKey);
		if (!data) return [];
		const groups = data.muscleGroups.slice(0, 3);
		if (groups.length === 0) return ['var(--color-muscle-ruecken)'];
		return groups.map((g: MuscleGroup) => MUSCLE_GROUP_COLORS[g]);
	}
</script>

<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<!-- Month navigation -->
	<div class="mb-3 flex items-center justify-between">
		<button
			onclick={navigatePrev}
			class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
			aria-label="Vorheriger Monat"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<button
			onclick={jumpToToday}
			class="text-sm font-semibold active:text-blue-500"
		>
			{monthLabel}
		</button>
		<button
			onclick={navigateNext}
			class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
			aria-label="Nächster Monat"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>

	<!-- Weekday headers -->
	<div class="mb-1 grid grid-cols-7 text-center">
		{#each weekdays as day}
			<span class="text-xs font-medium text-gray-400 dark:text-gray-500">{day}</span>
		{/each}
	</div>

	<!-- Day grid -->
	{#each grid as week}
		<div class="grid grid-cols-7 text-center">
			{#each week as day}
				{@const hasTraining = trainingDays.has(day.dateKey)}
				{@const isSelected = selectedDate === day.dateKey}
				{@const dots = getDotColors(day.dateKey)}
				<button
					onclick={() => handleDayClick(day)}
					disabled={!day.isCurrentMonth}
					class="relative flex flex-col items-center py-1"
					aria-label="{day.dayOfMonth}. {hasTraining ? 'Training absolviert' : ''}"
				>
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors
							{isSelected
								? 'bg-blue-500 font-semibold text-white'
								: day.isToday
									? 'font-semibold text-blue-500 ring-1 ring-blue-500'
									: day.isCurrentMonth
										? 'text-gray-900 dark:text-gray-100'
										: 'text-gray-300 dark:text-gray-700'}"
					>
						{day.dayOfMonth}
					</span>
					{#if dots.length > 0 && day.isCurrentMonth}
						<div class="mt-0.5 flex gap-0.5">
							{#each dots as color}
								<span
									class="block h-1 w-1 rounded-full"
									style="background-color: {color}"
								></span>
							{/each}
						</div>
					{:else}
						<div class="mt-0.5 h-1"></div>
					{/if}
				</button>
			{/each}
		</div>
	{/each}

	<!-- Summary -->
	<p class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
		{summaryText}
	</p>
</div>
