import { App, Modal } from 'obsidian';
import type { BoardSchema, FieldDefinition, FieldType } from '../model/board';

function deriveFieldName(label: string): string {
	return label.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
}

const FIELD_TYPES: FieldType[] = ['Text', 'Textarea', 'Date', 'Number', 'Select', 'Link'];

const DEFAULT_SCHEMA: BoardSchema = {
	title: 'New Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'], default: 'todo' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	version: 1,
};

export class BoardConfigModal extends Modal {
	private schema: BoardSchema;
	private errorEl: HTMLElement | null = null;
	private fieldListEl: HTMLElement | null = null;
	private cardFieldListEl: HTMLElement | null = null;

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
		this.renderCardDisplay(contentEl);
		this.renderWorkflow(contentEl);

		this.errorEl = contentEl.createEl('p', { cls: 'fk-modal-error' });

		const saveBtn = contentEl.createEl('button', { cls: 'fk-modal-save', text: 'Save' });
		saveBtn.addEventListener('click', () => this.submit());

		contentEl.querySelector<HTMLElement>('input')?.focus();
	}

	private renderTitleInput(container: HTMLElement): void {
		const wrap = this.field(container, 'Board title');
		const inp = wrap.createEl('input', { type: 'text', cls: 'fk-modal-input' });
		inp.value = this.schema.title;
		inp.addEventListener('input', () => { this.schema.title = inp.value; });
	}

	private renderFieldsSection(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'fk-modal-section' });

		section.createEl('p', { cls: 'fk-modal-section-label', text: 'Fields' });

		this.fieldListEl = section.createDiv({ cls: 'fk-modal-field-list' });

		this.rerenderFieldList();

		const addBtn = section.createEl('button', { cls: 'fk-modal-add-field', text: '+ Add field' });
		addBtn.addEventListener('click', () => {
			this.schema.fields.push({ name: '', type: 'Text', label: '' });
			this.rerenderFieldList();
			this.refreshViewConfig();
		});
	}

	private rerenderFieldList(): void {
		if (!this.fieldListEl) return;
		this.fieldListEl.innerHTML = '';
		this.schema.fields.forEach((f, idx) => {
			this.renderFieldRow(this.fieldListEl!, f, idx);
		});
	}

	renderFieldRow(parent: HTMLElement, field: FieldDefinition, idx: number): HTMLElement {
		const total = this.schema.fields.length;
		const row = parent.createDiv({ cls: 'fk-modal-field-row' });

		const isNew = field.name === '';

		const labelInp = this.fixedInput(row, 'Label', field.label, 'fk-col-label');
		if (!isNew) labelInp.title = `id: ${field.name}`;
		labelInp.addEventListener('input', () => {
			field.label = labelInp.value;
			if (isNew) {
				field.name = deriveFieldName(labelInp.value);
				labelInp.title = field.name ? `id: ${field.name}` : '';
				this.refreshViewConfig();
			}
		});

		const typeSelect = row.createEl('select', { cls: ['fk-modal-input-sm', 'fk-col-type'] });
		for (const t of FIELD_TYPES) {
			const o = typeSelect.createEl('option', { text: t });
			o.value = t;
			if (t === field.type) o.selected = true;
		}

		const isSelect = field.type === 'Select';

		const optionsInp = this.fixedInput(row, 'a | b | c', (field.options ?? []).join(', '), 'fk-col-options');
		optionsInp.disabled = !isSelect;
		optionsInp.addEventListener('input', () => {
			field.options = optionsInp.value.split(',').map(s => s.trim()).filter(Boolean);
		});

		const defaultInp = this.fixedInput(row, 'Default', field.default ?? '', 'fk-col-default');
		defaultInp.disabled = !isSelect;
		defaultInp.addEventListener('input', () => {
			field.default = defaultInp.value || undefined;
		});

		typeSelect.addEventListener('change', () => {
			field.type = typeSelect.value as FieldType;
			const nowSelect = field.type === 'Select';
			optionsInp.disabled = !nowSelect;
			defaultInp.disabled = !nowSelect;
			if (!nowSelect) {
				field.options = undefined;
				field.default = undefined;
				optionsInp.value = '';
				defaultInp.value = '';
			}
		});

		// Reorder / remove controls
		const controls = row.createDiv({ cls: 'fk-modal-row-controls' });

		const upBtn = this.iconBtn(controls, '↑', idx === 0);
		upBtn.addEventListener('click', () => {
			[this.schema.fields[idx - 1], this.schema.fields[idx]] =
				[this.schema.fields[idx], this.schema.fields[idx - 1]];
			this.rerenderFieldList();
		});

		const downBtn = this.iconBtn(controls, '↓', idx === total - 1);
		downBtn.addEventListener('click', () => {
			[this.schema.fields[idx], this.schema.fields[idx + 1]] =
				[this.schema.fields[idx + 1], this.schema.fields[idx]];
			this.rerenderFieldList();
		});

		const removeBtn = this.iconBtn(controls, '×', total <= 1);
		removeBtn.addEventListener('click', () => {
			this.schema.fields.splice(idx, 1);
			this.rerenderFieldList();
			this.refreshViewConfig();
		});

		return row;
	}

	private renderViewConfig(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'fk-modal-section' });

		const colWrap = this.field(section, 'Columns field');
		const colSelect = colWrap.createEl('select', { cls: 'fk-modal-input' });
		colSelect.dataset.role = 'columns';
		this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
		colSelect.addEventListener('change', () => { this.schema.viewConfig.columns = colSelect.value; });
	}

	private renderCardDisplay(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'fk-modal-section' });

		section.createEl('p', { cls: 'fk-modal-section-label', text: 'Card display' });

		// Card title dropdown
		const titleWrap = this.field(section, 'Card title');
		const titleSelect = titleWrap.createEl('select', { cls: 'fk-modal-input' });
		titleSelect.dataset.role = 'card-title-select';
		const autoOpt = titleSelect.createEl('option', { text: '(auto)' });
		autoOpt.value = '__auto__';
		const noneOpt = titleSelect.createEl('option', { text: '(none)' });
		noneOpt.value = '';
		this.populateCardTitleSelect(titleSelect);
		titleSelect.value = this.schema.viewConfig.cardTitle ?? '__auto__';
		titleSelect.addEventListener('change', () => {
			const v = titleSelect.value;
			this.schema.viewConfig.cardTitle = v === '__auto__' ? undefined : v;
		});

		// Show labels checkbox
		const labelsWrap = this.field(section, 'Show labels');
		const labelsCheck = labelsWrap.createEl('input', { type: 'checkbox' });
		labelsCheck.checked = this.schema.viewConfig.cardLabels !== false;
		labelsCheck.addEventListener('change', () => {
			this.schema.viewConfig.cardLabels = labelsCheck.checked ? undefined : false;
		});

		this.cardFieldListEl = section.createDiv({ cls: 'fk-modal-field-list' });
		this.rerenderCardFieldList();

		const addRow = section.createDiv();
		addRow.dataset.role = 'card-display-add';

		const addSelect = addRow.createEl('select', { cls: 'fk-modal-input-sm' });
		addSelect.dataset.role = 'card-display-select';

		const addBtn = addRow.createEl('button', { cls: 'fk-modal-add-field', text: '+ Add field' });
		addBtn.addEventListener('click', () => {
			const name = addSelect.value;
			if (!name) return;
			const current = this.schema.viewConfig.cardFields ?? [];
			if (!current.includes(name)) {
				this.schema.viewConfig.cardFields = [...current, name];
				this.rerenderCardFieldList();
				this.refreshCardDisplaySelect();
			}
		});

		this.refreshCardDisplaySelect();
	}

	private rerenderCardFieldList(): void {
		if (!this.cardFieldListEl) return;
		this.cardFieldListEl.innerHTML = '';
		const cardFields = this.schema.viewConfig.cardFields ?? [];
		cardFields.forEach((name, idx) => {
			const field = this.schema.fields.find(f => f.name === name);
			const row = this.cardFieldListEl!.createDiv({ cls: 'fk-modal-field-row' });

			row.createSpan({ cls: 'fk-flex-1', text: field?.label ?? name });

			const controls = row.createDiv({ cls: 'fk-modal-row-controls' });

			const upBtn = this.iconBtn(controls, '↑', idx === 0);
			upBtn.addEventListener('click', () => {
				const cf = [...(this.schema.viewConfig.cardFields ?? [])];
				[cf[idx - 1], cf[idx]] = [cf[idx], cf[idx - 1]];
				this.schema.viewConfig.cardFields = cf;
				this.rerenderCardFieldList();
			});

			const downBtn = this.iconBtn(controls, '↓', idx === cardFields.length - 1);
			downBtn.addEventListener('click', () => {
				const cf = [...(this.schema.viewConfig.cardFields ?? [])];
				[cf[idx], cf[idx + 1]] = [cf[idx + 1], cf[idx]];
				this.schema.viewConfig.cardFields = cf;
				this.rerenderCardFieldList();
			});

			const removeBtn = this.iconBtn(controls, '×', false);
			removeBtn.addEventListener('click', () => {
				const cf = (this.schema.viewConfig.cardFields ?? []).filter((_, i) => i !== idx);
				this.schema.viewConfig.cardFields = cf.length ? cf : undefined;
				this.rerenderCardFieldList();
				this.refreshCardDisplaySelect();
			});
		});
	}

	private populateCardTitleSelect(select: HTMLSelectElement): void {
		const existing = Array.from(select.options).map(o => o.value);
		for (const f of this.schema.fields.filter(f => f.name !== '_id')) {
			if (!existing.includes(f.name)) {
				const o = select.createEl('option', { text: f.label || f.name });
				o.value = f.name;
			}
		}
	}

	private refreshCardTitleSelect(): void {
		const select = this.contentEl.querySelector<HTMLSelectElement>('[data-role="card-title-select"]');
		if (!select) return;
		const current = select.value;
		while (select.options.length > 2) select.remove(2); // keep (auto) and (none)
		this.populateCardTitleSelect(select);
		select.value = current in Array.from(select.options).map(o => o.value) ? current : (this.schema.viewConfig.cardTitle ?? '__auto__');
	}

	private refreshCardDisplaySelect(): void {
		const select = this.contentEl.querySelector<HTMLSelectElement>('[data-role="card-display-select"]');
		if (!select) return;
		select.innerHTML = '';
		const current = this.schema.viewConfig.cardFields ?? [];
		const available = this.schema.fields.filter(f => f.name !== '_id' && !current.includes(f.name));
		for (const f of available) {
			const o = select.createEl('option', { text: f.label || f.name });
			o.value = f.name;
		}
	}

	private renderWorkflow(container: HTMLElement): void {
		const wrap = this.field(container, 'Workflow (optional)');
		const inp = wrap.createEl('input', { type: 'text', cls: 'fk-modal-input' });
		inp.placeholder = 'todo→doing, doing→done';
		inp.value = this.schema.rawWorkflow ?? '';
		inp.addEventListener('input', () => { this.schema.rawWorkflow = inp.value; });
	}

	private refreshViewConfig(): void {
		const colSelect = this.contentEl.querySelector<HTMLSelectElement>('[data-role="columns"]');
		if (colSelect) this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
		this.refreshCardTitleSelect();
		this.rerenderCardFieldList();
		this.refreshCardDisplaySelect();
	}

	private populateFieldSelect(select: HTMLSelectElement, current: string): void {
		const existing = Array.from(select.options).map(o => o.value).filter(v => v);
		const names = this.schema.fields.map(f => f.name).filter(n => n);
		for (const name of names) {
			if (!existing.includes(name)) {
				const o = select.createEl('option', { text: name });
				o.value = name;
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
		const wrap = container.createDiv({ cls: 'fk-modal-field' });
		wrap.createEl('label', { text: label });
		return wrap;
	}

	private smallInput(container: HTMLElement, placeholder: string, value: string): HTMLInputElement {
		const inp = container.createEl('input', { type: 'text', cls: 'fk-modal-input-sm' });
		inp.placeholder = placeholder;
		inp.value = value;
		return inp;
	}

	private fixedInput(container: HTMLElement, placeholder: string, value: string, cls: string): HTMLInputElement {
		const inp = container.createEl('input', { type: 'text', cls: ['fk-modal-input-sm', cls] });
		inp.placeholder = placeholder;
		inp.value = value;
		return inp;
	}

	private iconBtn(container: HTMLElement, label: string, disabled: boolean): HTMLButtonElement {
		const btn = container.createEl('button', { cls: 'fk-modal-icon-btn', text: label });
		btn.disabled = disabled;
		return btn;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
