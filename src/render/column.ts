import type { Board, Card } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	parent: HTMLElement,
	name: string,
	label: string,
	cards: Card[],
	board: Board,
): HTMLElement {
	const container = parent.createEl('div', { cls: 'fk-column' });
	container.dataset.columnValue = name;

	const header = container.createEl('div', { cls: 'fk-column__header' });
	header.createEl('span', { cls: 'fk-column__title', text: label });
	header.createEl('span', { cls: 'fk-column__count', text: String(cards.length) });

	const cardsContainer = container.createEl('div', { cls: 'fk-column__cards' });

	for (const card of cards) {
		renderCard(cardsContainer, card, board);
	}

	container.createEl('button', { cls: 'fk-col__add-btn', text: '+ Add card' });

	return container;
}
