// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountBoard } from '../../src/render/mount';
import { CardModal } from '../../src/render/card-modal';
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

function makeEl(board = BOARD) {
	const el = document.createElement('div');
	const save = vi.fn().mockResolvedValue(undefined);
	mountBoard(el, board, save);
	return { el, save };
}

describe('add card button', () => {
	it('each column has exactly one .fk-col__add-btn', () => {
		const { el } = makeEl();
		const cols = el.querySelectorAll('.fk-column');
		cols.forEach(col => {
			expect(col.querySelectorAll('.fk-col__add-btn').length).toBe(1);
		});
	});

	it('clicking add button dispatches addCard with the column value', () => {
		const { el, save } = makeEl();
		const inboxCol = el.querySelector('[data-column-value="inbox"]')!;
		const btn = inboxCol.querySelector('.fk-col__add-btn') as HTMLElement;
		btn.click();
		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		const newCard = savedBoard.cards[savedBoard.cards.length - 1];
		expect(newCard.values.status).toBe('inbox');
	});

	it('clicking add in done column creates card with status done', () => {
		const { el, save } = makeEl();
		const doneCol = el.querySelector('[data-column-value="done"]')!;
		const btn = doneCol.querySelector('.fk-col__add-btn') as HTMLElement;
		btn.click();
		const savedBoard = save.mock.calls[0][0] as Board;
		const newCard = savedBoard.cards[savedBoard.cards.length - 1];
		expect(newCard.values.status).toBe('done');
	});

	it('new card count is one more than before', () => {
		const { el, save } = makeEl();
		const btn = el.querySelector('.fk-col__add-btn') as HTMLElement;
		btn.click();
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards.length).toBe(BOARD.cards.length + 1);
	});
});

describe('delete card via modal', () => {
	afterEach(() => vi.restoreAllMocks());

	it('no .fk-card__delete button on card face', () => {
		const { el } = makeEl();
		expect(el.querySelector('.fk-card__delete')).toBeNull();
	});

	it('onDelete from CardModal dispatches deleteCard for the correct card', () => {
		const el = document.createElement('div');
		const save = vi.fn().mockResolvedValue(undefined);
		mountBoard(el, BOARD, save, {} as never);

		let capturedOnDelete: (() => void) | undefined;
		vi.spyOn(CardModal.prototype, 'open').mockImplementation(function (this: CardModal) {
			capturedOnDelete = (this as unknown as { onDelete?: () => void }).onDelete;
		});

		(el.querySelector('[data-card-id="c1"]') as HTMLElement).click();
		capturedOnDelete!();

		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards.find(c => c.id === 'c1')).toBeUndefined();
	});

	it('deleting one card does not affect others', () => {
		const el = document.createElement('div');
		const save = vi.fn().mockResolvedValue(undefined);
		mountBoard(el, BOARD, save, {} as never);

		let capturedOnDelete: (() => void) | undefined;
		vi.spyOn(CardModal.prototype, 'open').mockImplementation(function (this: CardModal) {
			capturedOnDelete = (this as unknown as { onDelete?: () => void }).onDelete;
		});

		(el.querySelector('[data-card-id="c1"]') as HTMLElement).click();
		capturedOnDelete!();

		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards.find(c => c.id === 'c2')).toBeDefined();
	});
});
