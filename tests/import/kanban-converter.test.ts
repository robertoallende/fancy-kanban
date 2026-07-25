import { describe, it, expect } from 'vitest';
import { convertKanbanBoard } from '../../src/import/kanban-converter';
import type { KanbanBoard } from '../../src/import/kanban-parser';

const SAMPLE: KanbanBoard = {
	lanes: [
		{
			title: 'Backlog',
			complete: false,
			cards: [
				{ title: 'Research competitors', body: '', checked: false },
				{ title: 'Write design doc', body: '', checked: false },
			],
		},
		{
			title: 'In Progress',
			complete: false,
			cards: [
				{ title: 'Fix navigation bug', body: 'Additional notes here', checked: false },
			],
		},
		{
			title: 'Done',
			complete: true,
			cards: [
				{ title: 'Project kickoff', body: '', checked: true },
			],
		},
	],
};

describe('convertKanbanBoard', () => {
	describe('schema', () => {
		it('sets the board title', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.title).toBe('My Board');
		});

		it('sets version to 2', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.version).toBe(2);
		});

		it('generates three fields: title, status, description', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.map(f => f.name)).toEqual(['title', 'status', 'description']);
		});

		it('title field is type Text', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.find(f => f.name === 'title')?.type).toBe('Text');
		});

		it('status field is type Select', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.find(f => f.name === 'status')?.type).toBe('Select');
		});

		it('description field is type Textarea', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.find(f => f.name === 'description')?.type).toBe('Textarea');
		});

		it('status options are derived from lane titles', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			const status = board.fields.find(f => f.name === 'status')!;
			expect(status.options).toEqual(['backlog', 'in-progress', 'done']);
		});

		it('default status is the first lane', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			const status = board.fields.find(f => f.name === 'status')!;
			expect(status.default).toBe('backlog');
		});

		it('viewConfig columns is status', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.viewConfig.columns).toBe('status');
		});

		it('viewConfig cardFields includes description', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.viewConfig.cardFields).toEqual(['description']);
		});

		it('viewConfig cardLabels is false', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.viewConfig.cardLabels).toBe(false);
		});
	});

	describe('cards', () => {
		it('produces one card per source card', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.cards.length).toBe(4);
		});

		it('each card has a non-empty id', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.cards.every(c => c.id.length > 0)).toBe(true);
		});

		it('each card has a unique id', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			const ids = board.cards.map(c => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it('card title matches source title', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.cards[0].values.title).toBe('Research competitors');
		});

		it('card status matches the derived lane name', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.cards[0].values.status).toBe('backlog');
		});

		it('cards in the In Progress lane have status in-progress', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			const card = board.cards.find(c => c.values.title === 'Fix navigation bug')!;
			expect(card.values.status).toBe('in-progress');
		});

		it('card body maps to description field', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			const card = board.cards.find(c => c.values.title === 'Fix navigation bug')!;
			expect(card.values.description).toBe('Additional notes here');
		});

		it('cards without body have empty description', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.cards[0].values.description).toBe('');
		});

		it('skips cards with empty title', () => {
			const kb: KanbanBoard = {
				lanes: [{ title: 'To Do', complete: false, cards: [
					{ title: '', body: '', checked: false },
					{ title: 'Real task', body: '', checked: false },
				]}],
			};
			const board = convertKanbanBoard(kb, 'Test');
			expect(board.cards.length).toBe(1);
		});
	});

	describe('lane title normalisation', () => {
		it('lowercases lane titles for status values', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.find(f => f.name === 'status')?.options).toContain('backlog');
		});

		it('replaces spaces with hyphens', () => {
			const board = convertKanbanBoard(SAMPLE, 'My Board');
			expect(board.fields.find(f => f.name === 'status')?.options).toContain('in-progress');
		});

		it('handles lanes with non-Latin characters', () => {
			const kb: KanbanBoard = {
				lanes: [{ title: 'По делу', complete: false, cards: [] }],
			};
			const board = convertKanbanBoard(kb, 'Test');
			expect(board.fields.find(f => f.name === 'status')?.options?.[0]).toBe('по-делу');
		});
	});
});
