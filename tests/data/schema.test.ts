import { describe, it, expect } from 'vitest';
import { parseConfig, reconcileCards } from '../../src/data/schema';
import type { Card } from '../../src/model/board';

const FULL_CONFIG = `
title: My Board
fields:
  - name: status,      type: Select,   options: inbox|doing|done, label: Status, default: inbox
  - name: title,       type: Text,     label: Title
  - name: responsible, type: Text,     label: Responsible
  - name: start_date,  type: Date,     label: Start Date
  - name: notes,       type: Textarea, label: Notes
  - name: effort,      type: Number,   label: Effort
  - name: docs,        type: File,     label: Docs
  - name: team,        type: Select,   options: frontend|backend, label: Team
lanes: team
workflow: inbox→doing, inbox→done, doing→done, doing→inbox, done→doing, done→inbox
`.trim();

describe('parseConfig', () => {
	it('parses title', () => {
		const result = parseConfig(FULL_CONFIG);
		expect(result.title).toBe('My Board');
	});

	it('parses all six field types', () => {
		const result = parseConfig(FULL_CONFIG);
		const types = result.fields.map(f => f.type);
		expect(types).toContain('Select');
		expect(types).toContain('Text');
		expect(types).toContain('Date');
		expect(types).toContain('Textarea');
		expect(types).toContain('Number');
		expect(types).toContain('File');
	});

	it('parses field name, type, and label', () => {
		const result = parseConfig(FULL_CONFIG);
		const status = result.fields.find(f => f.name === 'status')!;
		expect(status.name).toBe('status');
		expect(status.type).toBe('Select');
		expect(status.label).toBe('Status');
	});

	it('parses options for Select fields', () => {
		const result = parseConfig(FULL_CONFIG);
		const status = result.fields.find(f => f.name === 'status')!;
		expect(status.options).toEqual(['inbox', 'doing', 'done']);
	});

	it('parses default value', () => {
		const result = parseConfig(FULL_CONFIG);
		const status = result.fields.find(f => f.name === 'status')!;
		expect(status.default).toBe('inbox');
	});

	it('fields without default have no default property', () => {
		const result = parseConfig(FULL_CONFIG);
		const title = result.fields.find(f => f.name === 'title')!;
		expect(title.default).toBeUndefined();
	});

	it('parses workflow string', () => {
		const result = parseConfig(FULL_CONFIG);
		expect(result.rawWorkflow).toBe(
			'inbox→doing, inbox→done, doing→done, doing→inbox, done→doing, done→inbox'
		);
	});

	it('parses lanes field name', () => {
		const result = parseConfig(FULL_CONFIG);
		expect(result.viewConfig.lanes).toBe('team');
	});

	it('viewConfig.columns is always "status"', () => {
		const result = parseConfig(FULL_CONFIG);
		expect(result.viewConfig.columns).toBe('status');
	});

	it('parses config with no workflow key', () => {
		const config = `
title: Simple Board
fields:
  - name: status, type: Select, options: todo|done, label: Status
  - name: title, type: Text, label: Title
`.trim();
		const result = parseConfig(config);
		expect(result.rawWorkflow).toBe('');
	});

	it('parses config with no lanes key', () => {
		const config = `
title: Simple Board
fields:
  - name: status, type: Select, options: todo|done, label: Status
  - name: title, type: Text, label: Title
`.trim();
		const result = parseConfig(config);
		expect(result.viewConfig.lanes).toBeUndefined();
	});

	it('parses options with a single value', () => {
		const config = `
title: Board
fields:
  - name: status, type: Select, options: only, label: Status
`.trim();
		const result = parseConfig(config);
		expect(result.fields[0].options).toEqual(['only']);
	});

	it('parses non-ASCII characters in field labels', () => {
		const config = `
title: Board
fields:
  - name: estado, type: Select, options: pendiente|hecho, label: Estado
  - name: título, type: Text, label: Título
`.trim();
		const result = parseConfig(config);
		expect(result.fields[0].label).toBe('Estado');
		expect(result.fields[1].label).toBe('Título');
	});

	it('parses all eight fields in order', () => {
		const result = parseConfig(FULL_CONFIG);
		expect(result.fields).toHaveLength(8);
		expect(result.fields[0].name).toBe('status');
		expect(result.fields[7].name).toBe('team');
	});

	it('throws on field missing name', () => {
		const config = `
title: Board
fields:
  - type: Text, label: Title
`.trim();
		expect(() => parseConfig(config)).toThrow(/name/);
	});

	it('throws on field missing type', () => {
		const config = `
title: Board
fields:
  - name: title, label: Title
`.trim();
		expect(() => parseConfig(config)).toThrow(/type/);
	});
});

describe('reconcileCards', () => {
	const fields = [
		{ name: 'status', type: 'Select' as const, label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
		{ name: 'title',  type: 'Text'   as const, label: 'Title' },
		{ name: 'notes',  type: 'Text'   as const, label: 'Notes', default: 'n/a' },
	];

	it('backfills a newly added field using its default value', () => {
		const cards: Card[] = [
			{ id: 'abc', values: { status: 'inbox', title: 'Task A' } },
		];
		const result = reconcileCards(fields, cards);
		expect(result[0].values['notes']).toBe('n/a');
	});

	it('backfills a newly added field with empty string when no default', () => {
		const sparseFields = [
			{ name: 'status', type: 'Select' as const, label: 'Status', options: ['inbox'], default: 'inbox' },
			{ name: 'title',  type: 'Text'   as const, label: 'Title' },
			{ name: 'extra',  type: 'Text'   as const, label: 'Extra' },
		];
		const cards: Card[] = [
			{ id: 'abc', values: { status: 'inbox', title: 'Task A' } },
		];
		const result = reconcileCards(sparseFields, cards);
		expect(result[0].values['extra']).toBe('');
	});

	it('preserves orphaned field values when field is removed from schema', () => {
		const cards: Card[] = [
			{ id: 'abc', values: { status: 'inbox', title: 'Task A', deleted_field: 'keep me' } },
		];
		const result = reconcileCards(fields, cards);
		expect(result[0].values['deleted_field']).toBe('keep me');
	});

	it('does not mutate the original cards', () => {
		const cards: Card[] = [
			{ id: 'abc', values: { status: 'inbox', title: 'Task A' } },
		];
		reconcileCards(fields, cards);
		expect(cards[0].values['notes']).toBeUndefined();
	});

	it('returns all cards unchanged when schema and data match exactly', () => {
		const cards: Card[] = [
			{ id: 'abc', values: { status: 'inbox', title: 'Task A', notes: 'hello' } },
		];
		const result = reconcileCards(fields, cards);
		expect(result[0].values).toEqual({ status: 'inbox', title: 'Task A', notes: 'hello' });
	});
});
