import type { Board, FieldDefinition } from '../model/board';
import { generateId } from '../data/serializer';
import type { KanbanBoard } from './kanban-parser';

function deriveStatusValue(laneTitle: string): string {
	return laneTitle
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

export function convertKanbanBoard(kb: KanbanBoard, title: string): Board {
	const statusOptions = kb.lanes.map(l => deriveStatusValue(l.title));
	const allCards = kb.lanes.flatMap(l => l.cards);
	const hasDate = allCards.some(c => c.date);

	const fields: FieldDefinition[] = [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: statusOptions, default: statusOptions[0] ?? '' },
		...(hasDate ? [{ name: 'due', type: 'Date' as const, label: 'Due' }] : []),
		{ name: 'description', type: 'Textarea', label: 'Description' },
	];

	const cardFields = [
		...(hasDate ? ['due'] : []),
		'description',
	];

	const cards = kb.lanes.flatMap(lane => {
		const statusValue = deriveStatusValue(lane.title);
		return lane.cards
			.filter(card => card.title.length > 0)
			.map(card => ({
				id: generateId(),
				values: {
					title: card.title,
					status: statusValue,
					...(hasDate ? { due: card.date ?? '' } : {}),
					description: card.body,
				},
			}));
	});

	return {
		title,
		version: 2,
		fields,
		rawWorkflow: '',
		viewConfig: {
			columns: 'status',
			cardFields,
			cardLabels: false,
		},
		cards,
	};
}
