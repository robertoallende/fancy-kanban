import type { Board, Card, FieldDefinition } from '../model/board';
import { SUPPORTED_VERSION } from '../model/board';
import { parseConfig, reconcileCards } from './schema';
export { W_FIELD_TYPE_DEPRECATED } from './deprecations';

export interface ParseIssue {
	code: string;
	message: string;
	line?: number;
	hint?: string;
}

export const E_NO_DELIMITERS = 'E_NO_DELIMITERS';
export const E_NO_TITLE = 'E_NO_TITLE';
export const E_NO_STATUS_FIELD = 'E_NO_STATUS_FIELD';
export const W_ROW_MALFORMED = 'W_ROW_MALFORMED';

export type ParseResult =
	| { ok: true; board: Board; readonly: boolean; readonlyReason?: string; warnings: ParseIssue[] }
	| { ok: false; errors: ParseIssue[]; warnings: ParseIssue[] };

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

export function parseTable(tableText: string, fields: FieldDefinition[]): { cards: Card[]; warnings: ParseIssue[] } {
	const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
	if (lines.length < 2) return { cards: [], warnings: [] };

	const headerCells = splitRow(lines[0]).map(c => unescapeCell(c).toLowerCase());
	// lines[1] is the separator row — skip it
	const dataLines = lines.slice(2);

	// Build label → field name map (case-insensitive)
	const labelToField = new Map<string, string>();
	for (const field of fields) {
		labelToField.set(field.label.toLowerCase(), field.name);
	}

	const cards: Card[] = [];
	const warnings: ParseIssue[] = [];

	for (let rowIdx = 0; rowIdx < dataLines.length; rowIdx++) {
		const line = dataLines[rowIdx];
		const cells = splitRow(line).map(unescapeCell);

		if (cells.length === 0) {
			warnings.push({
				code: W_ROW_MALFORMED,
				message: `Row ${rowIdx + 1} could not be parsed and was skipped`,
				line: rowIdx + 1,
			});
			continue;
		}

		const id = headerCells[0] === '_id' ? (cells[0] ?? '') : '';
		const startIdx = headerCells[0] === '_id' ? 1 : 0;

		const values: Record<string, string> = {};
		for (let i = startIdx; i < headerCells.length; i++) {
			const label = headerCells[i];
			const fieldName = labelToField.get(label) ?? label;
			values[fieldName] = cells[i] ?? '';
		}

		cards.push({ id, values });
	}

	return { cards, warnings };
}

export function parseBlock(blockText: string): ParseResult {
	try {
		const parts = blockText.split(/^---$/m);
		if (parts.length < 3) {
			return {
				ok: false,
				errors: [{ code: E_NO_DELIMITERS, message: 'Block must contain two --- delimiters separating config from table' }],
				warnings: [],
			};
		}

		const configText = parts[1].trim();
		const tableText = parts.slice(2).join('---');

		const { warnings: configWarnings, ...schema } = parseConfig(configText);
		if (!schema.title) {
			return {
				ok: false,
				errors: [{ code: E_NO_TITLE, message: 'Board config is missing required field: title' }],
				warnings: [],
			};
		}

		const columnsField = schema.fields.find(f => f.name === schema.viewConfig.columns);
		if (!columnsField) {
			return {
				ok: false,
				errors: [{
					code: E_NO_STATUS_FIELD,
					message: `Columns field "${schema.viewConfig.columns}" is not defined in fields`,
					hint: 'Add a field with that name, or update the columns setting to match an existing field',
				}],
				warnings: [],
			};
		}

		const { cards: rawCards, warnings: tableWarnings } = parseTable(tableText, schema.fields);
		const warnings: ParseIssue[] = [...configWarnings, ...tableWarnings];
		const cards = reconcileCards(schema.fields, rawCards);
		const board: Board = { ...schema, cards };

		if (schema.version > SUPPORTED_VERSION) {
			return {
				ok: true,
				board,
				readonly: true,
				readonlyReason: `This board was created with version ${schema.version} of the Fancy Kanban format. Update the plugin to edit it.`,
				warnings,
			};
		}

		return { ok: true, board, readonly: false, warnings };
	} catch (err) {
		return {
			ok: false,
			errors: [{ code: 'E_UNEXPECTED', message: err instanceof Error ? err.message : String(err) }],
			warnings: [],
		};
	}
}
