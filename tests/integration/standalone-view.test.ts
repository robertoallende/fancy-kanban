// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

import { FancyKanbanView, VIEW_TYPE_FANCY_KANBAN, BOARD_TEMPLATE } from '../../src/integration/standalone-view';

const VALID_FILE_CONTENT = `\`\`\`fancy-kanban
---
title: My Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|done, label: Status, default: todo
---

| _id | Title  | Status |
|-----|--------|--------|
| a1  | Task 1 | todo   |
\`\`\``;

const INVALID_FILE_CONTENT = 'just a regular note';

function makeLeaf(fileContent: string | null = VALID_FILE_CONTENT) {
	const mockFile = fileContent !== null ? { path: 'board.md', name: 'board.md' } : null;

	const vault = {
		read: vi.fn().mockResolvedValue(fileContent ?? ''),
		process: vi.fn((_f: unknown, fn: (c: string) => string) => Promise.resolve(fn(fileContent ?? ''))),
	};

	const workspace = {
		getActiveFile: vi.fn().mockReturnValue(mockFile),
	};

	const view = new FancyKanbanView({} as never);
	// Inject app — contentEl comes from the mock ItemView base class
	Object.defineProperty(view, 'app', { value: { vault, workspace }, writable: true });

	return { view, vault, workspace, mockFile };
}

describe('FancyKanbanView', () => {
	describe('view metadata', () => {
		it('getViewType returns the correct view type constant', () => {
			const { view } = makeLeaf();
			expect(view.getViewType()).toBe(VIEW_TYPE_FANCY_KANBAN);
		});

		it('VIEW_TYPE_FANCY_KANBAN is a non-empty string', () => {
			expect(typeof VIEW_TYPE_FANCY_KANBAN).toBe('string');
			expect(VIEW_TYPE_FANCY_KANBAN.length).toBeGreaterThan(0);
		});

		it('getIcon returns a non-empty string', () => {
			const { view } = makeLeaf();
			expect(typeof view.getIcon()).toBe('string');
			expect(view.getIcon().length).toBeGreaterThan(0);
		});
	});

	describe('onOpen — valid file', () => {
		it('renders .fk-board into contentEl', async () => {
			const { view } = makeLeaf();
			await view.onOpen();
			expect(view.contentEl.querySelector('.fk-board')).not.toBeNull();
		});

		it('does not render .fk-error on success', async () => {
			const { view } = makeLeaf();
			await view.onOpen();
			expect(view.contentEl.querySelector('.fk-error')).toBeNull();
		});

		it('reads the active file from the vault', async () => {
			const { view, vault } = makeLeaf();
			await view.onOpen();
			expect(vault.read).toHaveBeenCalledTimes(1);
		});

		it('getDisplayText returns the board title after open', async () => {
			const { view } = makeLeaf();
			await view.onOpen();
			expect(view.getDisplayText()).toBe('My Board');
		});
	});

	describe('onOpen — no active file', () => {
		it('renders .fk-error when no file is active', async () => {
			const { view } = makeLeaf(null);
			await view.onOpen();
			expect(view.contentEl.querySelector('.fk-error')).not.toBeNull();
		});
	});

	describe('onOpen — invalid content', () => {
		it('renders .fk-error when file has no fancy-kanban block', async () => {
			const { view } = makeLeaf(INVALID_FILE_CONTENT);
			await view.onOpen();
			expect(view.contentEl.querySelector('.fk-error')).not.toBeNull();
		});

		it('does not render .fk-board on parse failure', async () => {
			const { view } = makeLeaf(INVALID_FILE_CONTENT);
			await view.onOpen();
			expect(view.contentEl.querySelector('.fk-board')).toBeNull();
		});
	});

	describe('onClose', () => {
		it('clears contentEl on close', async () => {
			const { view } = makeLeaf();
			await view.onOpen();
			await view.onClose();
			expect(view.contentEl.children.length).toBe(0);
		});
	});
});

describe('BOARD_TEMPLATE', () => {
	it('is a non-empty string', () => {
		expect(typeof BOARD_TEMPLATE).toBe('string');
		expect(BOARD_TEMPLATE.length).toBeGreaterThan(0);
	});

	it('contains the fancy-kanban fence', () => {
		expect(BOARD_TEMPLATE).toContain('```fancy-kanban');
	});

	it('contains a title field', () => {
		expect(BOARD_TEMPLATE).toContain('title');
	});

	it('contains a status field with options', () => {
		expect(BOARD_TEMPLATE).toContain('status');
	});

	it('parses as a valid board', async () => {
		const { parseBlock } = await import('../../src/data/parser');
		const inner = BOARD_TEMPLATE.replace(/^```fancy-kanban\n/, '').replace(/\n```$/, '');
		const result = parseBlock(inner);
		expect(result.ok).toBe(true);
	});
});
