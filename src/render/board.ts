import type { Board } from '../model/board';
import { renderColumn } from './column';
import { effectiveLanes, groupCards } from './lanes';

function capitalise(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function renderBoard(parent: HTMLElement, board: Board): HTMLElement {
	const wrapper = parent.createDiv({ cls: 'fk-board' });

	const header = wrapper.createDiv({ cls: 'fk-board__header' });
	const settingsBtn = header.createEl('button', { cls: 'fk-board__settings', text: '⚙' });
	settingsBtn.title = 'Board settings';
	header.createSpan({ cls: 'fk-board__title', text: board.title });

	const laneOptions = effectiveLanes(board);
	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);

	if (!laneOptions) {
		const columnsContainer = wrapper.createDiv({ cls: 'fk-board__columns' });
		if (columnField?.options) {
			for (const option of columnField.options) {
				const cards = board.cards.filter(c => c.values[columnField.name] === option);
				renderColumn(columnsContainer, option, capitalise(option), cards, board);
			}
		}
		return wrapper;
	}

	// Swimlane grid
	const grouped = groupCards(board);
	const columnOptions = columnField?.options ?? [];

	const grid = wrapper.createDiv({ cls: 'fk-board__grid' });

	// Column header row
	const colHeaders = grid.createDiv({ cls: 'fk-board__col-headers' });
	colHeaders.createDiv({ cls: 'fk-swimlane__corner' });
	for (const col of columnOptions) {
		const totalCount = laneOptions.reduce(
			(n, lane) => n + (grouped.get(lane)?.get(col)?.length ?? 0), 0,
		);
		const colHeader = colHeaders.createDiv({ cls: 'fk-col-header' });
		colHeader.createSpan({ cls: 'fk-column__title', text: capitalise(col) });
		colHeader.createSpan({ cls: 'fk-column__count', text: String(totalCount) });
	}

	// Lane rows
	for (const lane of laneOptions) {
		const row = grid.createDiv({ cls: 'fk-swimlane' });
		row.dataset.laneValue = lane;
		row.createDiv({ cls: 'fk-swimlane__label', text: capitalise(lane) });

		for (const col of columnOptions) {
			const cards = grouped.get(lane)?.get(col) ?? [];
			renderColumn(row, col, capitalise(col), cards, board, lane);
		}
	}

	return wrapper;
}
