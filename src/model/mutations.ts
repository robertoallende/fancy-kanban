import type { Board, Card } from './board';
import { generateId } from '../data/serializer';

export function moveCard(board: Board, cardId: string, toValue: string): Board {
	const columnField = board.viewConfig.columns;
	return {
		...board,
		cards: board.cards.map(card =>
			card.id === cardId
				? { ...card, values: { ...card.values, [columnField]: toValue } }
				: card,
		),
	};
}

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
