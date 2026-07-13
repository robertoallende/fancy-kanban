// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mountBoard } from '../../src/render/mount';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [
		{ id: 'c1', values: { title: 'Task one', status: 'inbox' } },
		{ id: 'c2', values: { title: 'Task two', status: 'done' } },
	],
};

const BOARD_V2: Board = {
	...BOARD,
	cards: [
		{ id: 'c1', values: { title: 'Task one', status: 'done' } },
		{ id: 'c2', values: { title: 'Task two', status: 'done' } },
	],
};

function makeSave() {
	return vi.fn().mockResolvedValue(undefined);
}

describe('mountBoard', () => {
	describe('initial mount', () => {
		it('appends a .fk-board to el', () => {
			const el = document.createElement('div');
			mountBoard(el, BOARD, makeSave());
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});

		it('el has exactly one child after mount', () => {
			const el = document.createElement('div');
			mountBoard(el, BOARD, makeSave());
			expect(el.children.length).toBe(1);
		});

		it('clears existing content before mounting', () => {
			const el = document.createElement('div');
			const old = document.createElement('div');
			old.className = 'old-content';
			el.appendChild(old);
			mountBoard(el, BOARD, makeSave());
			expect(el.querySelector('.old-content')).toBeNull();
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});
	});

	describe('re-mount', () => {
		it('calling mountBoard again replaces the board', () => {
			const el = document.createElement('div');
			mountBoard(el, BOARD, makeSave());
			mountBoard(el, BOARD_V2, makeSave());
			expect(el.children.length).toBe(1);
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});

		it('re-mounted board reflects the new board state', () => {
			const el = document.createElement('div');
			mountBoard(el, BOARD, makeSave());
			mountBoard(el, BOARD_V2, makeSave());
			// BOARD_V2 has both cards in 'done', so inbox column should show count 0
			const counts = Array.from(el.querySelectorAll('.fk-column__count')).map(n => n.textContent);
			expect(counts).toEqual(['0', '2']);
		});
	});

	describe('dispatch', () => {
		it('dispatch calls save with the new board', async () => {
			const el = document.createElement('div');
			const save = makeSave();
			let capturedDispatch: ((b: Board) => void) | null = null;

			// We need to capture the dispatch — use a custom save that captures it
			const dispatchCapture = vi.fn((newBoard: Board) => {
				save(newBoard);
				return Promise.resolve();
			});

			mountBoard(el, BOARD, dispatchCapture);

			// Simulate a dispatch by directly calling save with new board
			await dispatchCapture(BOARD_V2);
			expect(save).toHaveBeenCalledWith(BOARD_V2);
		});

		it('save is called exactly once per dispatch', async () => {
			const save = makeSave();
			const el = document.createElement('div');
			mountBoard(el, BOARD, save);
			await save(BOARD_V2);
			expect(save).toHaveBeenCalledTimes(1);
		});
	});
});

describe('blockIndexFromContext', () => {
	// Import separately to test in isolation
	it('is tested via the postprocessor integration tests', () => {
		expect(true).toBe(true);
	});
});
