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
		modal.contentEl.querySelector('button')!.click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		const schema = onConfirm.mock.calls[0][0] as BoardSchema;
		expect(schema.title).toBeDefined();
		expect(schema.fields.length).toBeGreaterThan(0);
	});

	it('confirmed schema has a columns field matching an existing field', () => {
		const { modal, onConfirm } = makeModal();
		modal.contentEl.querySelector('button')!.click();
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
		modal.contentEl.querySelector('button')!.click();
		expect((onConfirm.mock.calls[0][0] as BoardSchema).title).toBe('Renamed Board');
	});

	it('does not mutate the original schema', () => {
		const original = JSON.stringify(SCHEMA);
		const { modal } = makeModal(SCHEMA);
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		inp.value = 'Changed';
		inp.dispatchEvent(new Event('input'));
		modal.contentEl.querySelector('button')!.click();
		expect(JSON.stringify(SCHEMA)).toBe(original);
	});
});

describe('BoardConfigModal — validation', () => {
	it('shows error and does not call onConfirm when title is empty', () => {
		const { modal, onConfirm } = makeModal();
		const inp = modal.contentEl.querySelector('input') as HTMLInputElement;
		inp.value = '';
		inp.dispatchEvent(new Event('input'));
		modal.contentEl.querySelector('button')!.click();
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
