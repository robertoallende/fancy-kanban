import type { BoardSchema, Card, FieldDefinition, FieldType } from '../model/board';

export function parseConfig(configText: string): BoardSchema {
	const lines = configText.split('\n');
	let title = '';
	let rawWorkflow = '';
	let lanes: string | undefined;
	const fields: FieldDefinition[] = [];
	let inFields = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (inFields && trimmed.startsWith('- ')) {
			fields.push(parseFieldLine(trimmed.slice(2)));
			continue;
		}

		inFields = false;

		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) continue;

		const key = trimmed.slice(0, colonIdx).trim();
		const value = trimmed.slice(colonIdx + 1).trim();

		if (key === 'title') title = value;
		else if (key === 'workflow') rawWorkflow = value.replace(/^"(.*)"$/, '$1');
		else if (key === 'lanes') lanes = value;
		else if (key === 'fields') inFields = true;
	}

	return {
		title,
		fields,
		rawWorkflow,
		viewConfig: { columns: 'status', lanes },
	};
}

function parseFieldLine(line: string): FieldDefinition {
	const kvs: Record<string, string> = {};
	const parts = splitFieldParts(line);

	for (const part of parts) {
		const colonIdx = part.indexOf(':');
		if (colonIdx === -1) continue;
		const key = part.slice(0, colonIdx).trim();
		const value = part.slice(colonIdx + 1).trim();
		if (key) kvs[key] = value;
	}

	if (!kvs['name']) throw new Error(`Field definition missing 'name': ${line}`);
	if (!kvs['type']) throw new Error(`Field definition missing 'type': ${line}`);

	const field: FieldDefinition = {
		name: kvs['name'],
		type: kvs['type'] as FieldType,
		label: kvs['label'] ?? kvs['name'],
	};

	if (kvs['options'] !== undefined) field.options = kvs['options'].split('|');
	if (kvs['default'] !== undefined) field.default = kvs['default'];

	return field;
}

function splitFieldParts(line: string): string[] {
	// Split on commas but not within values — field values don't contain commas per spec,
	// so a simple split is safe here.
	return line.split(',');
}

export function reconcileCards(fields: FieldDefinition[], cards: Card[]): Card[] {
	return cards.map(card => {
		const values = { ...card.values };
		for (const field of fields) {
			if (!(field.name in values)) {
				values[field.name] = field.default ?? '';
			}
		}
		return { ...card, values };
	});
}
