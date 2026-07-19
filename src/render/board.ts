import type { Board } from '../model/board';
import { renderColumn } from './column';

function capitalise(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function renderBoard(board: Board): HTMLElement {
	const wrapper = createEl('div', { cls: 'fk-board' });

	const header = createEl('div', { cls: 'fk-board__header' });

	const settingsBtn = createEl('button', { cls: 'fk-board__settings', text: '⚙' });
	settingsBtn.title = 'Board settings';
	header.appendChild(settingsBtn);

	const titleEl = createEl('span', { cls: 'fk-board__title', text: board.title });
	header.appendChild(titleEl);

	wrapper.appendChild(header);

	const columnsContainer = createEl('div', { cls: 'fk-board__columns' });

	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);

	if (columnField?.options) {
		for (const option of columnField.options) {
			const cards = board.cards.filter(c => c.values[columnField.name] === option);
			columnsContainer.appendChild(renderColumn(option, capitalise(option), cards, board));
		}
	}

	wrapper.appendChild(columnsContainer);
	return wrapper;
}
