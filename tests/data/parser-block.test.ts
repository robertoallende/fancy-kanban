import { describe, it, expect } from 'vitest';
import { parseBlock } from '../../src/data/parser';
import { serializeBoard } from '../../src/data/serializer';

const MINIMAL_BLOCK = `
---
title: My Board
fields:
  - name: status, type: Select, options: inbox|doing|done, label: Status, default: inbox
  - name: title,  type: Text,   label: Title
workflow: inbox→doing, inbox→done, doing→done
---

| _id | Status | Title |
|-----|--------|-------|
`.trim();

const FULL_BLOCK = `
---
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
---

| _id    | Status | Title         | Responsible | Start Date | Notes                      | Effort | Docs               | Team     |
|--------|--------|---------------|-------------|------------|----------------------------|--------|--------------------|----------|
| x7k2a1 | inbox  | Fix login bug | Alice       | 2026-01-15 | Needs investigation        | 3      |                    | backend  |
| m3p9b2 | doing  | Refactor auth | Bob         |            | Multi-line<br>content here | 5      | design.md          | backend  |
| q1r4c3 | done   | Setup CI      |             | 2026-01-01 |                            | 1      | setup.md\\|guide.md | frontend |
`.trim();

describe('parseBlock', () => {
	describe('happy path', () => {
		it('returns ok:true for a valid block', () => {
			const result = parseBlock(MINIMAL_BLOCK);
			expect(result.ok).toBe(true);
		});

		it('parses board title', () => {
			const result = parseBlock(MINIMAL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.title).toBe('My Board');
		});

		it('parses fields', () => {
			const result = parseBlock(MINIMAL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.fields).toHaveLength(2);
			expect(result.board.fields[0].name).toBe('status');
		});

		it('returns empty cards array for a board with no data rows', () => {
			const result = parseBlock(MINIMAL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards).toHaveLength(0);
		});

		it('parses all six field types from the full block', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			const types = result.board.fields.map(f => f.type);
			expect(types).toContain('Select');
			expect(types).toContain('Text');
			expect(types).toContain('Date');
			expect(types).toContain('Textarea');
			expect(types).toContain('Number');
			expect(types).toContain('File');
		});

		it('parses all three data rows from the full block', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards).toHaveLength(3);
		});

		it('parses workflow string', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.rawWorkflow).toContain('inbox→doing');
		});

		it('parses lanes into viewConfig', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.viewConfig.lanes).toBe('team');
		});

		it('viewConfig.columns is always "status"', () => {
			const result = parseBlock(MINIMAL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.viewConfig.columns).toBe('status');
		});
	});

	describe('block structure', () => {
		it('ignores content before the first --- delimiter', () => {
			const block = `ignored preamble
---
title: My Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status
---

| _id | Status |
|-----|--------|
`;
			const result = parseBlock(block);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.board.title).toBe('My Board');
		});

		it('handles blank lines between --- and the table', () => {
			const block = `---
title: Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status
---


| _id | Status |
|-----|--------|
| x1  | inbox  |
`;
			const result = parseBlock(block);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.board.cards).toHaveLength(1);
		});
	});

	describe('integration', () => {
		it('applies schema reconciliation — card missing a field gets the default', () => {
			const block = `---
title: Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status, default: inbox
  - name: title,  type: Text,   label: Title
  - name: effort, type: Number, label: Effort, default: 0
---

| _id | Status | Title |
|-----|--------|-------|
| x1  | inbox  | Task  |
`;
			const result = parseBlock(block);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['effort']).toBe('0');
		});

		it('preserves orphaned field values through the full pipeline', () => {
			const block = `---
title: Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status
---

| _id | Status | OldField |
|-----|--------|----------|
| x1  | inbox  | keep me  |
`;
			const result = parseBlock(block);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].values['oldfield']).toBe('keep me');
		});

		it('preserves _id values through the full pipeline', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[0].id).toBe('x7k2a1');
			expect(result.board.cards[1].id).toBe('m3p9b2');
			expect(result.board.cards[2].id).toBe('q1r4c3');
		});

		it('unescapes <br> in cell values', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[1].values['notes']).toBe('Multi-line\ncontent here');
		});

		it('unescapes \\| in cell values', () => {
			const result = parseBlock(FULL_BLOCK);
			if (!result.ok) throw new Error(result.error);
			expect(result.board.cards[2].values['docs']).toBe('setup.md|guide.md');
		});
	});

	describe('error cases', () => {
		it('returns ok:false when block has no --- delimiters', () => {
			const result = parseBlock('title: Board\n\n| _id |\n|-----|');
			expect(result.ok).toBe(false);
		});

		it('returns ok:false when block has only one --- delimiter', () => {
			const result = parseBlock('---\ntitle: Board\n\n| _id |\n|-----|');
			expect(result.ok).toBe(false);
		});

		it('returns ok:false when title is missing from config', () => {
			const result = parseBlock(`---
fields:
  - name: status, type: Select, options: inbox|done, label: Status
---

| _id | Status |
|-----|--------|
`);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toMatch(/title/i);
		});

		it('returns ok:false for a malformed field line', () => {
			const result = parseBlock(`---
title: Board
fields:
  - type: Text, label: Title
---

| _id | Title |
|-----|-------|
`);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toMatch(/name/i);
		});

		it('error result contains a descriptive message string', () => {
			const result = parseBlock('not a valid block');
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(typeof result.error).toBe('string');
			expect(result.error.length).toBeGreaterThan(0);
		});
	});
});

describe('version key', () => {
	it('treats a missing version as version 1 and is writable', () => {
		const result = parseBlock(MINIMAL_BLOCK);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.board.version).toBe(1);
		expect(result.readonly).toBe(false);
	});

	it('parses an explicit version: 1 and is writable', () => {
		const block = MINIMAL_BLOCK.replace('title: My Board', 'version: 1\ntitle: My Board');
		const result = parseBlock(block);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.board.version).toBe(1);
		expect(result.readonly).toBe(false);
	});

	it('marks a version 2 board as readonly', () => {
		const block = MINIMAL_BLOCK.replace('title: My Board', 'version: 2\ntitle: My Board');
		const result = parseBlock(block);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.readonly).toBe(true);
		if (!result.readonly) return;
		expect(result.readonlyReason).toMatch(/version 2/);
	});

	it('serializer emits version: 1', () => {
		const result = parseBlock(MINIMAL_BLOCK);
		if (!result.ok) return;
		const serialized = serializeBoard(result.board);
		expect(serialized).toMatch(/^version: 1/m);
	});
});
