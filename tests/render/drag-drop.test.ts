// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mountBoard } from '../../src/render/mount';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'doing', 'done'], default: 'inbox' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [
		{ id: 'c1', values: { title: 'Alpha', status: 'inbox' } },
		{ id: 'c2', values: { title: 'Beta', status: 'doing' } },
	],
};

const BOARD_WITH_WORKFLOW: Board = {
	...BOARD,
	rawWorkflow: 'inbox→doing, doing→done',
};

function makeEl(board = BOARD) {
	const el = document.createElement('div');
	const save = vi.fn().mockResolvedValue(undefined);
	mountBoard(el, board, save);
	return { el, save };
}

function getCard(el: HTMLElement, id: string) {
	return el.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
}

function getColumn(el: HTMLElement, value: string) {
	return el.querySelector(`[data-column-value="${value}"]`) as HTMLElement;
}

describe('DOM attributes', () => {
	it('each .fk-card has data-card-id set to card.id', () => {
		const { el } = makeEl();
		expect(getCard(el, 'c1')).not.toBeNull();
		expect(getCard(el, 'c2')).not.toBeNull();
	});

	it('each .fk-card has draggable="true"', () => {
		const { el } = makeEl();
		expect(getCard(el, 'c1').getAttribute('draggable')).toBe('true');
	});

	it('each .fk-column has data-column-value', () => {
		const { el } = makeEl();
		expect(getColumn(el, 'inbox')).not.toBeNull();
		expect(getColumn(el, 'doing')).not.toBeNull();
		expect(getColumn(el, 'done')).not.toBeNull();
	});
});

describe('drag lifecycle', () => {
	it('dragstart adds .fk-card--dragging to the card', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		expect(card.classList.contains('fk-card--dragging')).toBe(true);
	});

	it('dragend removes .fk-card--dragging from all cards', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		card.dispatchEvent(new Event('dragend', { bubbles: true }));
		expect(card.classList.contains('fk-card--dragging')).toBe(false);
	});

	it('dragover adds .fk-column--drag-over to the target column', () => {
		const { el } = makeEl();
		const col = getColumn(el, 'doing');
		col.dispatchEvent(new Event('dragover', { bubbles: true }));
		expect(col.classList.contains('fk-column--drag-over')).toBe(true);
	});

	it('dragover removes .fk-column--drag-over from other columns', () => {
		const { el } = makeEl();
		const inbox = getColumn(el, 'inbox');
		const doing = getColumn(el, 'doing');
		inbox.dispatchEvent(new Event('dragover', { bubbles: true }));
		doing.dispatchEvent(new Event('dragover', { bubbles: true }));
		expect(inbox.classList.contains('fk-column--drag-over')).toBe(false);
		expect(doing.classList.contains('fk-column--drag-over')).toBe(true);
	});

	it('dragleave removes .fk-column--drag-over from the column', () => {
		const { el } = makeEl();
		const col = getColumn(el, 'inbox');
		col.dispatchEvent(new Event('dragover', { bubbles: true }));
		col.dispatchEvent(new Event('dragleave', { bubbles: true }));
		expect(col.classList.contains('fk-column--drag-over')).toBe(false);
	});
});

describe('drop — allowed transition', () => {
	it('dispatches reorderCard when dropping on a different column', () => {
		const { el, save } = makeEl();
		const card = getCard(el, 'c1');
		const targetCol = getColumn(el, 'done');

		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		targetCol.dispatchEvent(new Event('drop', { bubbles: true }));

		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards.find(c => c.id === 'c1')!.values.status).toBe('done');
	});

	it('dispatches reorderCard when dropping on the same column (reorder)', () => {
		const { el, save } = makeEl();
		const card = getCard(el, 'c1');
		const sameCol = getColumn(el, 'inbox');

		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		sameCol.dispatchEvent(new Event('drop', { bubbles: true }));

		expect(save).toHaveBeenCalledTimes(1);
	});

	it('clears .fk-column--drag-over after drop', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		const targetCol = getColumn(el, 'done');
		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		targetCol.dispatchEvent(new Event('dragover', { bubbles: true }));
		targetCol.dispatchEvent(new Event('drop', { bubbles: true }));
		expect(targetCol.classList.contains('fk-column--drag-over')).toBe(false);
	});

	it('clears drop indicator after drop', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		const targetCol = getColumn(el, 'done');
		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		targetCol.dispatchEvent(new Event('dragover', { bubbles: true }));
		targetCol.dispatchEvent(new Event('drop', { bubbles: true }));
		expect(el.querySelector('.fk-drop-indicator')).toBeNull();
	});
});

describe('drop — blocked transition', () => {
	it('does not dispatch when workflow blocks the transition', () => {
		const { el, save } = makeEl(BOARD_WITH_WORKFLOW);
		const card = getCard(el, 'c1'); // inbox
		const targetCol = getColumn(el, 'done'); // inbox→done not in workflow

		card.dispatchEvent(new Event('dragstart', { bubbles: true }));
		targetCol.dispatchEvent(new Event('drop', { bubbles: true }));

		expect(save).not.toHaveBeenCalled();
	});
});
