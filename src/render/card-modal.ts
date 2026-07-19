import { App, Modal, FuzzySuggestModal, TFile } from 'obsidian';
import type { Board, Card, FieldDefinition } from '../model/board';
import { splitLinks, joinLinks, validateLinkItem } from '../data/link';

class LinkFilePicker extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onSelect: (path: string) => void) {
		super(app);
	}
	getItems(): TFile[] {
		return this.app.vault.getFiles();
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
		private sourcePath: string = '',
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.titleEl.textContent = this.card ? 'Edit card' : 'Add card';

		const columnField = this.board.viewConfig.columns;
		const editableFields = this.board.fields.filter(f => f.name !== '_id');

		for (const field of editableFields) {
			this.renderField(contentEl, field, field.name === columnField && !this.card ? this.columnValue : undefined);
		}

		const footer = contentEl.createEl('div', { cls: 'fk-modal-footer' });

		if (this.onDelete) {
			const deleteBtn = footer.createEl('button', { cls: 'fk-modal-delete', text: 'Delete' });
			deleteBtn.addEventListener('click', () => {
				this.onDelete!();
				this.close();
			});
		}

		const saveBtn = footer.createEl('button', { cls: 'fk-modal-save', text: 'Save' });
		saveBtn.addEventListener('click', () => {
			const values = { ...this.values };
			this.close();
			this.containerEl?.remove();
			this.onConfirm(values);
		});

		contentEl.querySelector<HTMLElement>('input, textarea, select')?.focus();
	}

	private renderField(container: HTMLElement, field: FieldDefinition, initialOverride?: string): void {
		const initialValue = initialOverride
			?? (this.card ? (this.card.values[field.name] ?? '') : (field.default ?? ''));
		this.values[field.name] = initialValue;

		const wrapper = container.createEl('div', { cls: 'fk-modal-field' });
		wrapper.createEl('label', { text: field.label });

		const onChange = (value: string) => { this.values[field.name] = value; };

		if (field.type === 'Link') {
			this.renderLinkField(wrapper, field, initialValue, onChange);
		} else if (field.type === 'Select' && field.options) {
			const sel = wrapper.createEl('select', { cls: 'fk-modal-input' });
			for (const opt of field.options) {
				const o = sel.createEl('option', { text: opt });
				o.value = opt;
				if (opt === initialValue) o.selected = true;
			}
			sel.addEventListener('change', () => onChange(sel.value));
		} else if (field.type === 'Textarea') {
			const ta = wrapper.createEl('textarea', { cls: 'fk-modal-input' });
			ta.value = initialValue;
			ta.rows = 4;
			ta.addEventListener('input', () => onChange(ta.value));
		} else {
			const inp = wrapper.createEl('input', { cls: 'fk-modal-input' });
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
		}
	}

	private renderLinkField(container: HTMLElement, _field: FieldDefinition, initialValue: string, onChange: (v: string) => void): void {
		const items = splitLinks(initialValue);

		const field = container.createEl('div', { cls: 'fk-link-field' });
		const itemList = field.createEl('div');

		const openLink = (item: string) => {
			this.close();
			if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(item)) {
				window.open(item, '_blank');
			} else {
				void this.app.workspace.openLinkText(item, this.sourcePath, 'tab');
			}
		};

		const renderItems = () => {
			while (itemList.firstChild) itemList.removeChild(itemList.firstChild);
			for (const item of items) {
				const row = itemList.createEl('div', { cls: 'fk-link-item' });

				const remove = row.createEl('span', { cls: 'fk-link-item__remove' });
				remove.setAttribute('role', 'button');
				remove.setAttribute('tabindex', '0');
				remove.setAttribute('aria-label', 'Remove');
				remove.textContent = '×';
				const doRemove = (e: Event) => {
					e.stopPropagation();
					const idx = items.indexOf(item);
					if (idx > -1) items.splice(idx, 1);
					onChange(joinLinks(items));
					renderItems();
				};
				remove.addEventListener('click', doRemove);
				remove.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') doRemove(e);
				});

				const val = row.createEl('span', { cls: 'fk-link-item__value' });
				val.setAttribute('role', 'button');
				val.setAttribute('tabindex', '0');
				val.textContent = item;
				val.addEventListener('click', () => openLink(item));
				val.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') openLink(item);
				});
			}
		};

		renderItems();

		const controls = field.createEl('div', { cls: 'fk-link-controls' });

		const addFileBtn = controls.createEl('button', { cls: 'fk-link-add--file', text: '+ Add file' });
		addFileBtn.addEventListener('click', () => {
			new LinkFilePicker(this.app, (path) => {
				items.push(path);
				onChange(joinLinks(items));
				renderItems();
			}).open();
		});

		const addUrlBtn = controls.createEl('button', { cls: 'fk-link-add--url', text: '+ Add URL' });

		const urlInputArea = controls.createEl('div', { cls: ['fk-link-url-input', 'fk-hidden'] });

		const urlInput = urlInputArea.createEl('input', { type: 'text' });
		urlInput.placeholder = 'https://…';

		const urlError = urlInputArea.createEl('span', { cls: 'fk-link-error' });

		const urlConfirm = urlInputArea.createEl('button', { cls: 'fk-link-url-confirm', text: 'Add' });
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
			urlInputArea.classList.add('fk-hidden');
			renderItems();
		});

		addUrlBtn.addEventListener('click', () => {
			const hidden = urlInputArea.classList.contains('fk-hidden');
			urlInputArea.classList.toggle('fk-hidden');
			if (hidden) urlInput.focus();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
