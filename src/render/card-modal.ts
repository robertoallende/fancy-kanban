import { App, Modal, FuzzySuggestModal, TFile } from 'obsidian';
import type { Board, Card, FieldDefinition } from '../model/board';
import { splitLinks, joinLinks, validateLinkItem } from '../data/link';

class LinkFilePicker extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onSelect: (path: string) => void) {
		super(app);
	}
	getItems(): TFile[] {
		return (this.app as App).vault.getFiles();
	}
	getItemText(file: TFile): string {
		return file.path;
	}
	onChooseItem(file: TFile): void {
		this.onSelect(file.path);
	}
}

export class CardModal extends Modal {
	private values: Record<string, string> = {};

	constructor(
		app: App,
		private board: Board,
		private card: Card | null,
		private columnValue: string,
		private onConfirm: (values: Record<string, string>) => void,
		private onDelete?: () => void,
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

		const footer = activeDocument.createElement('div');
		footer.classList.add('fk-modal-footer');

		if (this.onDelete) {
			const deleteBtn = activeDocument.createElement('button');
			deleteBtn.classList.add('fk-modal-delete');
			deleteBtn.textContent = 'Delete';
			deleteBtn.addEventListener('click', () => {
				this.onDelete!();
				this.close();
			});
			footer.appendChild(deleteBtn);
		}

		const saveBtn = activeDocument.createElement('button');
		saveBtn.classList.add('fk-modal-save');
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => {
			const values = { ...this.values };
			this.close();
			this.containerEl?.remove();
			this.onConfirm(values);
		});
		footer.appendChild(saveBtn);
		contentEl.appendChild(footer);

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

		if (field.type === 'Link') {
			this.renderLinkField(wrapper, field, initialValue, onChange);
		} else if (field.type === 'Select' && field.options) {
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
				if (e.key === 'Enter') {
					e.preventDefault();
					e.stopPropagation();
					const values = { ...this.values };
					this.close();
					this.containerEl?.remove();
					this.onConfirm(values);
				}
			});
			wrapper.appendChild(inp);
		}

		container.appendChild(wrapper);
	}

	private renderLinkField(container: HTMLElement, _field: FieldDefinition, initialValue: string, onChange: (v: string) => void): void {
		const items = splitLinks(initialValue);

		const field = activeDocument.createElement('div');
		field.classList.add('fk-link-field');
		container.appendChild(field);

		const itemList = activeDocument.createElement('div');
		field.appendChild(itemList);

		const renderItems = () => {
			while (itemList.firstChild) itemList.removeChild(itemList.firstChild);
			for (const item of items) {
				const row = activeDocument.createElement('div');
				row.classList.add('fk-link-item');
				const val = activeDocument.createElement('span');
				val.classList.add('fk-link-item__value');
				val.textContent = item;
				const remove = activeDocument.createElement('button');
				remove.classList.add('fk-link-item__remove');
				remove.setAttribute('aria-label', 'Remove');
				remove.textContent = '×';
				remove.addEventListener('click', () => {
					const idx = items.indexOf(item);
					if (idx > -1) items.splice(idx, 1);
					onChange(joinLinks(items));
					renderItems();
				});
				row.appendChild(val);
				row.appendChild(remove);
				itemList.appendChild(row);
			}
		};

		renderItems();

		const controls = activeDocument.createElement('div');
		controls.classList.add('fk-link-controls');

		const addFileBtn = activeDocument.createElement('button');
		addFileBtn.classList.add('fk-link-add--file');
		addFileBtn.textContent = '+ Add file';
		addFileBtn.addEventListener('click', () => {
			new LinkFilePicker(this.app as App, (path) => {
				items.push(path);
				onChange(joinLinks(items));
				renderItems();
			}).open();
		});

		const urlInputArea = activeDocument.createElement('div');
		urlInputArea.classList.add('fk-link-url-input');
		urlInputArea.style.display = 'none';

		const urlInput = activeDocument.createElement('input');
		urlInput.type = 'text';
		urlInput.placeholder = 'https://…';

		const urlError = activeDocument.createElement('span');
		urlError.classList.add('fk-link-error');

		const urlConfirm = activeDocument.createElement('button');
		urlConfirm.classList.add('fk-link-url-confirm');
		urlConfirm.textContent = 'Add';
		urlConfirm.addEventListener('click', () => {
			const value = urlInput.value.trim();
			const result = validateLinkItem(value);
			if (!result.valid) {
				urlError.textContent = result.error ?? '';
				return;
			}
			urlError.textContent = '';
			items.push(value);
			onChange(joinLinks(items));
			urlInput.value = '';
			urlInputArea.style.display = 'none';
			renderItems();
		});

		urlInputArea.appendChild(urlInput);
		urlInputArea.appendChild(urlError);
		urlInputArea.appendChild(urlConfirm);

		const addUrlBtn = activeDocument.createElement('button');
		addUrlBtn.classList.add('fk-link-add--url');
		addUrlBtn.textContent = '+ Add URL';
		addUrlBtn.addEventListener('click', () => {
			const hidden = urlInputArea.style.display === 'none';
			urlInputArea.style.display = hidden ? '' : 'none';
			if (hidden) urlInput.focus();
		});

		controls.appendChild(addFileBtn);
		controls.appendChild(addUrlBtn);
		controls.appendChild(urlInputArea);
		field.appendChild(controls);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
