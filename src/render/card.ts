import type { Board, Card } from '../model/board';
import { splitLinks } from '../data/link';

export function effectiveCardFields(board: Board): string[] {
	const explicit = board.viewConfig.cardFields?.filter(
		name => board.fields.some(f => f.name === name),
	);
	if (explicit?.length) return explicit;
	const first = board.fields.find(
		f => f.name !== '_id' && f.name !== board.viewConfig.columns,
	);
	return first ? [first.name] : [];
}

export function renderCard(card: Card, board: Board): HTMLElement {
	const container = activeDocument.createElement('div');
	container.classList.add('fk-card');
	container.classList.add('fk-card--draggable');
	container.dataset.cardId = card.id;

	const cardFields = effectiveCardFields(board);
	const [titleFieldName, ...secondaryNames] = cardFields;

	const titleField = board.fields.find(f => f.name === titleFieldName);
	const title = activeDocument.createElement('div');
	title.classList.add('fk-card__title');
	title.textContent = card.values[titleField?.name ?? ''] ?? '';
	container.appendChild(title);

	const secondaryFields = secondaryNames
		.map(name => board.fields.find(f => f.name === name))
		.filter((f): f is NonNullable<typeof f> => f !== undefined);

	if (secondaryFields.length) {
		const fieldsEl = activeDocument.createElement('div');
		fieldsEl.classList.add('fk-card__fields');

		for (const field of secondaryFields) {
			const value = card.values[field.name] ?? '';
			if (!value) continue;

			const row = activeDocument.createElement('div');
			row.classList.add('fk-card__field');

			const labelEl = activeDocument.createElement('span');
			labelEl.classList.add('fk-card__field-label');
			labelEl.textContent = field.label;
			row.appendChild(labelEl);

			if (field.type === 'Link') {
				const linksEl = activeDocument.createElement('span');
				linksEl.classList.add('fk-card__field-links');
				for (const item of splitLinks(value)) {
					const span = activeDocument.createElement('span');
					span.classList.add('fk-card__field-link');
					span.dataset.href = item;
					span.textContent = item;
					linksEl.appendChild(span);
				}
				row.appendChild(linksEl);
			} else {
				const valueEl = activeDocument.createElement('span');
				valueEl.classList.add('fk-card__field-value');
				valueEl.textContent = value;
				row.appendChild(valueEl);
			}

			fieldsEl.appendChild(row);
		}

		if (fieldsEl.childElementCount) container.appendChild(fieldsEl);
	}

	return container;
}
