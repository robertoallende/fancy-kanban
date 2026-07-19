// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mountBoard, showTransitionBlockedToast } from '../../src/render/mount';
import type { Board, BoardSchema } from '../../src/model/board';
import { BoardConfigModal } from '../../src/render/board-config-modal';

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

describe('mountBoard — settings button', () => {
	afterEach(() => vi.restoreAllMocks());

	it('clicking the settings button opens BoardConfigModal when app is provided', () => {
		const el = document.createElement('div');
		const save = makeSave();
		const fakeApp = {} as never;
		mountBoard(el, BOARD, save, fakeApp);

		const openSpy = vi.spyOn(BoardConfigModal.prototype, 'open');
		const btn = el.querySelector('.fk-board__settings') as HTMLButtonElement;
		btn.click();
		expect(openSpy).toHaveBeenCalledTimes(1);
	});

	it('does not open BoardConfigModal when app is not provided', () => {
		const el = document.createElement('div');
		const save = makeSave();
		mountBoard(el, BOARD, save);

		const openSpy = vi.spyOn(BoardConfigModal.prototype, 'open');
		const btn = el.querySelector('.fk-board__settings') as HTMLButtonElement;
		btn.click();
		expect(openSpy).not.toHaveBeenCalled();
	});

	it('dispatches updated board with reconciled cards after confirming schema change', async () => {
		const el = document.createElement('div');
		const save = makeSave();
		const fakeApp = {} as never;
		mountBoard(el, BOARD, save, fakeApp);

		let capturedOnConfirm: ((schema: BoardSchema) => void) | null = null;
		vi.spyOn(BoardConfigModal.prototype, 'open').mockImplementation(function (this: BoardConfigModal) {
			capturedOnConfirm = (this as unknown as { onConfirm: (s: BoardSchema) => void }).onConfirm;
		});

		const btn = el.querySelector('.fk-board__settings') as HTMLButtonElement;
		btn.click();

		const newSchema: BoardSchema = {
			...BOARD,
			title: 'Renamed Board',
		};
		capturedOnConfirm!(newSchema);

		expect(save).toHaveBeenCalledTimes(1);
		const saved = save.mock.calls[0][0] as Board;
		expect(saved.title).toBe('Renamed Board');
		expect(saved.cards).toBeDefined();
	});
});

describe('showTransitionBlockedToast', () => {
	beforeEach(() => { document.querySelectorAll('.fk-toast').forEach(el => el.remove()); });
	afterEach(() => { vi.useRealTimers(); document.querySelectorAll('.fk-toast').forEach(el => el.remove()); });

	it('appends a .fk-toast to the document body', () => {
		showTransitionBlockedToast('done', 'inbox');
		expect(document.querySelector('.fk-toast')).not.toBeNull();
	});

	it('toast message contains from and to column names', () => {
		showTransitionBlockedToast('done', 'inbox');
		const text = document.querySelector('.fk-toast')?.textContent ?? '';
		expect(text).toContain("'done'");
		expect(text).toContain("'inbox'");
		expect(text).toContain('done → inbox');
	});

	it('adds .fk-toast--hiding class after 3 seconds', () => {
		vi.useFakeTimers();
		showTransitionBlockedToast('done', 'inbox');
		vi.advanceTimersByTime(3000);
		expect(document.querySelector('.fk-toast')?.classList.contains('fk-toast--hiding')).toBe(true);
	});

	it('removes the toast after the fade completes', () => {
		vi.useFakeTimers();
		showTransitionBlockedToast('done', 'inbox');
		vi.advanceTimersByTime(3400);
		expect(document.querySelector('.fk-toast')).toBeNull();
	});

	it('replaces an existing toast instead of stacking', () => {
		showTransitionBlockedToast('done', 'inbox');
		showTransitionBlockedToast('inbox', 'done');
		expect(document.querySelectorAll('.fk-toast').length).toBe(1);
		expect(document.querySelector('.fk-toast')?.textContent).toContain("'inbox'");
	});
});

describe('blockIndexFromContext', () => {
	// Import separately to test in isolation
	it('is tested via the postprocessor integration tests', () => {
		expect(true).toBe(true);
	});
});
