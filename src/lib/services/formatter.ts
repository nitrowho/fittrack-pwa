const numberFormat = new Intl.NumberFormat('de-DE', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 1
});

const preciseNumberFormat = new Intl.NumberFormat('de-DE', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2
});

const volumeFormat = new Intl.NumberFormat('de-DE', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});

const dateFormat = new Intl.DateTimeFormat('de-DE', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

const shortDateFormat = new Intl.DateTimeFormat('de-DE', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

export function formatWeight(kg: number): string {
	return `${numberFormat.format(kg)} kg`;
}

export function formatWeightPrecise(kg: number): string {
	return `${preciseNumberFormat.format(kg)} kg`;
}

export function formatVolume(kg: number): string {
	return `${volumeFormat.format(kg)} kg`;
}

export function formatDate(date: Date): string {
	return dateFormat.format(date);
}

export function formatShortDate(date: Date): string {
	return shortDateFormat.format(date);
}

export function formatDuration(seconds: number): string {
	const totalMins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	if (totalMins >= 60) {
		const hours = Math.floor(totalMins / 60);
		const mins = totalMins % 60;
		return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
	return `${totalMins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRestDuration(seconds: number): string {
	const totalMins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (totalMins >= 60) {
		const hours = Math.floor(totalMins / 60);
		const mins = totalMins % 60;
		if (secs === 0 && mins === 0) return `${hours} Std`;
		if (secs === 0) return `${hours}:${mins.toString().padStart(2, '0')} Std`;
		return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} Std`;
	}
	if (secs === 0) return `${totalMins} Min`;
	return `${totalMins}:${secs.toString().padStart(2, '0')} Min`;
}

export function formatTimer(seconds: number): string {
	const s = Math.max(0, Math.ceil(seconds));
	const mins = Math.floor(s / 60);
	const secs = s % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatSetsReps(sets: number, lower: number, upper: number): string {
	return `${sets} \u00d7 ${lower}\u2013${upper}`;
}

export function formatVolumeDelta(delta: number): string {
	const prefix = delta > 0 ? '+' : '';
	return `${prefix}${volumeFormat.format(delta)} kg`;
}

const calendarDateFormat = new Intl.DateTimeFormat('de-DE', {
	day: 'numeric',
	month: 'long'
});

const monthNameFormat = new Intl.DateTimeFormat('de-DE', {
	month: 'long'
});

export function formatCalendarDate(date: Date): string {
	return calendarDateFormat.format(date);
}

export function formatMonthName(year: number, month: number): string {
	return monthNameFormat.format(new Date(year, month, 1));
}
