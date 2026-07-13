import { App, Modal } from 'obsidian';
import type { Board, Card, FieldDefinition } from '../model/board';

export class CardModal extends Modal {
	private values: Record<string, string> = {};

	constructor(
		app: App,
		private board: Board,
		private card: Card | null,
		private columnValue: string,
		private onConfirm: (values: Record<string, string>) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.titleEl.textContent = this.card ? 'Edit card' : 'Add card';

		const columnField = this.board.viewConfig.columns;
		const editableFields = this.board.fields.filter(
			f => f.name !== '_id' && f.name !== columnField,
		);

		for (const field of editableFields) {
			this.renderField(contentEl, field);
		}

		const saveBtn = activeDocument.createElement('button');
		saveBtn.classList.add('fk-modal-save');
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => {
			this.onConfirm(this.values);
			this.close();
		});
		contentEl.appendChild(saveBtn);

		contentEl.querySelector<HTMLElement>('input, textarea, select')?.focus();
	}

	private renderField(container: HTMLElement, field: FieldDefinition): void {
		const initialValue = this.card
			? (this.card.values[field.name] ?? '')
			: (field.default ?? '');
		this.values[field.name] = initialValue;

		const wrapper = activeDocument.createElement('div');
		wrapper.classList.add('fk-modal-field');

		const label = activeDocument.createElement('label');
		label.textContent = field.label;
		wrapper.appendChild(label);

		const onChange = (value: string) => { this.values[field.name] = value; };

		if (field.type === 'Select' && field.options) {
			const sel = activeDocument.createElement('select');
			sel.classList.add('fk-modal-input');
			for (const opt of field.options) {
				const o = activeDocument.createElement('option');
				o.value = opt;
				o.textContent = opt;
				if (opt === initialValue) o.selected = true;
				sel.appendChild(o);
			}
			sel.addEventListener('change', () => onChange(sel.value));
			wrapper.appendChild(sel);
		} else if (field.type === 'Textarea') {
			const ta = activeDocument.createElement('textarea');
			ta.classList.add('fk-modal-input');
			ta.value = initialValue;
			ta.rows = 4;
			ta.addEventListener('input', () => onChange(ta.value));
			wrapper.appendChild(ta);
		} else {
			const inp = activeDocument.createElement('input');
			inp.classList.add('fk-modal-input');
			inp.type = field.type === 'Date' ? 'date'
				: field.type === 'Number' ? 'number'
				: 'text';
			inp.value = initialValue;
			inp.addEventListener('input', () => onChange(inp.value));
			inp.addEventListener('keydown', (e: KeyboardEvent) => {
				if (e.key === 'Enter') { this.onConfirm(this.values); this.close(); }
			});
			wrapper.appendChild(inp);
		}

		container.appendChild(wrapper);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
