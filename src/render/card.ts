import type { Board, Card } from '../model/board';
import { splitLinks } from '../data/link';
import { renderInline } from './inline';

export type ChecklistLine =
	| { kind: 'checkbox'; checked: boolean; text: string }
	| { kind: 'text'; text: string };

export function parseChecklistValue(value: string): ChecklistLine[] {
	return value.split('\n').map(line => {
		const m = line.match(/^- \[([ x])\] (.+)/);
		if (m) return { kind: 'checkbox', checked: m[1] === 'x', text: m[2] };
		return { kind: 'text', text: line };
	});
}

export function toggleCheckboxLine(value: string, lineIndex: number, checked: boolean): string {
	const lines = value.split('\n');
	if (lineIndex < 0 || lineIndex >= lines.length) return value;
	const line = lines[lineIndex];
	lines[lineIndex] = checked
		? line.replace(/^- \[ \]/, '- [x]')
		: line.replace(/^- \[x\]/, '- [ ]');
	return lines.join('\n');
}

export function effectiveCardTitle(board: Board): string | null {
	if (board.viewConfig.cardTitle !== undefined) {
		const name = board.viewConfig.cardTitle;
		if (!name) return null;
		return board.fields.some(f => f.name === name) ? name : null;
	}
	const first = board.fields.find(
		f => f.name !== '_id' && f.name !== board.viewConfig.columns,
	);
	return first?.name ?? null;
}

export function effectiveCardFields(board: Board): string[] {
	const titleField = effectiveCardTitle(board);
	return (board.viewConfig.cardFields ?? []).filter(
		name => name !== titleField && board.fields.some(f => f.name === name),
	);
}

export function renderCard(parent: HTMLElement, card: Card, board: Board): HTMLElement {
	const container = parent.createDiv({ cls: ['fk-card', 'fk-card--draggable'] });
	container.dataset.cardId = card.id;

	const titleFieldName = effectiveCardTitle(board);
	if (titleFieldName !== null) {
		renderInline(card.values[titleFieldName] ?? '', container.createDiv({ cls: 'fk-card__title' }));
	}

	const secondaryFields = effectiveCardFields(board)
		.map(name => board.fields.find(f => f.name === name))
		.filter((f): f is NonNullable<typeof f> => f !== undefined);

	if (secondaryFields.length) {
		const fieldsEl = container.createDiv({ cls: 'fk-card__fields' });
		const showLabels = board.viewConfig.cardLabels !== false;

		for (const field of secondaryFields) {
			const value = card.values[field.name] ?? '';
			if (!value) continue;

			const row = fieldsEl.createDiv({ cls: 'fk-card__field' });

			if (showLabels) {
				row.createSpan({ cls: 'fk-card__field-label', text: field.label });
			}

			if (field.type === 'Link') {
				const linksEl = row.createSpan({ cls: 'fk-card__field-links' });
				for (const item of splitLinks(value)) {
					const span = linksEl.createSpan({ cls: 'fk-card__field-link', text: item });
					span.dataset.href = item;
					span.title = item;
				}
			} else if (field.type === 'Textarea' && /^- \[[ x]\]/m.test(value)) {
				const listEl = row.createDiv({ cls: 'fk-card__checklist' });
				parseChecklistValue(value).forEach((item, idx) => {
					if (item.kind === 'checkbox') {
						const label = listEl.createEl('label', { cls: 'fk-card__checklist-item' });
						const input = label.createEl('input', { cls: 'fk-card__checkbox', type: 'checkbox' });
						input.checked = item.checked;
						input.dataset.field = field.name;
						input.dataset.lineIndex = String(idx);
						renderInline(item.text, label.createSpan({ cls: 'fk-card__checklist-label' }));
					} else if (item.text.trim()) {
						listEl.createSpan({ cls: 'fk-card__checklist-text', text: item.text });
					}
				});
			} else if (field.type === 'Textarea' && value.split('\n').filter(l => l.trim()).every(l => /^- /.test(l))) {
				const ul = row.createEl('ul');
				for (const line of value.split('\n')) {
					const text = line.replace(/^- /, '');
					if (text) renderInline(text, ul.createEl('li'));
				}
			} else if (field.type === 'Textarea' && value.split('\n').filter(l => l.trim()).every(l => /^\d+\. /.test(l))) {
				const ol = row.createEl('ol');
				for (const line of value.split('\n')) {
					const text = line.replace(/^\d+\. /, '');
					if (text) renderInline(text, ol.createEl('li'));
				}
			} else {
				renderInline(value, row.createSpan({ cls: 'fk-card__field-value' }));
			}
		}

		if (!fieldsEl.childElementCount) fieldsEl.remove();
	}

	return container;
}
