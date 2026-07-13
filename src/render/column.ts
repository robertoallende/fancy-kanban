import type { Card, FieldDefinition } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	name: string,
	label: string,
	cards: Card[],
	fields: FieldDefinition[],
): HTMLElement {
	const container = activeDocument.createElement('div');
	container.classList.add('fk-column');
	container.dataset.columnValue = name;

	const header = activeDocument.createElement('div');
	header.classList.add('fk-column__header');

	const title = activeDocument.createElement('span');
	title.classList.add('fk-column__title');
	title.textContent = label;

	const count = activeDocument.createElement('span');
	count.classList.add('fk-column__count');
	count.textContent = String(cards.length);

	header.appendChild(title);
	header.appendChild(count);

	const cardsContainer = activeDocument.createElement('div');
	cardsContainer.classList.add('fk-column__cards');

	for (const card of cards) {
		cardsContainer.appendChild(renderCard(card, fields));
	}

	const addBtn = activeDocument.createElement('button');
	addBtn.classList.add('fk-col__add-btn');
	addBtn.textContent = '+ Add card';

	container.appendChild(header);
	container.appendChild(cardsContainer);
	container.appendChild(addBtn);

	return container;
}
