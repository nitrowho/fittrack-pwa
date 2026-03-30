export interface CalendarDay {
	date: Date;
	dayOfMonth: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	dateKey: string;
}

export type CalendarWeek = CalendarDay[];

const monthLabelFormat = new Intl.DateTimeFormat('de-DE', {
	month: 'long',
	year: 'numeric'
});

export function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function buildCalendarGrid(year: number, month: number): CalendarWeek[] {
	const today = new Date();
	const todayKey = toDateKey(today);

	const firstOfMonth = new Date(year, month, 1);
	// Monday-start: convert getDay() (0=Sun) to Monday-based index (0=Mon)
	const startDow = (firstOfMonth.getDay() + 6) % 7;

	const daysInMonth = new Date(year, month + 1, 0).getDate();

	const days: CalendarDay[] = [];

	// Leading days from previous month
	for (let i = startDow - 1; i >= 0; i--) {
		const date = new Date(year, month, -i);
		days.push({
			date,
			dayOfMonth: date.getDate(),
			isCurrentMonth: false,
			isToday: false,
			dateKey: toDateKey(date)
		});
	}

	// Current month days
	for (let d = 1; d <= daysInMonth; d++) {
		const date = new Date(year, month, d);
		const dateKey = toDateKey(date);
		days.push({
			date,
			dayOfMonth: d,
			isCurrentMonth: true,
			isToday: dateKey === todayKey,
			dateKey
		});
	}

	// Trailing days to complete the last week
	const remaining = 7 - (days.length % 7);
	if (remaining < 7) {
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			days.push({
				date,
				dayOfMonth: date.getDate(),
				isCurrentMonth: false,
				isToday: false,
				dateKey: toDateKey(date)
			});
		}
	}

	// Split into weeks
	const weeks: CalendarWeek[] = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push(days.slice(i, i + 7));
	}

	return weeks;
}

export function getMonthLabel(year: number, month: number): string {
	return monthLabelFormat.format(new Date(year, month, 1));
}

export function getWeekdayHeaders(): string[] {
	return ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
}
