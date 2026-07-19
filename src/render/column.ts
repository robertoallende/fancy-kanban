import type { Board, Card } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	name: string,
	label: string,
	cards: Card[],
	board: Board,
): HTMLElement {
	const container = createEl('div', { cls: 'fk-column' });
	container.dataset.columnValue = name;

	const header = createEl('div', { cls: 'fk-column__header' });

	const title = createEl('span', { cls: 'fk-column__title', text: label });

	const count = createEl('span', { cls: 'fk-column__count', text: String(cards.length) });

	header.appendChild(title);
	header.appendChild(count);

	const cardsContainer = createEl('div', { cls: 'fk-column__cards' });

	for (const card of cards) {
		cardsContainer.appendChild(renderCard(card, board));
	}

	const addBtn = createEl('button', { cls: 'fk-col__add-btn', text: '+ Add card' });

	container.appendChild(header);
	container.appendChild(cardsContainer);
	container.appendChild(addBtn);

	return container;
}
