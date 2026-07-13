// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { CardModal } from '../../src/render/card-modal';
import type { Board, Card } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: '_id', type: 'Text', label: 'ID' },
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'notes', type: 'Textarea', label: 'Notes' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'], default: 'todo' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [],
};

const CARD: Card = {
	id: 'card1',
	values: { _id: 'card1', title: 'My Task', notes: 'Some notes', status: 'doing' },
};

function makeModal(card: Card | null, onConfirm = vi.fn()) {
	const modal = new CardModal({} as never, BOARD, card, 'todo', onConfirm);
	modal.open();
	return { modal, onConfirm };
}

describe('CardModal — new card', () => {
	it('sets title to "Add card"', () => {
		const { modal } = makeModal(null);
		expect(modal.titleEl.textContent).toBe('Add card');
	});

	it('renders an input for each editable field (excluding _id and status)', () => {
		const { modal } = makeModal(null);
		const inputs = modal.contentEl.querySelectorAll('input, textarea, select');
		expect(inputs.length).toBe(2); // title (text) + notes (textarea)
	});

	it('pre-fills text fields with empty string', () => {
		const { modal } = makeModal(null);
		const input = modal.contentEl.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('');
	});

	it('calls onConfirm with field values on save', () => {
		const { modal, onConfirm } = makeModal(null);
		const input = modal.contentEl.querySelector('input') as HTMLInputElement;
		input.value = 'New Task';
		input.dispatchEvent(new Event('input'));
		const saveBtn = modal.contentEl.querySelector('button') as HTMLButtonElement;
		saveBtn.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Task' }));
	});

	it('does not include status or _id in confirmed values', () => {
		const { modal, onConfirm } = makeModal(null);
		const saveBtn = modal.contentEl.querySelector('button') as HTMLButtonElement;
		saveBtn.click();
		const values = onConfirm.mock.calls[0][0];
		expect(values).not.toHaveProperty('status');
		expect(values).not.toHaveProperty('_id');
	});
});

describe('CardModal — edit card', () => {
	it('sets title to "Edit card"', () => {
		const { modal } = makeModal(CARD);
		expect(modal.titleEl.textContent).toBe('Edit card');
	});

	it('pre-fills inputs with existing card values', () => {
		const { modal } = makeModal(CARD);
		const input = modal.contentEl.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('My Task');
	});

	it('pre-fills textarea with existing card value', () => {
		const { modal } = makeModal(CARD);
		const ta = modal.contentEl.querySelector('textarea') as HTMLTextAreaElement;
		expect(ta.value).toBe('Some notes');
	});

	it('calls onConfirm with updated values on save', () => {
		const { modal, onConfirm } = makeModal(CARD);
		const input = modal.contentEl.querySelector('input') as HTMLInputElement;
		input.value = 'Updated Task';
		input.dispatchEvent(new Event('input'));
		modal.contentEl.querySelector('button')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Task' }));
	});
});

describe('CardModal — close', () => {
	it('empties contentEl on close', () => {
		const { modal } = makeModal(null);
		modal.close();
		expect(modal.contentEl.children.length).toBe(0);
	});

	it('does not call onConfirm when closed without saving', () => {
		const { modal, onConfirm } = makeModal(null);
		modal.close();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
