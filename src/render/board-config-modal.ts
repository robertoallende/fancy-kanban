import { App, Modal } from 'obsidian';
import type { BoardSchema, FieldDefinition, FieldType } from '../model/board';

const FIELD_TYPES: FieldType[] = ['Text', 'Textarea', 'Date', 'Number', 'Select', 'File'];

const DEFAULT_SCHEMA: BoardSchema = {
	title: 'New Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'], default: 'todo' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
};

export class BoardConfigModal extends Modal {
	private schema: BoardSchema;
	private errorEl: HTMLElement | null = null;

	constructor(
		app: App,
		initial: BoardSchema | null,
		private onConfirm: (schema: BoardSchema) => void,
	) {
		super(app);
		this.schema = initial
			? { ...initial, fields: initial.fields.map(f => ({ ...f })) }
			: { ...DEFAULT_SCHEMA, fields: DEFAULT_SCHEMA.fields.map(f => ({ ...f })) };
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.titleEl.textContent = this.schema.title === 'New Board' && !this.schema.fields.length
			? 'New board'
			: 'Board settings';

		this.renderTitleInput(contentEl);
		this.renderFieldsSection(contentEl);
		this.renderViewConfig(contentEl);
		this.renderWorkflow(contentEl);

		this.errorEl = document.createElement('p');
		this.errorEl.classList.add('fk-modal-error');
		contentEl.appendChild(this.errorEl);

		const saveBtn = document.createElement('button');
		saveBtn.classList.add('fk-modal-save');
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => this.submit());
		contentEl.appendChild(saveBtn);

		(contentEl.querySelector('input') as HTMLElement | null)?.focus();
	}

	private renderTitleInput(container: HTMLElement): void {
		const wrap = this.field(container, 'Board title');
		const inp = document.createElement('input');
		inp.type = 'text';
		inp.classList.add('fk-modal-input');
		inp.value = this.schema.title;
		inp.addEventListener('input', () => { this.schema.title = inp.value; });
		wrap.appendChild(inp);
	}

	private renderFieldsSection(container: HTMLElement): void {
		const section = document.createElement('div');
		section.classList.add('fk-modal-section');
		const heading = document.createElement('p');
		heading.classList.add('fk-modal-section-label');
		heading.textContent = 'Fields';
		section.appendChild(heading);

		const list = document.createElement('div');
		list.classList.add('fk-modal-field-list');
		section.appendChild(list);

		for (const f of this.schema.fields) {
			list.appendChild(this.renderFieldRow(f));
		}

		container.appendChild(section);
	}

	renderFieldRow(field: FieldDefinition): HTMLElement {
		const row = document.createElement('div');
		row.classList.add('fk-modal-field-row');

		const nameInp = this.smallInput(row, 'Name', field.name);
		nameInp.addEventListener('input', () => { field.name = nameInp.value; this.refreshViewConfig(); });

		const typeSelect = document.createElement('select');
		typeSelect.classList.add('fk-modal-input-sm');
		for (const t of FIELD_TYPES) {
			const o = document.createElement('option');
			o.value = t;
			o.textContent = t;
			if (t === field.type) o.selected = true;
			typeSelect.appendChild(o);
		}
		typeSelect.addEventListener('change', () => {
			field.type = typeSelect.value as FieldType;
			optionsWrap.style.display = field.type === 'Select' ? '' : 'none';
		});
		row.appendChild(typeSelect);

		const labelInp = this.smallInput(row, 'Label', field.label);
		labelInp.addEventListener('input', () => { field.label = labelInp.value; });

		const optionsWrap = document.createElement('div');
		optionsWrap.classList.add('fk-modal-options-wrap');
		optionsWrap.style.display = field.type === 'Select' ? '' : 'none';
		const optionsInp = this.smallInput(optionsWrap, 'Options (pipe-separated)', (field.options ?? []).join('|'));
		optionsInp.addEventListener('input', () => {
			field.options = optionsInp.value.split('|').map(s => s.trim()).filter(Boolean);
		});
		row.appendChild(optionsWrap);

		const defaultInp = this.smallInput(row, 'Default', field.default ?? '');
		defaultInp.addEventListener('input', () => {
			field.default = defaultInp.value || undefined;
		});

		return row;
	}

	private renderViewConfig(container: HTMLElement): void {
		const section = document.createElement('div');
		section.classList.add('fk-modal-section');

		const colWrap = this.field(section, 'Columns field');
		const colSelect = document.createElement('select');
		colSelect.classList.add('fk-modal-input');
		colSelect.dataset.role = 'columns';
		this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
		colSelect.addEventListener('change', () => { this.schema.viewConfig.columns = colSelect.value; });
		colWrap.appendChild(colSelect);

		const laneWrap = this.field(section, 'Lanes field (optional)');
		const laneSelect = document.createElement('select');
		laneSelect.classList.add('fk-modal-input');
		laneSelect.dataset.role = 'lanes';
		const blank = document.createElement('option');
		blank.value = '';
		blank.textContent = '— none —';
		laneSelect.appendChild(blank);
		this.populateFieldSelect(laneSelect, this.schema.viewConfig.lanes ?? '');
		laneSelect.addEventListener('change', () => {
			this.schema.viewConfig.lanes = laneSelect.value || undefined;
		});
		laneWrap.appendChild(laneSelect);

		container.appendChild(section);
	}

	private renderWorkflow(container: HTMLElement): void {
		const wrap = this.field(container, 'Workflow (optional)');
		const inp = document.createElement('input');
		inp.type = 'text';
		inp.classList.add('fk-modal-input');
		inp.placeholder = 'todo→doing, doing→done';
		inp.value = this.schema.rawWorkflow ?? '';
		inp.addEventListener('input', () => { this.schema.rawWorkflow = inp.value; });
		wrap.appendChild(inp);
	}

	private refreshViewConfig(): void {
		const colSelect = this.contentEl.querySelector<HTMLSelectElement>('[data-role="columns"]');
		const laneSelect = this.contentEl.querySelector<HTMLSelectElement>('[data-role="lanes"]');
		if (colSelect) this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
		if (laneSelect) {
			const first = laneSelect.firstChild as HTMLElement;
			laneSelect.innerHTML = '';
			laneSelect.appendChild(first);
			this.populateFieldSelect(laneSelect, this.schema.viewConfig.lanes ?? '');
		}
	}

	private populateFieldSelect(select: HTMLSelectElement, current: string): void {
		const existing = Array.from(select.options).map(o => o.value).filter(v => v);
		const names = this.schema.fields.map(f => f.name).filter(n => n);
		for (const name of names) {
			if (!existing.includes(name)) {
				const o = document.createElement('option');
				o.value = name;
				o.textContent = name;
				select.appendChild(o);
			}
		}
		if (current) select.value = current;
	}

	private submit(): void {
		const error = this.validate();
		if (error) {
			if (this.errorEl) this.errorEl.textContent = error;
			return;
		}
		this.onConfirm(this.schema);
		this.close();
	}

	private validate(): string | null {
		if (!this.schema.title.trim()) return 'Board title is required.';
		if (this.schema.fields.length === 0) return 'At least one field is required.';
		const names = this.schema.fields.map(f => f.name.trim());
		if (names.some(n => !n)) return 'All field names must be non-empty.';
		if (new Set(names).size !== names.length) return 'Field names must be unique.';
		for (const f of this.schema.fields) {
			if (f.type === 'Select' && (!f.options || f.options.length === 0)) {
				return `Select field "${f.name}" must have at least one option.`;
			}
		}
		if (!this.schema.fields.some(f => f.name === this.schema.viewConfig.columns)) {
			return 'Columns field must match an existing field name.';
		}
		return null;
	}

	private field(container: HTMLElement, label: string): HTMLElement {
		const wrap = document.createElement('div');
		wrap.classList.add('fk-modal-field');
		const lbl = document.createElement('label');
		lbl.textContent = label;
		wrap.appendChild(lbl);
		container.appendChild(wrap);
		return wrap;
	}

	private smallInput(container: HTMLElement, placeholder: string, value: string): HTMLInputElement {
		const inp = document.createElement('input');
		inp.type = 'text';
		inp.classList.add('fk-modal-input-sm');
		inp.placeholder = placeholder;
		inp.value = value;
		container.appendChild(inp);
		return inp;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
