import type { Card, FieldDefinition } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	name: string,
	label: string,
	cards: Card[],
	fields: FieldDefinition[],
): HTMLElement {
	const container = document.createElement('div');
	container.classList.add('fk-column');
	container.dataset.columnValue = name;

	const header = document.createElement('div');
	header.classList.add('fk-column__header');

	const title = document.createElement('span');
	title.classList.add('fk-column__title');
	title.textContent = label;

	const count = document.createElement('span');
	count.classList.add('fk-column__count');
	count.textContent = String(cards.length);

	header.appendChild(title);
	header.appendChild(count);

	const cardsContainer = document.createElement('div');
	cardsContainer.classList.add('fk-column__cards');

	for (const card of cards) {
		cardsContainer.appendChild(renderCard(card, fields));
	}

	const addBtn = document.createElement('button');
	addBtn.classList.add('fk-col__add-btn');
	addBtn.textContent = '+ Add card';

	container.appendChild(header);
	container.appendChild(cardsContainer);
	container.appendChild(addBtn);

	return container;
}
