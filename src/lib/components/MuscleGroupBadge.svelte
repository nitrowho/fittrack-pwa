<script lang="ts">
	import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '$lib/models/types.js';

	interface Props {
		muscleGroup: MuscleGroup | null;
	}

	let { muscleGroup }: Props = $props();

	const colorClasses: Record<MuscleGroup, string> = {
		ruecken: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
		beine: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
		brust: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
		arme: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
		schulter: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
	};
</script>

<span
	class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {muscleGroup
		? colorClasses[muscleGroup]
		: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
>
	{muscleGroup ? MUSCLE_GROUP_LABELS[muscleGroup] : 'Sonstige'}
</span>
