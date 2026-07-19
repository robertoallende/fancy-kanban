import { describe, it, expect } from 'vitest';
import { serializeBoard, escapeCell, generateId } from '../../src/data/serializer';
import { parseBlock } from '../../src/data/parser';
import type { Board } from '../../src/model/board';

const MINIMAL_BOARD: Board = {
	title: 'My Board',
	fields: [
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'doing', 'done'], default: 'inbox' },
		{ name: 'title',  type: 'Text',   label: 'Title' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: 'inbox→doing, inbox→done, doing→done',
	cards: [
		{ id: 'x7k2a1b3', values: { status: 'inbox', title: 'Fix bug' } },
		{ id: 'm3p9b2c4', values: { status: 'doing', title: 'Refactor' } },
	],
};

const FULL_BLOCK = `---
title: My Board
fields:
  - name: status,      type: Select,   options: inbox|doing|done, label: Status, default: inbox
  - name: title,       type: Text,     label: Title
  - name: responsible, type: Text,     label: Responsible
  - name: notes,       type: Textarea, label: Notes
  - name: team,        type: Select,   options: frontend|backend, label: Team
lanes: team
workflow: inbox→doing, inbox→done, doing→done, doing→inbox, done→doing, done→inbox
---

| _id    | Status | Title         | Responsible | Notes                      | Team     |
|--------|--------|---------------|-------------|----------------------------|----------|
| x7k2a1 | inbox  | Fix login bug | Alice       | Needs investigation        | backend  |
| m3p9b2 | doing  | Refactor auth | Bob         | Multi-line<br>content here | backend  |
| q1r4c3 | done   | Setup CI      |             |                            | frontend |`;

describe('escapeCell', () => {
	it('escapes | to \\|', () => {
		expect(escapeCell('a|b')).toBe('a\\|b');
	});

	it('escapes newline to <br>', () => {
		expect(escapeCell('line1\nline2')).toBe('line1<br>line2');
	});

	it('escapes multiple pipes', () => {
		expect(escapeCell('a|b|c')).toBe('a\\|b\\|c');
	});

	it('escapes multiple newlines', () => {
		expect(escapeCell('a\nb\nc')).toBe('a<br>b<br>c');
	});

	it('returns value unchanged when nothing to escape', () => {
		expect(escapeCell('hello world')).toBe('hello world');
	});

	it('returns empty string unchanged', () => {
		expect(escapeCell('')).toBe('');
	});

	it('escapes backslash to \\\\', () => {
		expect(escapeCell('a\\b')).toBe('a\\\\b');
	});

	it('escapes backslash before pipe so the pipe escape is unambiguous', () => {
		expect(escapeCell('a\\|b')).toBe('a\\\\\\|b');
	});
});

describe('generateId', () => {
	it('generates an 8-character string', () => {
		expect(generateId()).toHaveLength(8);
	});

	it('generates only alphanumeric characters', () => {
		expect(generateId()).toMatch(/^[a-z0-9]{8}$/);
	});

	it('generates unique IDs across calls', () => {
		const ids = new Set(Array.from({ length: 100 }, generateId));
		expect(ids.size).toBe(100);
	});
});

describe('serializeBoard', () => {
	describe('config section', () => {
		it('includes title', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).toContain('title: My Board');
		});

		it('includes all field definitions', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).toContain('name: status');
			expect(text).toContain('name: title');
		});

		it('includes workflow when present', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).toContain('workflow: inbox→doing');
		});

		it('omits workflow when empty', () => {
			const board = { ...MINIMAL_BOARD, rawWorkflow: '' };
			const text = serializeBoard(board);
			expect(text).not.toContain('workflow:');
		});

		it('includes lanes when present in viewConfig', () => {
			const board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', lanes: 'team' } };
			const text = serializeBoard(board);
			expect(text).toContain('lanes: team');
		});

		it('omits lanes when absent from viewConfig', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).not.toContain('lanes:');
		});

		it('includes card_fields when set', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'priority'] } };
			const text = serializeBoard(board);
			expect(text).toContain('card_fields: title, priority');
		});

		it('omits card_fields when undefined', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).not.toContain('card_fields');
		});

		it('omits card_fields when empty array', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardFields: [] } };
			const text = serializeBoard(board);
			expect(text).not.toContain('card_fields');
		});

		it('round-trips card_fields through serialize then parse', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'priority'] } };
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.viewConfig.cardFields).toEqual(['title', 'priority']);
		});

		it('includes card_title when set to a field name', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardTitle: 'title' } };
			const text = serializeBoard(board);
			expect(text).toContain('card_title: title');
		});

		it('includes card_title when set to empty string (no title)', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardTitle: '' } };
			const text = serializeBoard(board);
			expect(text).toContain('card_title: ');
		});

		it('omits card_title when undefined', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).not.toContain('card_title');
		});

		it('round-trips card_title through serialize then parse', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardTitle: 'title' } };
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.viewConfig.cardTitle).toBe('title');
		});

		it('includes card_labels: false when set', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardLabels: false } };
			const text = serializeBoard(board);
			expect(text).toContain('card_labels: false');
		});

		it('omits card_labels when undefined', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).not.toContain('card_labels');
		});

		it('round-trips card_labels: false through serialize then parse', () => {
			const board: Board = { ...MINIMAL_BOARD, viewConfig: { columns: 'status', cardLabels: false } };
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.viewConfig.cardLabels).toBe(false);
		});
	});

	describe('table header', () => {
		it('uses _id as the first column', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			const headerLine = text.split('\n').find(l => l.startsWith('| _id'));
			expect(headerLine).toBeTruthy();
		});

		it('uses field labels (not names) in the header', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				fields: [
					{ name: 'status_field', type: 'Select', label: 'Status', options: ['inbox'], default: 'inbox' },
					{ name: 'title_field',  type: 'Text',   label: 'Title' },
				],
				cards: [],
			};
			const text = serializeBoard(board);
			const headerLine = text.split('\n').find(l => l.includes('_id'))!;
			expect(headerLine).toContain('Status');
			expect(headerLine).toContain('Title');
			expect(headerLine).not.toContain('status_field');
			expect(headerLine).not.toContain('title_field');
		});
	});

	describe('data rows', () => {
		it('outputs one row per card', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			const dataRows = text.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('_id'));
			expect(dataRows).toHaveLength(2);
		});

		it('uses the card id in the _id column', () => {
			const text = serializeBoard(MINIMAL_BOARD);
			expect(text).toContain('x7k2a1b3');
		});

		it('assigns a new id to cards with empty id', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: '', values: { status: 'inbox', title: 'Task' } }],
			};
			const text = serializeBoard(board);
			const result = parseBlock(text);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].id).toMatch(/^[a-z0-9]{8}$/);
		});

		it('assigned IDs are unique across all cards', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [
					{ id: '', values: { status: 'inbox', title: 'A' } },
					{ id: '', values: { status: 'doing', title: 'B' } },
					{ id: '', values: { status: 'done',  title: 'C' } },
				],
			};
			const text = serializeBoard(board);
			const result = parseBlock(text);
			if (!result.ok) throw new Error(result.error);
			const ids = result.board.cards.map(c => c.id);
			expect(new Set(ids).size).toBe(3);
		});

		it('escapes pipe characters in cell values', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'A|B' } }],
			};
			const text = serializeBoard(board);
			expect(text).toContain('A\\|B');
		});

		it('escapes newlines in cell values', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'line1\nline2' } }],
			};
			const text = serializeBoard(board);
			expect(text).toContain('line1<br>line2');
		});
	});

	describe('round-trip', () => {
		it('round-trips a minimal board losslessly', () => {
			const result1 = parseBlock(FULL_BLOCK);
			if (!result1.ok) throw new Error(result1.error);
			const serialized = serializeBoard(result1.board);
			const result2 = parseBlock(serialized);
			if (!result2.ok) throw new Error(result2.error);
			expect(result2.board.title).toBe(result1.board.title);
			expect(result2.board.fields).toEqual(result1.board.fields);
			expect(result2.board.viewConfig).toEqual(result1.board.viewConfig);
			expect(result2.board.rawWorkflow).toBe(result1.board.rawWorkflow);
			expect(result2.board.cards).toEqual(result1.board.cards);
		});

		it('round-trips multi-line cell content', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'line1\nline2\nline3' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['title']).toBe('line1\nline2\nline3');
		});

		it('round-trips pipe characters in cell values', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'a|b|c' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['title']).toBe('a|b|c');
		});

		it('round-trips unicode characters', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'こんにちは 🎉' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['title']).toBe('こんにちは 🎉');
		});

		it('round-trips empty cell values', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: '' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['title']).toBe('');
		});

		it('round-trips orphaned field values', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'Task', old_field: 'keep me' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['old_field']).toBe('keep me');
		});

		it('round-trips backslash characters', () => {
			const board: Board = {
				...MINIMAL_BOARD,
				cards: [{ id: 'abc12345', values: { status: 'inbox', title: 'C:\\path\\file' } }],
			};
			const result = parseBlock(serializeBoard(board));
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['title']).toBe('C:\\path\\file');
		});
	});
});

describe('duplicate _id resolution', () => {
	it('assigns a new id to the second card when two share the same id', () => {
		const board: Board = {
			...MINIMAL_BOARD,
			cards: [
				{ id: 'dup00001', values: { status: 'inbox', title: 'First' } },
				{ id: 'dup00001', values: { status: 'doing', title: 'Second' } },
			],
		};
		const serialized = serializeBoard(board);
		const result = parseBlock(serialized);
		if (!result.ok) throw new Error(result.error);
		const ids = result.board.cards.map(c => c.id);
		expect(ids[0]).toBe('dup00001');
		expect(ids[1]).not.toBe('dup00001');
		expect(new Set(ids).size).toBe(2);
	});

	it('keeps all card data when resolving duplicates', () => {
		const board: Board = {
			...MINIMAL_BOARD,
			cards: [
				{ id: 'dup00001', values: { status: 'inbox', title: 'First' } },
				{ id: 'dup00001', values: { status: 'doing', title: 'Second' } },
			],
		};
		const result = parseBlock(serializeBoard(board));
		if (!result.ok) throw new Error(result.error);
		const titles = result.board.cards.map(c => c.values['title']);
		expect(titles).toContain('First');
		expect(titles).toContain('Second');
	});
});
