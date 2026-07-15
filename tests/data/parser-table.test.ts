import { describe, it, expect } from 'vitest';
import { parseTable, W_ROW_MALFORMED } from '../../src/data/parser';
import type { FieldDefinition } from '../../src/model/board';

const FIELDS: FieldDefinition[] = [
	{ name: 'status',      type: 'Select',   label: 'Status',      options: ['inbox', 'doing', 'done'], default: 'inbox' },
	{ name: 'title',       type: 'Text',     label: 'Title' },
	{ name: 'responsible', type: 'Text',     label: 'Responsible' },
	{ name: 'notes',       type: 'Textarea', label: 'Notes' },
];

const HEADER    = '| _id    | Status | Title         | Responsible | Notes |';
const SEPARATOR = '|--------|--------|---------------|-------------|-------|';

describe('parseTable', () => {
	describe('header mapping', () => {
		it('maps column labels to field names case-insensitively', () => {
			const table = [
				'| _id | STATUS | TITLE |',
				'|-----|--------|-------|',
				'| x1  | inbox  | Task  |',
			].join('\n');
			const fields: FieldDefinition[] = [
				{ name: 'status', type: 'Select', label: 'Status', options: ['inbox'] },
				{ name: 'title',  type: 'Text',   label: 'Title' },
			];
			const { cards } = parseTable(table, fields);
			expect(cards[0].values['status']).toBe('inbox');
			expect(cards[0].values['title']).toBe('Task');
		});

		it('extracts _id into card.id', () => {
			const table = [HEADER, SEPARATOR, '| abc123 | inbox | Fix bug | Alice | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].id).toBe('abc123');
		});

		it('handles column order different from field definition order', () => {
			const table = [
				'| _id | Title | Status |',
				'|-----|-------|--------|',
				'| x1  | Task  | doing  |',
			].join('\n');
			const fields: FieldDefinition[] = [
				{ name: 'status', type: 'Select', label: 'Status', options: ['doing'] },
				{ name: 'title',  type: 'Text',   label: 'Title' },
			];
			const { cards } = parseTable(table, fields);
			expect(cards[0].values['status']).toBe('doing');
			expect(cards[0].values['title']).toBe('Task');
		});
	});

	describe('data rows', () => {
		it('produces one card per data row', () => {
			const table = [
				HEADER, SEPARATOR,
				'| id1 | inbox | Task A | Alice | |',
				'| id2 | doing | Task B | Bob   | |',
				'| id3 | done  | Task C |       | |',
			].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards).toHaveLength(3);
		});

		it('maps each cell to the correct field value', () => {
			const table = [HEADER, SEPARATOR, '| x7k2 | doing | Refactor | Bob | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].values['status']).toBe('doing');
			expect(cards[0].values['title']).toBe('Refactor');
			expect(cards[0].values['responsible']).toBe('Bob');
		});

		it('stores empty string for an empty cell', () => {
			const table = [HEADER, SEPARATOR, '| x1 | inbox | Task | | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].values['responsible']).toBe('');
		});

		it('unescapes escaped pipe in cell value', () => {
			const table = [HEADER, SEPARATOR, '| x1 | inbox | A\\|B | Alice | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].values['title']).toBe('A|B');
		});

		it('unescapes <br> to newline in cell value', () => {
			const table = [HEADER, SEPARATOR, '| x1 | inbox | Task | Alice | line1<br>line2 |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].values['notes']).toBe('line1\nline2');
		});

		it('handles a row with all empty cells except _id', () => {
			const table = [HEADER, SEPARATOR, '| x1 | | | | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].id).toBe('x1');
			expect(cards[0].values['status']).toBe('');
			expect(cards[0].values['title']).toBe('');
		});

		it('assigns empty string id for a row with an empty _id cell', () => {
			const table = [HEADER, SEPARATOR, '|  | inbox | Task | | |'].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards[0].id).toBe('');
		});
	});

	describe('edge cases', () => {
		it('returns empty array for a table with no data rows', () => {
			const table = [HEADER, SEPARATOR].join('\n');
			const { cards } = parseTable(table, FIELDS);
			expect(cards).toHaveLength(0);
		});

		it('returns empty array for empty table text', () => {
			expect(parseTable('', FIELDS).cards).toHaveLength(0);
		});

		it('stores orphaned column value under the column label when not in field definitions', () => {
			const table = [
				'| _id | Status | Title | Unknown |',
				'|-----|--------|-------|---------|',
				'| x1  | inbox  | Task  | secret  |',
			].join('\n');
			const fields: FieldDefinition[] = [
				{ name: 'status', type: 'Select', label: 'Status', options: ['inbox'] },
				{ name: 'title',  type: 'Text',   label: 'Title' },
			];
			const { cards } = parseTable(table, fields);
			expect(cards[0].values['unknown']).toBe('secret');
		});

		it('trims whitespace from header labels before matching', () => {
			const table = [
				'| _id |  Status  |  Title  |',
				'|-----|----------|---------|',
				'| x1  | inbox    | Task    |',
			].join('\n');
			const fields: FieldDefinition[] = [
				{ name: 'status', type: 'Select', label: 'Status', options: ['inbox'] },
				{ name: 'title',  type: 'Text',   label: 'Title' },
			];
			const { cards } = parseTable(table, fields);
			expect(cards[0].values['status']).toBe('inbox');
		});

		it('emits W_ROW_MALFORMED and skips a row that splits to zero cells', () => {
			const table = [
				HEADER, SEPARATOR,
				'| x1 | inbox | Task | | |',
				'|',
			].join('\n');
			const { cards, warnings } = parseTable(table, FIELDS);
			expect(cards).toHaveLength(1);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].code).toBe(W_ROW_MALFORMED);
		});
	});
});
