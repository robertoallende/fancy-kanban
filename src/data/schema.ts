import type { BoardSchema, Card, FieldDefinition, FieldType } from '../model/board';
import { DEPRECATED_FIELD_TYPES, REMOVED_FIELD_TYPES, W_FIELD_TYPE_DEPRECATED } from './deprecations';

type ConfigWarning = { code: string; message: string; hint?: string };

export function parseConfig(configText: string): BoardSchema & { warnings: ConfigWarning[] } {
	const lines = configText.split('\n');
	let title = '';
	let rawWorkflow = '';
	let lanes: string | undefined;
	let cardTitle: string | undefined;
	let cardFields: string[] | undefined;
	let cardLabels: boolean | undefined;
	let version = 1;
	const fields: FieldDefinition[] = [];
	const warnings: ConfigWarning[] = [];
	let inFields = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (inFields && trimmed.startsWith('- ')) {
			const { field, warning } = parseFieldLine(trimmed.slice(2));
			fields.push(field);
			if (warning) warnings.push(warning);
			continue;
		}

		inFields = false;

		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) continue;

		const key = trimmed.slice(0, colonIdx).trim();
		const value = trimmed.slice(colonIdx + 1).trim();

		if (key === 'title') title = value;
		else if (key === 'version') version = parseInt(value, 10) || 1;
		else if (key === 'workflow') rawWorkflow = value.replace(/^"(.*)"$/, '$1');
		else if (key === 'lanes') lanes = value;
		else if (key === 'card_title') cardTitle = value;
		else if (key === 'card_fields') {
			const parts = value.split(',').map(s => s.trim()).filter(Boolean);
			if (parts.length) cardFields = parts;
		}
		else if (key === 'card_labels') {
			if (value === 'false') cardLabels = false;
		}
		else if (key === 'fields') inFields = true;
	}

	return {
		title,
		fields,
		rawWorkflow,
		version,
		viewConfig: { columns: 'status', lanes, cardTitle, cardFields, cardLabels },
		warnings,
	};
}

function parseFieldLine(line: string): { field: FieldDefinition; warning?: ConfigWarning } {
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

	const rawType = kvs['type'];
	const removed = REMOVED_FIELD_TYPES[rawType];
	if (removed) throw new Error(removed);
	const deprecation = DEPRECATED_FIELD_TYPES[rawType];
	const type: FieldType = deprecation ? (deprecation.replacement as FieldType) : (rawType as FieldType);
	const warning: ConfigWarning | undefined = deprecation ? {
		code: W_FIELD_TYPE_DEPRECATED,
		message: `Field type '${rawType}' is deprecated, use '${deprecation.replacement}' instead (will be removed in ${deprecation.removeAt})`,
		hint: `Replace 'type: ${rawType}' with 'type: ${deprecation.replacement}' in your board config`,
	} : undefined;

	const field: FieldDefinition = {
		name: kvs['name'],
		type,
		label: kvs['label'] ?? kvs['name'],
	};

	if (kvs['options'] !== undefined) field.options = kvs['options'].split('|');
	if (kvs['default'] !== undefined) field.default = kvs['default'];

	return { field, warning };
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

// When a Select field's options are renamed (same count, different values), migrate
// card values at each position from the old option name to the new one.
export function migrateSelectRenames(
	oldFields: FieldDefinition[],
	newFields: FieldDefinition[],
	cards: Card[],
): Card[] {
	const renameMaps: Record<string, Record<string, string>> = {};

	for (const newField of newFields) {
		if (newField.type !== 'Select') continue;
		const oldField = oldFields.find(f => f.name === newField.name);
		if (!oldField?.options || !newField.options) continue;
		if (oldField.options.length !== newField.options.length) continue;

		const map: Record<string, string> = {};
		for (let i = 0; i < oldField.options.length; i++) {
			if (oldField.options[i] !== newField.options[i]) {
				map[oldField.options[i]] = newField.options[i];
			}
		}
		if (Object.keys(map).length > 0) renameMaps[newField.name] = map;
	}

	if (Object.keys(renameMaps).length === 0) return cards;

	return cards.map(card => {
		const values = { ...card.values };
		for (const [fieldName, map] of Object.entries(renameMaps)) {
			const current = values[fieldName];
			if (current !== undefined && map[current] !== undefined) {
				values[fieldName] = map[current];
			}
		}
		return { ...card, values };
	});
}
