// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { BoardConfigModal } from '../../src/render/board-config-modal';
import type { BoardSchema } from '../../src/model/board';

const SCHEMA: BoardSchema = {
	title: 'My Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'], default: 'todo' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: 'todo→doing',
};

function makeModal(initial: BoardSchema | null = null, onConfirm = vi.fn()) {
	const modal = new BoardConfigModal({} as never, initial, onConfirm);
	modal.open();
	return { modal, onConfirm };
}

describe('BoardConfigModal — new board (initial = null)', () => {
	it('renders a title input pre-filled with "New Board"', () => {
		const { modal } = makeModal();
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		expect(inp.value).toBe('New Board');
	});

	it('renders a field row for each default field', () => {
		const { modal } = makeModal();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		expect(rows.length).toBe(2);
	});

	it('renders columns and lanes selects', () => {
		const { modal } = makeModal();
		const selects = modal.contentEl.querySelectorAll('select');
		expect(selects.length).toBeGreaterThanOrEqual(2);
	});

	it('calls onConfirm with a BoardSchema on save', () => {
		const { modal, onConfirm } = makeModal();
		(modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement)!.click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.title).toBeDefined();
		expect(schema.fields.length).toBeGreaterThan(0);
	});

	it('confirmed schema has a columns field matching an existing field', () => {
		const { modal, onConfirm } = makeModal();
		(modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement)!.click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields.some(f => f.name === schema.viewConfig.columns)).toBe(true);
	});
});

describe('BoardConfigModal — edit existing board', () => {
	it('pre-fills title input with board title', () => {
		const { modal } = makeModal(SCHEMA);
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		expect(inp.value).toBe('My Board');
	});

	it('renders a row for each field', () => {
		const { modal } = makeModal(SCHEMA);
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		expect(rows.length).toBe(SCHEMA.fields.length);
	});

	it('pre-fills workflow input', () => {
		const { modal } = makeModal(SCHEMA);
		const inputs = Array.from(modal.contentEl.querySelectorAll('input')) as HTMLInputElement[];
		const workflowInp = inputs.find(i => i.value === 'todo→doing');
		expect(workflowInp).not.toBeUndefined();
	});

	it('calls onConfirm with updated title when changed', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		inp.value = 'Renamed Board';
		inp.dispatchEvent(new Event('input'));
		(modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement)!.click();
		expect((onConfirm.mock.calls[0][0] as BoardSchema).title).toBe('Renamed Board');
	});

	it('does not mutate the original schema', () => {
		const original = JSON.stringify(SCHEMA);
		const { modal } = makeModal(SCHEMA);
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		inp.value = 'Changed';
		inp.dispatchEvent(new Event('input'));
		(modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement)!.click();
		expect(JSON.stringify(SCHEMA)).toBe(original);
	});
});

describe('BoardConfigModal — validation', () => {
	it('shows error and does not call onConfirm when title is empty', () => {
		const { modal, onConfirm } = makeModal();
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		inp.value = '';
		inp.dispatchEvent(new Event('input'));
		(modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement)!.click();
		expect(onConfirm).not.toHaveBeenCalled();
		expect(modal.contentEl.querySelector('.fk-modal-error')!.textContent).not.toBe('');
	});
});

describe('BoardConfigModal — dynamic field list', () => {
	function saveBtn(modal: BoardConfigModal): HTMLButtonElement {
		return modal.contentEl.querySelector('.fk-modal-save') as HTMLButtonElement;
	}

	it('adds a blank field row when "Add field" is clicked', () => {
		const { modal } = makeModal(SCHEMA);
		const before = modal.contentEl.querySelectorAll('.fk-modal-field-row').length;
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const after = modal.contentEl.querySelectorAll('.fk-modal-field-row').length;
		expect(after).toBe(before + 1);
	});

	it('removes a field row when × is clicked', () => {
		const { modal } = makeModal(SCHEMA);
		const before = modal.contentEl.querySelectorAll('.fk-modal-field-row').length;
		const removeBtn = modal.contentEl.querySelector('.fk-modal-icon-btn[disabled=false]') as HTMLButtonElement
			?? Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
				.find(b => b.textContent === '×' && !(b as HTMLButtonElement).disabled) as HTMLButtonElement;
		removeBtn.click();
		const after = modal.contentEl.querySelectorAll('.fk-modal-field-row').length;
		expect(after).toBe(before - 1);
	});

	it('remove button is disabled when only one field remains', () => {
		const { modal } = makeModal();
		// Default schema has 2 fields; remove one
		const removeBtn = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.find(b => b.textContent === '×' && !(b as HTMLButtonElement).disabled) as HTMLButtonElement;
		removeBtn.click();
		// Now 1 field — remove button should be disabled
		const remainingRemove = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.find(b => b.textContent === '×') as HTMLButtonElement;
		expect(remainingRemove.disabled).toBe(true);
	});

	it('swaps fields when ↑ is clicked on the second row', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const upBtns = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.filter(b => b.textContent === '↑') as HTMLButtonElement[];
		// Second row's ↑ button (first is disabled)
		const enabledUp = upBtns.find(b => !b.disabled)!;
		enabledUp.click();
		saveBtn(modal).click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields[0].name).toBe(SCHEMA.fields[1].name);
		expect(schema.fields[1].name).toBe(SCHEMA.fields[0].name);
	});

	it('swaps fields when ↓ is clicked on the first row', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const downBtns = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.filter(b => b.textContent === '↓') as HTMLButtonElement[];
		const enabledDown = downBtns.find(b => !b.disabled)!;
		enabledDown.click();
		saveBtn(modal).click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields[0].name).toBe(SCHEMA.fields[1].name);
		expect(schema.fields[1].name).toBe(SCHEMA.fields[0].name);
	});

	it('first row ↑ button is disabled', () => {
		const { modal } = makeModal(SCHEMA);
		const upBtns = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.filter(b => b.textContent === '↑') as HTMLButtonElement[];
		expect(upBtns[0].disabled).toBe(true);
	});

	it('last row ↓ button is disabled', () => {
		const { modal } = makeModal(SCHEMA);
		const downBtns = Array.from(modal.contentEl.querySelectorAll('.fk-modal-icon-btn'))
			.filter(b => b.textContent === '↓') as HTMLButtonElement[];
		expect(downBtns[downBtns.length - 1].disabled).toBe(true);
	});

	it('added field is included in saved schema', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		// Fill in the new blank row's name input
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const nameInp = lastRow.querySelector('input') as HTMLInputElement;
		nameInp.value = 'newfield';
		nameInp.dispatchEvent(new Event('input'));
		saveBtn(modal).click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields.some(f => f.name === 'newfield')).toBe(true);
	});

	it('shows error when adding a field with a duplicate name', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const nameInp = lastRow.querySelector('input') as HTMLInputElement;
		nameInp.value = 'title'; // duplicate
		nameInp.dispatchEvent(new Event('input'));
		saveBtn(modal).click();
		expect(onConfirm).not.toHaveBeenCalled();
		expect(modal.contentEl.querySelector('.fk-modal-error')!.textContent).not.toBe('');
	});
});

describe('BoardConfigModal — close', () => {
	it('empties contentEl on close', () => {
		const { modal } = makeModal();
		modal.close();
		expect(modal.contentEl.children.length).toBe(0);
	});

	it('does not call onConfirm when closed without saving', () => {
		const { modal, onConfirm } = makeModal();
		modal.close();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
