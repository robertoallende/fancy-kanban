import { describe, it, expect } from 'vitest';
import { locateBlock } from '../../src/integration/write-back';

const BLOCK = `\`\`\`fancy-kanban
---
title: My Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status, default: inbox
  - name: title, type: Text, label: Title
---

| _id | Status | Title |
|-----|--------|-------|
| x1  | inbox  | Task  |
\`\`\``;

const BLOCK_B = `\`\`\`fancy-kanban
---
title: Second Board
fields:
  - name: status, type: Select, options: todo|done, label: Status, default: todo
---

| _id | Status |
|-----|--------|
\`\`\``;

describe('locateBlock', () => {
	describe('happy path', () => {
		it('returns start and end offsets for the only block in a file', () => {
			const file = BLOCK;
			const result = locateBlock(file, 0);
			expect(result).not.toBeNull();
		});

		it('slicing with returned offsets reproduces the exact block text', () => {
			const file = BLOCK;
			const result = locateBlock(file, 0)!;
			expect(file.slice(result.start, result.end)).toBe(BLOCK);
		});

		it('start offset is 0 when the block is at the beginning of the file', () => {
			const result = locateBlock(BLOCK, 0)!;
			expect(result.start).toBe(0);
		});

		it('accounts for content before the block in the start offset', () => {
			const prefix = '# My Note\n\nSome prose here.\n\n';
			const file = prefix + BLOCK;
			const result = locateBlock(file, 0)!;
			expect(result.start).toBe(prefix.length);
			expect(file.slice(result.start, result.end)).toBe(BLOCK);
		});

		it('end offset does not include content after the block', () => {
			const suffix = '\n\nSome text after the board.';
			const file = BLOCK + suffix;
			const result = locateBlock(file, 0)!;
			expect(file.slice(result.end)).toBe(suffix);
		});

		it('locates block at index 0 in a file with multiple boards', () => {
			const file = BLOCK + '\n\n' + BLOCK_B;
			const result = locateBlock(file, 0)!;
			expect(file.slice(result.start, result.end)).toBe(BLOCK);
		});

		it('locates block at index 1 in a file with multiple boards', () => {
			const file = BLOCK + '\n\n' + BLOCK_B;
			const result = locateBlock(file, 1)!;
			expect(file.slice(result.start, result.end)).toBe(BLOCK_B);
		});

		it('block is entire file — start is 0 and end is file length', () => {
			const result = locateBlock(BLOCK, 0)!;
			expect(result.start).toBe(0);
			expect(result.end).toBe(BLOCK.length);
		});
	});

	describe('edge cases', () => {
		it('returns null when file has no fancy-kanban blocks', () => {
			const file = '# Just a note\n\nNo boards here.';
			expect(locateBlock(file, 0)).toBeNull();
		});

		it('returns null when blockIndex exceeds number of blocks', () => {
			expect(locateBlock(BLOCK, 1)).toBeNull();
		});

		it('returns null for an unclosed block', () => {
			const file = '```fancy-kanban\n---\ntitle: Board\n---\n\n| _id |\n|-----|';
			expect(locateBlock(file, 0)).toBeNull();
		});

		it('returns null for an empty file', () => {
			expect(locateBlock('', 0)).toBeNull();
		});

		it('does not match a regular code block', () => {
			const file = '```javascript\nconsole.log("hello");\n```';
			expect(locateBlock(file, 0)).toBeNull();
		});

		it('does not match a block with a different identifier', () => {
			const file = '```kanban\n---\ntitle: Board\n---\n```';
			expect(locateBlock(file, 0)).toBeNull();
		});
	});
});
