// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mountBoard } from '../../src/render/mount';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
		{ name: 'due', type: 'Date', label: 'Due' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [{ id: 'c1', values: { title: 'My Task', status: 'inbox', due: '2026-08-01' } }],
};

function makeEl(board = BOARD) {
	const el = document.createElement('div');
	const save = vi.fn().mockResolvedValue(undefined);
	mountBoard(el, board, save);
	return { el, save };
}

describe('DOM attributes for editing', () => {
	it('.fk-card__field has data-field-name', () => {
		const { el } = makeEl();
		const fields = el.querySelectorAll('.fk-card__field');
		fields.forEach(f => {
			expect((f as HTMLElement).dataset.fieldName).toBeTruthy();
		});
	});

	it('.fk-card__title has data-field-name', () => {
		const { el } = makeEl();
		const title = el.querySelector('.fk-card__title') as HTMLElement;
		expect(title.dataset.fieldName).toBeTruthy();
	});

	it('.fk-card__title has data-card-id', () => {
		const { el } = makeEl();
		const title = el.querySelector('.fk-card__title') as HTMLElement;
		expect(title.dataset.cardId).toBe('c1');
	});
});

describe('clicking field value', () => {
	it('clicking .fk-card__field-value replaces it with an input', () => {
		const { el } = makeEl();
		const fieldValue = el.querySelector('.fk-card__field-value') as HTMLElement;
		fieldValue.click();
		expect(el.querySelector('.fk-field-input')).not.toBeNull();
	});

	it('input is pre-filled with the current field value', () => {
		const { el } = makeEl();
		const statusField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'due',
		)!;
		(statusField.querySelector('.fk-card__field-value') as HTMLElement).click();
		const input = el.querySelector('.fk-field-input') as HTMLInputElement;
		expect(input.value).toBe('2026-08-01');
	});

	it('Select field produces a <select> element', () => {
		const { el } = makeEl();
		const statusField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'status',
		)!;
		(statusField.querySelector('.fk-card__field-value') as HTMLElement).click();
		expect(el.querySelector('select.fk-field-input')).not.toBeNull();
	});

	it('Select element contains all field options', () => {
		const { el } = makeEl();
		const statusField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'status',
		)!;
		(statusField.querySelector('.fk-card__field-value') as HTMLElement).click();
		const select = el.querySelector('select.fk-field-input') as HTMLSelectElement;
		const options = Array.from(select.options).map(o => o.value);
		expect(options).toContain('inbox');
		expect(options).toContain('done');
	});
});

describe('clicking title', () => {
	it('clicking .fk-card__title replaces it with an input', () => {
		const { el } = makeEl();
		(el.querySelector('.fk-card__title') as HTMLElement).click();
		expect(el.querySelector('.fk-title-input')).not.toBeNull();
	});

	it('title input is pre-filled with the current title', () => {
		const { el } = makeEl();
		(el.querySelector('.fk-card__title') as HTMLElement).click();
		const input = el.querySelector('.fk-title-input') as HTMLInputElement;
		expect(input.value).toBe('My Task');
	});
});

describe('commit on blur', () => {
	it('blur on field input dispatches updateCardField', () => {
		const { el, save } = makeEl();
		const dueField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'due',
		)!;
		(dueField.querySelector('.fk-card__field-value') as HTMLElement).click();
		const input = el.querySelector('.fk-field-input') as HTMLInputElement;
		input.value = '2026-12-31';
		input.dispatchEvent(new Event('blur'));
		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards[0].values.due).toBe('2026-12-31');
	});

	it('blur on title input dispatches updateCardField for title', () => {
		const { el, save } = makeEl();
		(el.querySelector('.fk-card__title') as HTMLElement).click();
		const input = el.querySelector('.fk-title-input') as HTMLInputElement;
		input.value = 'Updated Title';
		input.dispatchEvent(new Event('blur'));
		expect(save).toHaveBeenCalledTimes(1);
		const savedBoard = save.mock.calls[0][0] as Board;
		expect(savedBoard.cards[0].values.title).toBe('Updated Title');
	});
});

describe('commit on Enter', () => {
	it('pressing Enter on a text input dispatches updateCardField', () => {
		const { el, save } = makeEl();
		const dueField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'due',
		)!;
		(dueField.querySelector('.fk-card__field-value') as HTMLElement).click();
		const input = el.querySelector('.fk-field-input') as HTMLInputElement;
		input.value = '2026-09-15';
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(save).toHaveBeenCalledTimes(1);
	});
});

describe('cancel on Escape', () => {
	it('pressing Escape restores the original span without dispatching', () => {
		const { el, save } = makeEl();
		const dueField = Array.from(el.querySelectorAll('.fk-card__field')).find(
			f => (f as HTMLElement).dataset.fieldName === 'due',
		)!;
		(dueField.querySelector('.fk-card__field-value') as HTMLElement).click();
		const input = el.querySelector('.fk-field-input')!;
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(save).not.toHaveBeenCalled();
		expect(el.querySelector('.fk-field-input')).toBeNull();
		expect(dueField.querySelector('.fk-card__field-value')).not.toBeNull();
	});
});
