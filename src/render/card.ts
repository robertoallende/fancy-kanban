import type { Board, Card } from '../model/board';
import { splitLinks } from '../data/link';

export function effectiveCardTitle(board: Board): string | null {
	if (board.viewConfig.cardTitle !== undefined) {
		const name = board.viewConfig.cardTitle;
		if (!name) return null;
		return board.fields.some(f => f.name === name) ? name : null;
	}
	const first = board.fields.find(
		f => f.name !== '_id' && f.name !== board.viewConfig.columns,
	);
	return first?.name ?? null;
}

export function effectiveCardFields(board: Board): string[] {
	const titleField = effectiveCardTitle(board);
	return (board.viewConfig.cardFields ?? []).filter(
		name => name !== titleField && board.fields.some(f => f.name === name),
	);
}

export function renderCard(card: Card, board: Board): HTMLElement {
	const container = createEl('div', { cls: ['fk-card', 'fk-card--draggable'] });
	container.dataset.cardId = card.id;

	const titleFieldName = effectiveCardTitle(board);
	if (titleFieldName !== null) {
		const title = createEl('div', { cls: 'fk-card__title', text: card.values[titleFieldName] ?? '' });
		container.appendChild(title);
	}

	const secondaryFields = effectiveCardFields(board)
		.map(name => board.fields.find(f => f.name === name))
		.filter((f): f is NonNullable<typeof f> => f !== undefined);

	if (secondaryFields.length) {
		const fieldsEl = createEl('div', { cls: 'fk-card__fields' });
		const showLabels = board.viewConfig.cardLabels !== false;

		for (const field of secondaryFields) {
			const value = card.values[field.name] ?? '';
			if (!value) continue;

			const row = createEl('div', { cls: 'fk-card__field' });

			if (showLabels) {
				const labelEl = createEl('span', { cls: 'fk-card__field-label', text: field.label });
				row.appendChild(labelEl);
			}

			if (field.type === 'Link') {
				const linksEl = createEl('span', { cls: 'fk-card__field-links' });
				for (const item of splitLinks(value)) {
					const span = createEl('span', { cls: 'fk-card__field-link', text: item });
					span.dataset.href = item;
					linksEl.appendChild(span);
				}
				row.appendChild(linksEl);
			} else {
				const valueEl = createEl('span', { cls: 'fk-card__field-value', text: value });
				row.appendChild(valueEl);
			}

			fieldsEl.appendChild(row);
		}

		if (fieldsEl.childElementCount) container.appendChild(fieldsEl);
	}

	return container;
}
