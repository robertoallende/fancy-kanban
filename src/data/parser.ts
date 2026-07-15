import type { Board, Card, FieldDefinition } from '../model/board';
import { SUPPORTED_VERSION } from '../model/board';
import { parseConfig, reconcileCards } from './schema';

export type ParseResult =
	| { ok: true; board: Board; readonly: false }
	| { ok: true; board: Board; readonly: true; readonlyReason: string }
	| { ok: false; error: string };

// Splits a markdown table row on unescaped pipes only.
// Strips the leading and trailing pipe delimiters of the row.
export function splitRow(line: string): string[] {
	const cells: string[] = [];
	let current = '';
	let i = 0;

	// Skip the leading '|'
	if (line[0] === '|') i = 1;

	while (i < line.length) {
		if (line[i] === '\\' && (line[i + 1] === '|' || line[i + 1] === '\\')) {
			current += line[i] + line[i + 1];
			i += 2;
		} else if (line[i] === '|') {
			cells.push(current);
			current = '';
			i++;
		} else {
			current += line[i];
			i++;
		}
	}

	// The trailing '|' causes an empty string at the end — drop it
	if (current !== '') cells.push(current);

	return cells;
}

// Unescapes a single cell value: <br> → newline, \| → |, \\ → \. Trims whitespace.
export function unescapeCell(cell: string): string {
	return cell
		.trim()
		.replace(/<br\/?>/gi, '\n')
		.replace(/\\[|]/g, '|')
		.replace(/\\\\/g, '\\');
}

export function parseTable(tableText: string, fields: FieldDefinition[]): Card[] {
	const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
	if (lines.length < 2) return [];

	const headerCells = splitRow(lines[0]).map(c => unescapeCell(c).toLowerCase());
	// lines[1] is the separator row — skip it
	const dataLines = lines.slice(2);

	// Build label → field name map (case-insensitive)
	const labelToField = new Map<string, string>();
	for (const field of fields) {
		labelToField.set(field.label.toLowerCase(), field.name);
	}

	return dataLines.map(line => {
		const cells = splitRow(line).map(unescapeCell);
		const id = headerCells[0] === '_id' ? (cells[0] ?? '') : '';
		const startIdx = headerCells[0] === '_id' ? 1 : 0;

		const values: Record<string, string> = {};
		for (let i = startIdx; i < headerCells.length; i++) {
			const label = headerCells[i];
			const fieldName = labelToField.get(label) ?? label;
			values[fieldName] = cells[i] ?? '';
		}

		return { id, values };
	});
}

export function parseBlock(blockText: string): ParseResult {
	try {
		const parts = blockText.split(/^---$/m);
		if (parts.length < 3) {
			return { ok: false, error: 'Block must contain two --- delimiters separating config from table' };
		}

		const configText = parts[1].trim();
		const tableText = parts.slice(2).join('---');

		const schema = parseConfig(configText);
		if (!schema.title) {
			return { ok: false, error: 'Board config is missing required field: title' };
		}

		const rawCards = parseTable(tableText, schema.fields);
		const cards = reconcileCards(schema.fields, rawCards);
		const board: Board = { ...schema, cards };

		if (schema.version > SUPPORTED_VERSION) {
			return {
				ok: true,
				board,
				readonly: true,
				readonlyReason: `This board was created with version ${schema.version} of the Fancy Kanban format. Update the plugin to edit it.`,
			};
		}

		return { ok: true, board, readonly: false };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}
