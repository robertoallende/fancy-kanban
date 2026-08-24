// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CardModal, resolveDateDefault } from '../../src/render/card-modal';
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
		expect(urlInput.classList.contains('fk-hidden')).toBe(true);
		addUrlBtn.click();
		expect(urlInput.classList.contains('fk-hidden')).toBe(false);
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

describe('CardModal — initialValues (new card lane pre-population)', () => {
	const LANE_BOARD: Board = {
		title: 'Lane Board',
		fields: [
			{ name: '_id', type: 'Text', label: 'ID' },
			{ name: 'title', type: 'Text', label: 'Title' },
			{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'done'], default: 'todo' },
			{ name: 'assignee', type: 'Select', label: 'Assignee', options: ['alice', 'bob'], default: 'alice' },
		],
		viewConfig: { columns: 'status', lanes: 'assignee' },
		rawWorkflow: '',
		cards: [],
	};

	function makeLaneModal(initialValues: Record<string, string>, onConfirm = vi.fn()) {
		const modal = new CardModal({} as never, LANE_BOARD, null, 'todo', onConfirm, undefined, '', initialValues);
		modal.open();
		return { modal, onConfirm };
	}

	it('pre-selects the lane field to the value from initialValues', () => {
		const { modal } = makeLaneModal({ assignee: 'bob' });
		const sels = Array.from(modal.contentEl.querySelectorAll<HTMLSelectElement>('select'));
		const assigneeSel = sels.find(s =>
			s.closest('.fk-modal-field')?.querySelector('label')?.textContent === 'Assignee'
		);
		expect(assigneeSel?.value).toBe('bob');
	});

	it('initialValues overrides field.default for a new card', () => {
		const { modal } = makeLaneModal({ assignee: 'bob' });
		const sels = Array.from(modal.contentEl.querySelectorAll<HTMLSelectElement>('select'));
		const assigneeSel = sels.find(s =>
			s.closest('.fk-modal-field')?.querySelector('label')?.textContent === 'Assignee'
		);
		expect(assigneeSel?.value).not.toBe('alice'); // 'alice' is field.default
	});

	it('initialValues value is included in onConfirm payload', () => {
		const { modal, onConfirm } = makeLaneModal({ assignee: 'bob' });
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ assignee: 'bob' }));
	});

	it('initialValues does not affect an edit card — card values take precedence', () => {
		const card = { id: 'c1', values: { _id: 'c1', title: 'Task', status: 'done', assignee: 'alice' } };
		const modal = new CardModal({} as never, LANE_BOARD, card, 'done', vi.fn(), undefined, '', { assignee: 'bob' });
		modal.open();
		const sels = Array.from(modal.contentEl.querySelectorAll<HTMLSelectElement>('select'));
		const assigneeSel = sels.find(s =>
			s.closest('.fk-modal-field')?.querySelector('label')?.textContent === 'Assignee'
		);
		expect(assigneeSel?.value).toBe('alice');
	});

	it('falls back to field.default when key is absent from initialValues', () => {
		const { modal } = makeLaneModal({});
		const sels = Array.from(modal.contentEl.querySelectorAll<HTMLSelectElement>('select'));
		const assigneeSel = sels.find(s =>
			s.closest('.fk-modal-field')?.querySelector('label')?.textContent === 'Assignee'
		);
		expect(assigneeSel?.value).toBe('alice'); // field.default
	});
});

function localISO(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe('resolveDateDefault', () => {
	it('returns empty string for undefined', () => {
		expect(resolveDateDefault(undefined)).toBe('');
	});

	it('resolves "today" to today\'s local ISO date', () => {
		expect(resolveDateDefault('today')).toBe(localISO(new Date()));
	});

	it('resolves "yesterday" to yesterday\'s local ISO date', () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		expect(resolveDateDefault('yesterday')).toBe(localISO(d));
	});

	it('resolves "tomorrow" to tomorrow\'s local ISO date', () => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		expect(resolveDateDefault('tomorrow')).toBe(localISO(d));
	});

	it('returns an explicit ISO date string unchanged', () => {
		expect(resolveDateDefault('2026-01-15')).toBe('2026-01-15');
	});

	it('returns an unrecognised string unchanged', () => {
		expect(resolveDateDefault('someday')).toBe('someday');
	});
});

describe('CardModal — Date field defaults', () => {
	const DATE_BOARD: Board = {
		title: 'Date Board',
		fields: [
			{ name: '_id', type: 'Text', label: 'ID' },
			{ name: 'title', type: 'Text', label: 'Title' },
			{ name: 'due', type: 'Date', label: 'Due', default: 'today' },
			{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'done'], default: 'todo' },
		],
		viewConfig: { columns: 'status' },
		rawWorkflow: '',
		cards: [],
	};

	function makeDateModal(defaultValue: string | undefined, card: Card | null = null) {
		const fields = DATE_BOARD.fields.map(f =>
			f.name === 'due' ? { ...f, default: defaultValue } : f
		);
		const board = { ...DATE_BOARD, fields };
		const modal = new CardModal({} as never, board, card, 'todo', vi.fn());
		modal.open();
		return modal;
	}

	function dueDateInput(modal: CardModal): HTMLInputElement {
		const inputs = Array.from(modal.contentEl.querySelectorAll<HTMLInputElement>('input[type="date"]'));
		return inputs[0];
	}

	it('pre-fills due date with today when default is "today"', () => {
		const modal = makeDateModal('today');
		expect(dueDateInput(modal).value).toBe(localISO(new Date()));
	});

	it('pre-fills due date with tomorrow when default is "tomorrow"', () => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		const modal = makeDateModal('tomorrow');
		expect(dueDateInput(modal).value).toBe(localISO(d));
	});

	it('pre-fills due date with yesterday when default is "yesterday"', () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		const modal = makeDateModal('yesterday');
		expect(dueDateInput(modal).value).toBe(localISO(d));
	});

	it('does not apply keyword default when editing an existing card', () => {
		const card: Card = { id: 'c1', values: { _id: 'c1', title: 'Task', due: '2025-03-01', status: 'todo' } };
		const modal = makeDateModal('today', card);
		expect(dueDateInput(modal).value).toBe('2025-03-01');
	});
});

// unit 33.1 — default values must be stored when user saves without touching the field
describe('CardModal — default values stored on save (unit 33.1)', () => {
	const DEFAULT_BOARD: Board = {
		title: 'Default Board',
		fields: [
			{ name: 'title',    type: 'Text',   label: 'Title' },
			{ name: 'status',   type: 'Select', label: 'Status',   options: ['inbox', 'doing', 'done'], default: 'inbox' },
			{ name: 'priority', type: 'Select', label: 'Priority', options: ['High', 'Medium', 'Low'],  default: 'High' },
		],
		viewConfig: { columns: 'status' },
		rawWorkflow: '',
		cards: [],
	};

	function makeDefaultModal(onConfirm = vi.fn()) {
		const modal = new CardModal({} as never, DEFAULT_BOARD, null, 'inbox', onConfirm);
		modal.open();
		return { modal, onConfirm };
	}

	it('includes the Select default in onConfirm payload when user saves without touching the field', () => {
		const { modal, onConfirm } = makeDefaultModal();
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ priority: 'High' }));
	});

	it('does not save an empty string for a field that has a default and was not touched', () => {
		const { modal, onConfirm } = makeDefaultModal();
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		const values = onConfirm.mock.calls[0][0] as Record<string, string>;
		expect(values.priority).not.toBe('');
	});

	it('saves the explicit user selection when the user changes the field', () => {
		const { modal, onConfirm } = makeDefaultModal();
		const sel = modal.contentEl.querySelector<HTMLSelectElement>('select[class="fk-modal-input"]')!;
		const prioritySel = Array.from(modal.contentEl.querySelectorAll<HTMLSelectElement>('select')).find(s =>
			s.closest('.fk-modal-field')?.querySelector('label')?.textContent === 'Priority'
		)!;
		prioritySel.value = 'Low';
		prioritySel.dispatchEvent(new Event('change'));
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ priority: 'Low' }));
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
