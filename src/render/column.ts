import type { Board, Card } from '../model/board';
import { renderCard } from './card';

export function renderColumn(
	parent: HTMLElement,
	name: string,
	label: string,
	cards: Card[],
	board: Board,
	laneValue?: string,
): HTMLElement {
	const container = parent.createDiv({ cls: 'fk-column' });
	container.dataset.columnValue = name;
	if (laneValue !== undefined) container.dataset.laneValue = laneValue;

	if (laneValue === undefined) {
		const header = container.createDiv({ cls: 'fk-column__header' });
		header.createSpan({ cls: 'fk-column__title', text: label });
		header.createSpan({ cls: 'fk-column__count', text: String(cards.length) });
	}

	const cardsContainer = container.createDiv({ cls: 'fk-column__cards' });

	const limit = board.viewConfig.cardLimit ?? 0;
	const hasLimit = limit > 0 && cards.length > limit;

	for (let i = 0; i < cards.length; i++) {
		const cardEl = renderCard(cardsContainer, cards[i], board);
		if (hasLimit && i >= limit) {
			cardEl.classList.add('fk-hidden');
		}
	}

	const footer = container.createDiv({ cls: 'fk-col__footer' });
	footer.createEl('button', { cls: 'fk-col__add-btn', text: '+ Add card' });

	if (hasLimit) {
		const hidden = cards.length - limit;
		const showMoreBtn = footer.createEl('button', {
			cls: 'fk-col__show-more',
			text: `Show ${hidden} more`,
		});
		showMoreBtn.addEventListener('click', () => {
			cardsContainer.querySelectorAll('.fk-hidden').forEach(el => el.classList.remove('fk-hidden'));
			showMoreBtn.remove();
		});
	}

	return container;
}
