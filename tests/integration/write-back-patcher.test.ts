import { describe, it, expect } from 'vitest';
import { locateBlock, patchBlock } from '../../src/integration/write-back';

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

const NEW_BLOCK = `\`\`\`fancy-kanban
---
title: Updated Board
---

| _id | Status |
|-----|--------|
| x1  | done   |
\`\`\``;

const SHORT_BLOCK = '```fancy-kanban\n---\ntitle: X\n---\n```';
const LONG_BLOCK = '```fancy-kanban\n---\ntitle: X\nfields:\n  - name: a, type: Text, label: A\n  - name: b, type: Text, label: B\n  - name: c, type: Text, label: C\n---\n\n| _id | A | B | C |\n|-----|---|---|---|\n| x1  | 1 | 2 | 3 |\n```';

describe('patchBlock', () => {
	describe('happy path', () => {
		it('replaces a block in the middle of a file', () => {
			const prefix = '# Notes\n\n';
			const suffix = '\n\nMore text.';
			const file = prefix + BLOCK + suffix;
			const result = patchBlock(file, prefix.length, prefix.length + BLOCK.length, NEW_BLOCK);
			expect(result).toBe(prefix + NEW_BLOCK + suffix);
		});

		it('replaces a block at the start of a file', () => {
			const suffix = '\n\nSome text after.';
			const file = BLOCK + suffix;
			const result = patchBlock(file, 0, BLOCK.length, NEW_BLOCK);
			expect(result).toBe(NEW_BLOCK + suffix);
		});

		it('replaces a block at the end of a file', () => {
			const prefix = '# Notes\n\n';
			const file = prefix + BLOCK;
			const result = patchBlock(file, prefix.length, file.length, NEW_BLOCK);
			expect(result).toBe(prefix + NEW_BLOCK);
		});

		it('replaces the only content in a file', () => {
			const result = patchBlock(BLOCK, 0, BLOCK.length, NEW_BLOCK);
			expect(result).toBe(NEW_BLOCK);
		});

		it('result is shorter when new block text is shorter', () => {
			const result = patchBlock(LONG_BLOCK, 0, LONG_BLOCK.length, SHORT_BLOCK);
			expect(result.length).toBeLessThan(LONG_BLOCK.length);
			expect(result).toBe(SHORT_BLOCK);
		});

		it('result is longer when new block text is longer', () => {
			const result = patchBlock(SHORT_BLOCK, 0, SHORT_BLOCK.length, LONG_BLOCK);
			expect(result.length).toBeGreaterThan(SHORT_BLOCK.length);
			expect(result).toBe(LONG_BLOCK);
		});
	});

	describe('correctness', () => {
		it('preserves characters immediately before start', () => {
			const prefix = 'BEFORE';
			const file = prefix + BLOCK;
			const result = patchBlock(file, prefix.length, file.length, NEW_BLOCK);
			expect(result.startsWith(prefix)).toBe(true);
		});

		it('preserves characters immediately after end', () => {
			const suffix = 'AFTER';
			const file = BLOCK + suffix;
			const result = patchBlock(file, 0, BLOCK.length, NEW_BLOCK);
			expect(result.endsWith(suffix)).toBe(true);
		});

		it('does not disturb newlines and whitespace around the block', () => {
			const prefix = 'Line one.\n\n';
			const suffix = '\n\nLine two.';
			const file = prefix + BLOCK + suffix;
			const result = patchBlock(file, prefix.length, prefix.length + BLOCK.length, NEW_BLOCK);
			expect(result).toBe(prefix + NEW_BLOCK + suffix);
		});

		it('preserves unicode characters in surrounding content', () => {
			const prefix = '# 日本語ノート\n\n';
			const suffix = '\n\nFin 🎉';
			const file = prefix + BLOCK + suffix;
			const result = patchBlock(file, prefix.length, prefix.length + BLOCK.length, NEW_BLOCK);
			expect(result.startsWith(prefix)).toBe(true);
			expect(result.endsWith(suffix)).toBe(true);
		});
	});

	describe('round-trip with locator', () => {
		it('locateBlock after patch finds new block at same index', () => {
			const file = BLOCK;
			const loc = locateBlock(file, 0)!;
			const patched = patchBlock(file, loc.start, loc.end, NEW_BLOCK);
			const newLoc = locateBlock(patched, 0)!;
			expect(patched.slice(newLoc.start, newLoc.end)).toBe(NEW_BLOCK);
		});

		it('round-trip for second block in a multi-block file', () => {
			const BLOCK_B = '```fancy-kanban\n---\ntitle: Second\n---\n```';
			const file = BLOCK + '\n\n' + BLOCK_B;
			const loc = locateBlock(file, 1)!;
			const patched = patchBlock(file, loc.start, loc.end, NEW_BLOCK);
			const newLoc = locateBlock(patched, 1)!;
			expect(patched.slice(newLoc.start, newLoc.end)).toBe(NEW_BLOCK);
		});

		it('first block in multi-block file is unchanged after patching second', () => {
			const BLOCK_B = '```fancy-kanban\n---\ntitle: Second\n---\n```';
			const file = BLOCK + '\n\n' + BLOCK_B;
			const loc1before = locateBlock(file, 0)!;
			const loc2 = locateBlock(file, 1)!;
			const patched = patchBlock(file, loc2.start, loc2.end, NEW_BLOCK);
			const loc1after = locateBlock(patched, 0)!;
			expect(patched.slice(loc1after.start, loc1after.end)).toBe(file.slice(loc1before.start, loc1before.end));
		});
	});
});
