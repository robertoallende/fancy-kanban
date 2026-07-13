import { describe, it, expect } from 'vitest';
import { moveCard, addCard, deleteCard, updateCardField, createCard, updateCard } from '../../src/model/mutations';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'doing', 'done'], default: 'inbox' },
		{ name: 'priority', type: 'Select', label: 'Priority', options: ['high', 'low'], default: 'low' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [
		{ id: 'card1', values: { title: 'Alpha', status: 'inbox', priority: 'high' } },
		{ id: 'card2', values: { title: 'Beta', status: 'doing', priority: 'low' } },
		{ id: 'card3', values: { title: 'Gamma', status: 'done', priority: 'low' } },
	],
};

describe('moveCard', () => {
	it('updates the column field value for the target card', () => {
		const result = moveCard(BOARD, 'card1', 'doing');
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.status).toBe('doing');
	});

	it('leaves other fields on the card unchanged', () => {
		const result = moveCard(BOARD, 'card1', 'doing');
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.title).toBe('Alpha');
		expect(card.values.priority).toBe('high');
	});

	it('leaves other cards unchanged', () => {
		const result = moveCard(BOARD, 'card1', 'doing');
		const card2 = result.cards.find(c => c.id === 'card2')!;
		expect(card2.values.status).toBe('doing');
		expect(card2.values.title).toBe('Beta');
	});

	it('leaves board field definitions unchanged', () => {
		const result = moveCard(BOARD, 'card1', 'doing');
		expect(result.fields).toEqual(BOARD.fields);
	});

	it('returns board unchanged if cardId not found', () => {
		const result = moveCard(BOARD, 'nonexistent', 'doing');
		expect(result.cards).toEqual(BOARD.cards);
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		moveCard(BOARD, 'card1', 'doing');
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('addCard', () => {
	it('increases card count by 1', () => {
		const result = addCard(BOARD, 'inbox');
		expect(result.cards.length).toBe(BOARD.cards.length + 1);
	});

	it('new card appears at the end of the cards array', () => {
		const result = addCard(BOARD, 'inbox');
		const newCard = result.cards[result.cards.length - 1];
		expect(newCard.values.status).toBe('inbox');
	});

	it('new card has a unique 8-character id', () => {
		const result = addCard(BOARD, 'inbox');
		const newCard = result.cards[result.cards.length - 1];
		expect(newCard.id).toMatch(/^[a-z0-9]{8}$/);
	});

	it('new card id does not collide with existing cards', () => {
		const result = addCard(BOARD, 'inbox');
		const newId = result.cards[result.cards.length - 1].id;
		const existingIds = BOARD.cards.map(c => c.id);
		expect(existingIds).not.toContain(newId);
	});

	it('sets column field to the given columnValue', () => {
		const result = addCard(BOARD, 'done');
		const newCard = result.cards[result.cards.length - 1];
		expect(newCard.values.status).toBe('done');
	});

	it('sets other fields to their defaults', () => {
		const result = addCard(BOARD, 'inbox');
		const newCard = result.cards[result.cards.length - 1];
		expect(newCard.values.priority).toBe('low');
	});

	it('sets fields with no default to empty string', () => {
		const result = addCard(BOARD, 'inbox');
		const newCard = result.cards[result.cards.length - 1];
		expect(newCard.values.title).toBe('');
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		addCard(BOARD, 'inbox');
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('deleteCard', () => {
	it('removes the card with the given id', () => {
		const result = deleteCard(BOARD, 'card2');
		expect(result.cards.find(c => c.id === 'card2')).toBeUndefined();
	});

	it('decreases card count by 1', () => {
		const result = deleteCard(BOARD, 'card2');
		expect(result.cards.length).toBe(BOARD.cards.length - 1);
	});

	it('leaves all other cards unchanged', () => {
		const result = deleteCard(BOARD, 'card2');
		expect(result.cards.find(c => c.id === 'card1')).toEqual(BOARD.cards[0]);
		expect(result.cards.find(c => c.id === 'card3')).toEqual(BOARD.cards[2]);
	});

	it('returns board unchanged if cardId not found', () => {
		const result = deleteCard(BOARD, 'nonexistent');
		expect(result.cards).toEqual(BOARD.cards);
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		deleteCard(BOARD, 'card1');
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('updateCardField', () => {
	it('updates the specified field value on the target card', () => {
		const result = updateCardField(BOARD, 'card1', 'priority', 'low');
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.priority).toBe('low');
	});

	it('leaves other fields on the target card unchanged', () => {
		const result = updateCardField(BOARD, 'card1', 'priority', 'low');
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.title).toBe('Alpha');
		expect(card.values.status).toBe('inbox');
	});

	it('leaves other cards unchanged', () => {
		const result = updateCardField(BOARD, 'card1', 'priority', 'low');
		expect(result.cards.find(c => c.id === 'card2')).toEqual(BOARD.cards[1]);
	});

	it('returns board unchanged if cardId not found', () => {
		const result = updateCardField(BOARD, 'nonexistent', 'priority', 'low');
		expect(result.cards).toEqual(BOARD.cards);
	});

	it('can set a field to an empty string', () => {
		const result = updateCardField(BOARD, 'card1', 'priority', '');
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.priority).toBe('');
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		updateCardField(BOARD, 'card1', 'title', 'Changed');
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('createCard', () => {
	it('increases card count by 1', () => {
		const result = createCard(BOARD, 'inbox', { title: 'New' });
		expect(result.cards.length).toBe(BOARD.cards.length + 1);
	});

	it('sets the column field to the given columnValue', () => {
		const result = createCard(BOARD, 'done', { title: 'New' });
		const card = result.cards[result.cards.length - 1];
		expect(card.values.status).toBe('done');
	});

	it('sets provided field values on the new card', () => {
		const result = createCard(BOARD, 'inbox', { title: 'Hello', priority: 'high' });
		const card = result.cards[result.cards.length - 1];
		expect(card.values.title).toBe('Hello');
		expect(card.values.priority).toBe('high');
	});

	it('falls back to field default for missing values', () => {
		const result = createCard(BOARD, 'inbox', {});
		const card = result.cards[result.cards.length - 1];
		expect(card.values.priority).toBe('low');
	});

	it('generates a unique id', () => {
		const result = createCard(BOARD, 'inbox', {});
		const card = result.cards[result.cards.length - 1];
		expect(card.id).toMatch(/^[a-z0-9]{8}$/);
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		createCard(BOARD, 'inbox', { title: 'X' });
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('updateCard', () => {
	it('updates multiple fields on the target card at once', () => {
		const result = updateCard(BOARD, 'card1', { title: 'New Title', priority: 'low' });
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.title).toBe('New Title');
		expect(card.values.priority).toBe('low');
	});

	it('leaves unmentioned fields unchanged', () => {
		const result = updateCard(BOARD, 'card1', { title: 'New Title' });
		const card = result.cards.find(c => c.id === 'card1')!;
		expect(card.values.status).toBe('inbox');
	});

	it('leaves other cards unchanged', () => {
		const result = updateCard(BOARD, 'card1', { title: 'New Title' });
		expect(result.cards.find(c => c.id === 'card2')).toEqual(BOARD.cards[1]);
	});

	it('does not mutate the original board', () => {
		const original = JSON.stringify(BOARD);
		updateCard(BOARD, 'card1', { title: 'Changed' });
		expect(JSON.stringify(BOARD)).toBe(original);
	});
});

describe('composition', () => {
	it('moveCard after deleteCard produces the expected result', () => {
		const afterDelete = deleteCard(BOARD, 'card3');
		const afterMove = moveCard(afterDelete, 'card1', 'done');
		expect(afterMove.cards.find(c => c.id === 'card3')).toBeUndefined();
		expect(afterMove.cards.find(c => c.id === 'card1')!.values.status).toBe('done');
	});

	it('addCard then updateCardField updates the new card', () => {
		const afterAdd = addCard(BOARD, 'inbox');
		const newCard = afterAdd.cards[afterAdd.cards.length - 1];
		const afterUpdate = updateCardField(afterAdd, newCard.id, 'title', 'New Task');
		expect(afterUpdate.cards.find(c => c.id === newCard.id)!.values.title).toBe('New Task');
	});
});
