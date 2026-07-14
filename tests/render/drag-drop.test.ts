// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
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

function pointerDown(target: HTMLElement) {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
}

function pointerMoveTo(col: HTMLElement, clientX = 50, clientY = 50) {
	(activeDocument as Document & { elementFromPoint: () => Element }).elementFromPoint = () => col;
	activeDocument.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY }));
}

function pointerUp() {
	activeDocument.dispatchEvent(new PointerEvent('pointerup'));
}

describe('DOM attributes', () => {
	it('each .fk-card has data-card-id set to card.id', () => {
		const { el } = makeEl();
		expect(getCard(el, 'c1')).not.toBeNull();
		expect(getCard(el, 'c2')).not.toBeNull();
	});

	it('each .fk-card has class fk-card--draggable', () => {
		const { el } = makeEl();
		expect(getCard(el, 'c1').classList.contains('fk-card--draggable')).toBe(true);
	});

	it('each .fk-column has data-column-value', () => {
		const { el } = makeEl();
		expect(getColumn(el, 'inbox')).not.toBeNull();
		expect(getColumn(el, 'doing')).not.toBeNull();
		expect(getColumn(el, 'done')).not.toBeNull();
	});
});

describe('drag lifecycle — pointer events', () => {
	afterEach(() => vi.restoreAllMocks());

	it('pointerdown + move on a card adds .fk-card--dragging', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		pointerDown(card);
		pointerMoveTo(getColumn(el, 'inbox'));
		expect(card.classList.contains('fk-card--dragging')).toBe(true);
	});

	it('pointerdown alone does not add .fk-card--dragging', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		pointerDown(card);
		expect(card.classList.contains('fk-card--dragging')).toBe(false);
	});

	it('pointerdown on a button inside a card does not start drag', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		const btn = document.createElement('button');
		card.appendChild(btn);
		btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(card.classList.contains('fk-card--dragging')).toBe(false);
	});

	it('pointerup clears .fk-card--dragging', () => {
		const { el } = makeEl();
		const card = getCard(el, 'c1');
		pointerDown(card);
		pointerMoveTo(getColumn(el, 'inbox'));
		pointerUp();
		expect(card.classList.contains('fk-card--dragging')).toBe(false);
	});

	it('pointermove over a column adds .fk-column--drag-over', () => {
		const { el } = makeEl();
		pointerDown(getCard(el, 'c1'));
		const col = getColumn(el, 'doing');
		pointerMoveTo(col);
		expect(col.classList.contains('fk-column--drag-over')).toBe(true);
	});

	it('pointermove clears drag-over from previous column', () => {
		const { el } = makeEl();
		pointerDown(getCard(el, 'c1'));
		pointerMoveTo(getColumn(el, 'inbox'));
		pointerMoveTo(getColumn(el, 'doing'));
		expect(getColumn(el, 'inbox').classList.contains('fk-column--drag-over')).toBe(false);
		expect(getColumn(el, 'doing').classList.contains('fk-column--drag-over')).toBe(true);
	});

	it('pointerup clears .fk-column--drag-over', () => {
		const { el } = makeEl();
		pointerDown(getCard(el, 'c1'));
		pointerMoveTo(getColumn(el, 'done'));
		pointerUp();
		expect(getColumn(el, 'done').classList.contains('fk-column--drag-over')).toBe(false);
	});
});

describe('drop — allowed transition', () => {
	afterEach(() => vi.restoreAllMocks());

	it('dispatches reorderCard when dropping on a different column', () => {
		const { el, save } = makeEl();
		pointerDown(getCard(el, 'c1'));
		pointerMoveTo(getColumn(el, 'done'));
		pointerUp();
		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards.find(c => c.id === 'c1')!.values.status).toBe('done');
	});

	it('dispatches reorderCard when dropping on the same column (reorder)', () => {
		const { el, save } = makeEl();
		pointerDown(getCard(el, 'c1'));
		pointerMoveTo(getColumn(el, 'inbox'));
		pointerUp();
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('clears drop indicator after drop', () => {
		const { el } = makeEl();
		pointerDown(getCard(el, 'c1'));
		pointerMoveTo(getColumn(el, 'done'));
		pointerUp();
		expect(el.querySelector('.fk-drop-indicator')).toBeNull();
	});
});

describe('drop — blocked transition', () => {
	afterEach(() => vi.restoreAllMocks());

	it('does not dispatch when workflow blocks the transition', () => {
		const { el, save } = makeEl(BOARD_WITH_WORKFLOW);
		pointerDown(getCard(el, 'c1')); // inbox
		pointerMoveTo(getColumn(el, 'done')); // inbox→done not in workflow
		pointerUp();
		expect(save).not.toHaveBeenCalled();
	});
});
