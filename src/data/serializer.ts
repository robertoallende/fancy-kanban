import type { Board, Card } from '../model/board';

export function escapeCell(value: string): string {
	return value
		.replace(/\|/g, '\\|')
		.replace(/\n/g, '<br>');
}

export function generateId(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let id = '';
	for (let i = 0; i < 8; i++) {
		id += chars[Math.floor(Math.random() * chars.length)];
	}
	return id;
}

export function serializeBoard(board: Board): string {
	const config = serializeConfig(board);
	const table = serializeTable(board);
	return `---\n${config}\n---\n\n${table}`;
}

export function serializeBoardBlock(board: Board): string {
	return `\`\`\`fancy-kanban\n${serializeBoard(board)}\n\`\`\``;
}

function serializeConfig(board: Board): string {
	const lines: string[] = [];
	lines.push(`title: ${board.title}`);
	lines.push('fields:');
	for (const field of board.fields) {
		let line = `  - name: ${field.name}, type: ${field.type}, label: ${field.label}`;
		if (field.options !== undefined) line += `, options: ${field.options.join('|')}`;
		if (field.default !== undefined) line += `, default: ${field.default}`;
		lines.push(line);
	}
	if (board.viewConfig.lanes) lines.push(`lanes: ${board.viewConfig.lanes}`);
	if (board.rawWorkflow) lines.push(`workflow: ${board.rawWorkflow}`);
	return lines.join('\n');
}

function serializeTable(board: Board): string {
	const schemaFieldNames = new Set(board.fields.map(f => f.name));

	// Collect orphaned keys from all cards (keys not in the current schema)
	const orphanedKeys = new Set<string>();
	for (const card of board.cards) {
		for (const key of Object.keys(card.values)) {
			if (!schemaFieldNames.has(key)) orphanedKeys.add(key);
		}
	}

	const schemaLabels = board.fields.map(f => f.label);
	const allLabels = ['_id', ...schemaLabels, ...orphanedKeys];

	const header    = `| ${allLabels.join(' | ')} |`;
	const separator = `| ${allLabels.map(() => '---').join(' | ')} |`;

	const rows = board.cards.map(card => serializeRow(card, board, orphanedKeys));

	return [header, separator, ...rows].join('\n');
}

function serializeRow(card: Card, board: Board, orphanedKeys: Set<string>): string {
	const id = card.id || generateId();
	const schemaCells = board.fields.map(f => escapeCell(card.values[f.name] ?? ''));
	const orphanCells = [...orphanedKeys].map(key => escapeCell(card.values[key] ?? ''));
	const cells = [id, ...schemaCells, ...orphanCells];
	return `| ${cells.join(' | ')} |`;
}
