import type { Board, Card } from '../model/board';

export function effectiveLanes(board: Board): string[] | null {
	if (!board.viewConfig.lanes) return null;
	const field = board.fields.find(f => f.name === board.viewConfig.lanes);
	if (!field?.options?.length) return null;
	return field.options;
}

export function groupCards(board: Board): Map<string, Map<string, Card[]>> {
	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);
	const columnOptions = columnField?.options ?? [];
	const laneOptions = effectiveLanes(board);
	const laneKey = board.viewConfig.lanes;

	const outerKeys = laneOptions ?? [''];
	const result = new Map<string, Map<string, Card[]>>();

	for (const lane of outerKeys) {
		const colMap = new Map<string, Card[]>();
		for (const col of columnOptions) colMap.set(col, []);
		result.set(lane, colMap);
	}

	for (const card of board.cards) {
		const colVal = card.values[board.viewConfig.columns] ?? '';
		const laneVal = laneKey ? (card.values[laneKey] ?? '') : '';

		const targetLane = outerKeys.includes(laneVal) ? laneVal : outerKeys[0];
		const targetCol = columnOptions.includes(colVal) ? colVal : columnOptions[0];

		if (targetLane === undefined || targetCol === undefined) continue;
		result.get(targetLane)?.get(targetCol)?.push(card);
	}

	return result;
}
