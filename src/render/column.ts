import type { Board, Card } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	parent: HTMLElement,
	name: string,
	label: string,
	cards: Card[],
	board: Board,
): HTMLElement {
	const container = parent.createDiv({ cls: 'fk-column' });
	container.dataset.columnValue = name;

	const header = container.createDiv({ cls: 'fk-column__header' });
	header.createSpan({ cls: 'fk-column__title', text: label });
	header.createSpan({ cls: 'fk-column__count', text: String(cards.length) });

	const cardsContainer = container.createDiv({ cls: 'fk-column__cards' });

	for (const card of cards) {
		renderCard(cardsContainer, card, board);
	}

	container.createEl('button', { cls: 'fk-col__add-btn', text: '+ Add card' });

	return container;
}
