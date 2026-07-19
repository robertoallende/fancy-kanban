// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const LINK_BOARD: Board = {
	title: 'Link Board',
	fields: [
		{ name: '_id', type: 'Text', label: 'ID' },
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'docs', type: 'Link', label: 'Docs' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'done'], default: 'todo' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [],
};

const mockOpenLinkText = vi.fn();
const mockApp = {
	workspace: { openLinkText: mockOpenLinkText },
} as never;

function makeLinkModal(docsValue: string, onConfirm = vi.fn(), sourcePath = '') {
	const card: Card = { id: 'lk1', values: { _id: 'lk1', title: 'Task', docs: docsValue, status: 'todo' } };
	const modal = new CardModal(mockApp, LINK_BOARD, card, 'todo', onConfirm, undefined, sourcePath);
	modal.open();
	return { modal, onConfirm };
}

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

	it('renders an input for each editable field (excluding _id, including status)', () => {
		const { modal } = makeModal(null);
		const inputs = modal.contentEl.querySelectorAll('input, textarea, select');
		expect(inputs.length).toBe(3); // title (text) + notes (textarea) + status (select)
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

	it('includes status in confirmed values and does not include _id', () => {
		const { modal, onConfirm } = makeModal(null);
		const saveBtn = modal.contentEl.querySelector('button') as HTMLButtonElement;
		saveBtn.click();
		const values = onConfirm.mock.calls[0][0];
		expect(values).toHaveProperty('status');
		expect(values).not.toHaveProperty('_id');
	});

	it('pre-selects status to the columnValue for a new card', () => {
		const { modal } = makeModal(null);
		const sel = modal.contentEl.querySelector<HTMLSelectElement>('select');
		expect(sel?.value).toBe('todo'); // columnValue passed to makeModal
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

describe('CardModal — Link field', () => {
	it('renders .fk-link-field instead of a bare input', () => {
		const { modal } = makeLinkModal('');
		expect(modal.contentEl.querySelector('.fk-link-field')).toBeTruthy();
		// The docs field wrapper should contain .fk-link-field, not a bare input
		const docsWrapper = Array.from(modal.contentEl.querySelectorAll('.fk-modal-field'))
			.find(el => el.querySelector('label')?.textContent === 'Docs');
		expect(docsWrapper?.querySelector('input:not(.fk-link-url-input input)')).toBeFalsy();
	});

	it('renders no items for an empty initial value', () => {
		const { modal } = makeLinkModal('');
		expect(modal.contentEl.querySelectorAll('.fk-link-item').length).toBe(0);
	});

	it('renders existing items from the initial value', () => {
		const { modal } = makeLinkModal('notes/doc.pdf\nhttps://example.com');
		const items = modal.contentEl.querySelectorAll('.fk-link-item');
		expect(items.length).toBe(2);
		expect(items[0].querySelector('.fk-link-item__value')?.textContent).toBe('notes/doc.pdf');
		expect(items[1].querySelector('.fk-link-item__value')?.textContent).toBe('https://example.com');
	});

	it('clicking × removes the item and calls onChange via save', () => {
		const { modal, onConfirm } = makeLinkModal('notes/doc.pdf\nhttps://example.com');
		const removeBtn = modal.contentEl.querySelector('.fk-link-item__remove') as HTMLButtonElement;
		removeBtn.click();
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ docs: 'https://example.com' }));
	});

	it('"Add URL" button toggles the inline input', () => {
		const { modal } = makeLinkModal('');
		const addUrlBtn = modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-add--url')!;
		const urlInput = modal.contentEl.querySelector<HTMLElement>('.fk-link-url-input')!;
		expect(urlInput.style.display).toBe('none');
		addUrlBtn.click();
		expect(urlInput.style.display).not.toBe('none');
	});

	it('confirming a valid URL adds it to the list', () => {
		const { modal, onConfirm } = makeLinkModal('');
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-add--url')!.click();
		const urlInput = modal.contentEl.querySelector<HTMLInputElement>('.fk-link-url-input input')!;
		urlInput.value = 'https://obsidian.md';
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-url-confirm')!.click();
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ docs: 'https://obsidian.md' }));
	});

	describe('click to open', () => {
		let windowOpenSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			mockOpenLinkText.mockReset();
			windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		});

		afterEach(() => {
			windowOpenSpy.mockRestore();
		});

		it('clicking a vault path calls openLinkText in a new tab', () => {
			const { modal } = makeLinkModal('notes/doc.md', vi.fn(), 'board.md');
			const btn = modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-item__value')!;
			btn.click();
			expect(mockOpenLinkText).toHaveBeenCalledWith('notes/doc.md', 'board.md', 'tab');
		});

		it('clicking a vault path closes the modal', () => {
			const { modal } = makeLinkModal('notes/doc.md');
			const closeSpy = vi.spyOn(modal, 'close');
			modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-item__value')!.click();
			expect(closeSpy).toHaveBeenCalled();
		});

		it('clicking an https:// URI calls window.open', () => {
			const { modal } = makeLinkModal('https://obsidian.md');
			modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-item__value')!.click();
			expect(windowOpenSpy).toHaveBeenCalledWith('https://obsidian.md', '_blank');
			expect(mockOpenLinkText).not.toHaveBeenCalled();
		});

		it('clicking a mailto: URI calls window.open', () => {
			const { modal } = makeLinkModal('mailto:user@example.com');
			modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-item__value')!.click();
			expect(windowOpenSpy).toHaveBeenCalledWith('mailto:user@example.com', '_blank');
		});

		it('clicking a link does not call onConfirm', () => {
			const onConfirm = vi.fn();
			const { modal } = makeLinkModal('notes/doc.md', onConfirm);
			modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-item__value')!.click();
			expect(onConfirm).not.toHaveBeenCalled();
		});
	});

	it('confirming an invalid URL shows .fk-link-error and does not add the item', () => {
		const { modal, onConfirm } = makeLinkModal('');
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-add--url')!.click();
		const urlInput = modal.contentEl.querySelector<HTMLInputElement>('.fk-link-url-input input')!;
		urlInput.value = '/absolute/path';
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-link-url-confirm')!.click();
		const error = modal.contentEl.querySelector('.fk-link-error')!;
		expect(error.textContent).toBeTruthy();
		expect(modal.contentEl.querySelectorAll('.fk-link-item').length).toBe(0);
		expect(onConfirm).not.toHaveBeenCalled();
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
