import type { Board, Card } from './board';
import { generateId } from '../data/serializer';

export function addCard(board: Board, columnValue: string): Board {
	const columnField = board.viewConfig.columns;
	const values: Record<string, string> = {};
	for (const field of board.fields) {
		values[field.name] = field.name === columnField ? columnValue : (field.default ?? '');
	}
	const newCard: Card = { id: generateId(), values };
	return { ...board, cards: [...board.cards, newCard] };
}

export function deleteCard(board: Board, cardId: string): Board {
	return { ...board, cards: board.cards.filter(card => card.id !== cardId) };
}

export function reorderCard(
	board: Board,
	cardId: string,
	toColumnValue: string,
	insertBeforeId: string | null,
): Board {
	const columnField = board.viewConfig.columns;
	const dragged = board.cards.find(c => c.id === cardId);
	if (!dragged) return board;

	const updatedCard = { ...dragged, values: { ...dragged.values, [columnField]: toColumnValue } };
	const remaining = board.cards.filter(c => c.id !== cardId);

	if (insertBeforeId === null) {
		return { ...board, cards: [...remaining, updatedCard] };
	}

	const targetIdx = remaining.findIndex(c => c.id === insertBeforeId);
	if (targetIdx === -1) {
		return { ...board, cards: [...remaining, updatedCard] };
	}

	const newCards = [...remaining];
	newCards.splice(targetIdx, 0, updatedCard);
	return { ...board, cards: newCards };
}

export function createCard(board: Board, columnValue: string, values: Record<string, string>): Board {
	const columnField = board.viewConfig.columns;
	const cardValues: Record<string, string> = {};
	for (const field of board.fields) {
		if (field.name === columnField) {
			cardValues[field.name] = columnValue;
		} else {
			cardValues[field.name] = values[field.name] ?? field.default ?? '';
		}
	}
	const newCard: Card = { id: generateId(), values: cardValues };
	return { ...board, cards: [...board.cards, newCard] };
}

export function updateCard(board: Board, cardId: string, values: Record<string, string>): Board {
	return {
		...board,
		cards: board.cards.map(card =>
			card.id === cardId
				? { ...card, values: { ...card.values, ...values } }
				: card,
		),
	};
}

export function updateCardField(board: Board, cardId: string, fieldName: string, value: string): Board {
	return {
		...board,
		cards: board.cards.map(card =>
			card.id === cardId
				? { ...card, values: { ...card.values, [fieldName]: value } }
				: card,
		),
	};
}
