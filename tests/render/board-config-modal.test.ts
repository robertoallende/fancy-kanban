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
		// workflow is on the Layout tab
		Array.from(modal.contentEl.querySelectorAll<HTMLButtonElement>('.fk-tab'))
			.find(b => b.textContent === 'Layout')?.click();
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

	it('added field is included in saved schema with name derived from label', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const labelInp = lastRow.querySelector('input') as HTMLInputElement;
		labelInp.value = 'New Field';
		labelInp.dispatchEvent(new Event('input'));
		saveBtn(modal).click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields.some(f => f.name === 'new_field')).toBe(true);
	});

	it('shows error when adding a field with a label that derives a duplicate name', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const labelInp = lastRow.querySelector('input') as HTMLInputElement;
		labelInp.value = 'Title'; // derives 'title', which is a duplicate
		labelInp.dispatchEvent(new Event('input'));
		saveBtn(modal).click();
		expect(onConfirm).not.toHaveBeenCalled();
		expect(modal.contentEl.querySelector('.fk-modal-error')!.textContent).not.toBe('');
	});
});

describe('BoardConfigModal — tab navigation', () => {
	function tabs(modal: BoardConfigModal): HTMLButtonElement[] {
		return Array.from(modal.contentEl.querySelectorAll<HTMLButtonElement>('.fk-tab'));
	}

	function clickTab(modal: BoardConfigModal, label: string): void {
		const tab = tabs(modal).find(b => b.textContent === label);
		if (!tab) throw new Error(`Tab "${label}" not found`);
		tab.click();
	}

	it('renders a tab bar with three tabs: Fields, Layout, Card display', () => {
		const { modal } = makeModal(SCHEMA);
		const labels = tabs(modal).map(b => b.textContent);
		expect(labels).toEqual(['Fields', 'Layout', 'Card display']);
	});

	it('Fields tab is active by default', () => {
		const { modal } = makeModal(SCHEMA);
		const fieldsTab = tabs(modal).find(b => b.textContent === 'Fields');
		expect(fieldsTab?.classList.contains('fk-tab--active')).toBe(true);
	});

	it('clicking Layout makes it the active tab', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		const layoutTab = tabs(modal).find(b => b.textContent === 'Layout');
		expect(layoutTab?.classList.contains('fk-tab--active')).toBe(true);
	});

	it('clicking Layout deactivates Fields tab', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		const fieldsTab = tabs(modal).find(b => b.textContent === 'Fields');
		expect(fieldsTab?.classList.contains('fk-tab--active')).toBe(false);
	});

	it('clicking Card display makes it the active tab', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Card display');
		const cardTab = tabs(modal).find(b => b.textContent === 'Card display');
		expect(cardTab?.classList.contains('fk-tab--active')).toBe(true);
	});

	it('field rows are visible on the Fields tab', () => {
		const { modal } = makeModal(SCHEMA);
		expect(modal.contentEl.querySelector('.fk-modal-field-row')).not.toBeNull();
	});

	it('field rows are not rendered on the Layout tab', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		expect(modal.contentEl.querySelector('.fk-modal-field-row')).toBeNull();
	});

	it('columns select is not rendered on the Fields tab', () => {
		const { modal } = makeModal(SCHEMA);
		expect(modal.contentEl.querySelector('[data-role="columns"]')).toBeNull();
	});

	it('columns select is rendered after switching to Layout', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		expect(modal.contentEl.querySelector('[data-role="columns"]')).not.toBeNull();
	});

	it('only the active tab button has fk-tab--active after switching to Layout', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		const active = tabs(modal).filter(b => b.classList.contains('fk-tab--active'));
		expect(active.length).toBe(1);
		expect(active[0].textContent).toBe('Layout');
	});

	it('only the active tab button has fk-tab--active after switching back to Fields', () => {
		const { modal } = makeModal(SCHEMA);
		clickTab(modal, 'Layout');
		clickTab(modal, 'Fields');
		const active = tabs(modal).filter(b => b.classList.contains('fk-tab--active'));
		expect(active.length).toBe(1);
		expect(active[0].textContent).toBe('Fields');
	});

	it('field added on Fields tab appears in Layout columns select after switching', () => {
		const { modal } = makeModal(SCHEMA);
		// Add a new Select field on Fields tab
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const labelInp = lastRow.querySelector('.fk-col-label') as HTMLInputElement;
		labelInp.value = 'Region';
		labelInp.dispatchEvent(new Event('input'));
		const typeSelect = lastRow.querySelector('.fk-col-type') as HTMLSelectElement;
		typeSelect.value = 'Select';
		typeSelect.dispatchEvent(new Event('change'));
		// Add options via the options editor
		const addOptBtn = lastRow.querySelector<HTMLButtonElement>('.fk-modal-add-option')!;
		addOptBtn.click(); // north
		addOptBtn.click(); // south
		const nameInputs = lastRow.querySelectorAll<HTMLInputElement>('.fk-option-row input[type="text"]');
		nameInputs[0].value = 'north'; nameInputs[0].dispatchEvent(new Event('input'));
		nameInputs[1].value = 'south'; nameInputs[1].dispatchEvent(new Event('input'));
		// Switch to Layout — new field should appear in columns select
		clickTab(modal, 'Layout');
		const colSelect = modal.contentEl.querySelector<HTMLSelectElement>('[data-role="columns"]')!;
		const options = Array.from(colSelect.options).map(o => o.value);
		expect(options).toContain('region');
	});

	it('field added on Fields tab appears in Card display add-field select after switching', () => {
		const { modal } = makeModal(SCHEMA);
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent?.includes('Add field')) as HTMLButtonElement;
		addBtn.click();
		const rows = modal.contentEl.querySelectorAll('.fk-modal-field-row');
		const lastRow = rows[rows.length - 1];
		const labelInp = lastRow.querySelector('.fk-col-label') as HTMLInputElement;
		labelInp.value = 'Notes';
		labelInp.dispatchEvent(new Event('input'));
		// Switch to Card display — new field should appear in the add-field select
		clickTab(modal, 'Card display');
		const addSelect = modal.contentEl.querySelector<HTMLSelectElement>('[data-role="card-display-select"]')!;
		const options = Array.from(addSelect.options).map(o => o.value);
		expect(options).toContain('notes');
	});

	it('save can be called from the Layout tab and includes schema changes', () => {
		const onConfirm = vi.fn();
		const modal = new BoardConfigModal({} as never, SCHEMA, onConfirm);
		modal.open();
		clickTab(modal, 'Layout');
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.viewConfig.columns).toBe('status');
	});
});

describe('BoardConfigModal — Select options editor', () => {
	const SCHEMA_WITH_COLORS: BoardSchema = {
		title: 'My Board',
		fields: [
			{ name: 'title', type: 'Text', label: 'Title' },
			{ name: 'status', type: 'Select', label: 'Status',
			  options: ['todo', 'doing', 'done'],
			  colors: { todo: '#e74c3c', doing: '#3498db' },
			  default: 'todo' },
		],
		viewConfig: { columns: 'status' },
		rawWorkflow: '',
	};

	it('renders a visible fk-options-editor for a Select field', () => {
		const { modal } = makeModal(SCHEMA);
		const visible = Array.from(modal.contentEl.querySelectorAll('.fk-options-editor'))
			.filter(el => !el.classList.contains('fk-hidden'));
		expect(visible.length).toBe(1);
	});

	it('renders one option row per option', () => {
		const { modal } = makeModal(SCHEMA);
		const rows = modal.contentEl.querySelectorAll('.fk-option-row');
		expect(rows.length).toBe(3); // todo, doing, done
	});

	it('each option row has a name input and a color input', () => {
		const { modal } = makeModal(SCHEMA);
		const rows = modal.contentEl.querySelectorAll('.fk-option-row');
		rows.forEach(row => {
			expect(row.querySelector('input[type="text"]')).not.toBeNull();
			expect(row.querySelector('input[type="color"]')).not.toBeNull();
		});
	});

	it('pre-populates option name inputs from field.options', () => {
		const { modal } = makeModal(SCHEMA);
		const nameInputs = Array.from(
			modal.contentEl.querySelectorAll<HTMLInputElement>('.fk-option-row input[type="text"]')
		);
		expect(nameInputs.map(i => i.value)).toEqual(['todo', 'doing', 'done']);
	});

	it('pre-populates color swatches from field.colors', () => {
		const { modal } = makeModal(SCHEMA_WITH_COLORS);
		const rows = modal.contentEl.querySelectorAll('.fk-option-row');
		const todoColor = rows[0].querySelector<HTMLInputElement>('input[type="color"]')!;
		const doingColor = rows[1].querySelector<HTMLInputElement>('input[type="color"]')!;
		expect(todoColor.value).toBe('#e74c3c');
		expect(doingColor.value).toBe('#3498db');
	});

	it('hides the fk-options-editor for a non-Select field', () => {
		const schemaTextOnly: BoardSchema = {
			...SCHEMA,
			fields: [{ name: 'title', type: 'Text', label: 'Title' }],
		};
		const { modal } = makeModal(schemaTextOnly);
		const editor = modal.contentEl.querySelector('.fk-options-editor');
		expect(editor?.classList.contains('fk-hidden')).toBe(true);
	});

	it('includes colors in saved schema when color inputs are changed', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const colorInputs = modal.contentEl.querySelectorAll<HTMLInputElement>(
			'.fk-option-row input[type="color"]'
		);
		colorInputs[0].value = '#ff0000';
		colorInputs[0].dispatchEvent(new Event('input'));
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields.find(f => f.name === 'status')?.colors?.todo).toBe('#ff0000');
	});

	it('Add option button appends a new empty option row', () => {
		const { modal } = makeModal(SCHEMA);
		const before = modal.contentEl.querySelectorAll('.fk-option-row').length;
		const addBtn = Array.from(modal.contentEl.querySelectorAll('button'))
			.find(b => b.textContent === '+ Add option') as HTMLButtonElement;
		addBtn.click();
		const after = modal.contentEl.querySelectorAll('.fk-option-row').length;
		expect(after).toBe(before + 1);
	});

	it('remove button on an option row removes it', () => {
		const { modal } = makeModal(SCHEMA);
		const before = modal.contentEl.querySelectorAll('.fk-option-row').length;
		const removeBtn = modal.contentEl.querySelector<HTMLButtonElement>('.fk-option-remove')!;
		removeBtn.click();
		const after = modal.contentEl.querySelectorAll('.fk-option-row').length;
		expect(after).toBe(before - 1);
	});

	it('saved schema options reflect name inputs in the editor', () => {
		const { modal, onConfirm } = makeModal(SCHEMA);
		const nameInputs = modal.contentEl.querySelectorAll<HTMLInputElement>(
			'.fk-option-row input[type="text"]'
		);
		nameInputs[0].value = 'backlog';
		nameInputs[0].dispatchEvent(new Event('input'));
		modal.contentEl.querySelector<HTMLButtonElement>('.fk-modal-save')!.click();
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.fields.find(f => f.name === 'status')?.options?.[0]).toBe('backlog');
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
