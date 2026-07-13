import type { Card, FieldDefinition } from '../model/board';

export function renderCard(card: Card, fields: FieldDefinition[]): HTMLElement {
	const container = document.createElement('div');
	container.classList.add('fk-card');
	container.setAttribute('draggable', 'true');
	container.dataset.cardId = card.id;

	const visibleFields = fields.filter(f => f.name !== '_id');
	const [titleField, ...secondaryFields] = visibleFields;

	const title = document.createElement('div');
	title.classList.add('fk-card__title');
	title.textContent = card.values[titleField?.name] ?? '';
	title.dataset.cardId = card.id;
	title.dataset.fieldName = titleField?.name ?? '';
	container.appendChild(title);

	for (const field of secondaryFields) {
		const value = card.values[field.name];
		if (value === undefined || value === null || value === '') continue;

		const row = document.createElement('div');
		row.classList.add('fk-card__field');
		row.dataset.fieldName = field.name;

		const label = document.createElement('span');
		label.classList.add('fk-card__field-label');
		label.textContent = field.label;

		const val = document.createElement('span');
		val.classList.add('fk-card__field-value');
		val.textContent = value;

		row.appendChild(label);
		row.appendChild(val);
		container.appendChild(row);
	}

	const deleteBtn = document.createElement('button');
	deleteBtn.classList.add('fk-card__delete');
	deleteBtn.textContent = '×';
	container.appendChild(deleteBtn);

	return container;
}
