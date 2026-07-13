import type { Board } from '../model/board';
import { renderColumn } from './column';

function capitalise(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function renderBoard(board: Board): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.classList.add('fk-board');

	const columnsContainer = document.createElement('div');
	columnsContainer.classList.add('fk-board__columns');

	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);

	if (columnField?.options) {
		for (const option of columnField.options) {
			const cards = board.cards.filter(c => c.values[columnField.name] === option);
			columnsContainer.appendChild(renderColumn(option, capitalise(option), cards, board.fields));
		}
	}

	wrapper.appendChild(columnsContainer);
	return wrapper;
}
