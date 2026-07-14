import type { Card, FieldDefinition } from '../model/board';

export function renderCard(card: Card, fields: FieldDefinition[]): HTMLElement {
	const container = activeDocument.createElement('div');
	container.classList.add('fk-card');
	container.classList.add('fk-card--draggable');
	container.dataset.cardId = card.id;

	const titleField = fields.find(f => f.name !== '_id');

	const title = activeDocument.createElement('div');
	title.classList.add('fk-card__title');
	title.textContent = card.values[titleField?.name ?? ''] ?? '';
	container.appendChild(title);

	return container;
}
