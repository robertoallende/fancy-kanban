// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { Plugin, TFile } from 'obsidian';
import { registerPostProcessor, blockIndexFromContext } from '../../src/integration/postprocessor';

const MOCK_FILE = {} as TFile;

function makePlugin(filePath = 'note.md', file: TFile | null = MOCK_FILE): {
	plugin: Plugin;
	openLinkText: ReturnType<typeof vi.fn>;
	getHandler: () => ((source: string, el: HTMLElement, ctx: unknown) => void);
} {
	let capturedHandler: ((source: string, el: HTMLElement, ctx: unknown) => void) | null = null;
	const openLinkText = vi.fn();
	const plugin = {
		registerMarkdownCodeBlockProcessor: vi.fn((_, handler) => {
			capturedHandler = handler;
		}),
		app: {
			vault: {
				getAbstractFileByPath: vi.fn(() => file),
				process: vi.fn((_file: TFile, fn: (c: string) => string) => Promise.resolve(fn(''))),
			},
			workspace: {
				openLinkText,
			},
		},
	} as unknown as Plugin;
	return {
		plugin,
		openLinkText,
		getHandler: () => {
			if (!capturedHandler) throw new Error('handler not registered');
			return capturedHandler;
		},
	};
}

function makeCtx(lineStart = 0, text = ''): unknown {
	return {
		sourcePath: 'note.md',
		getSectionInfo: vi.fn(() => ({ lineStart, lineEnd: lineStart + 10, text })),
	};
}

const VALID_SOURCE = `---
title: Test Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: inbox|done, label: Status, default: inbox
---

| _id | Title | Status |
|-----|-------|--------|
| x1  | Task  | inbox  |`;

const WARN_SOURCE = `---
title: Warn Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status, default: inbox
---

| _id | Status |
|-----|--------|
| x1  | inbox  |
|`;

const INVALID_SOURCE = 'not a valid block at all |||';

describe('registerPostProcessor', () => {
	describe('registration', () => {
		it('calls registerMarkdownCodeBlockProcessor with fancy-kanban', () => {
			const { plugin } = makePlugin();
			registerPostProcessor(plugin);
			expect(plugin.registerMarkdownCodeBlockProcessor).toHaveBeenCalledWith(
				'fancy-kanban',
				expect.any(Function),
			);
		});

		it('calls registerMarkdownCodeBlockProcessor exactly once', () => {
			const { plugin } = makePlugin();
			registerPostProcessor(plugin);
			expect(plugin.registerMarkdownCodeBlockProcessor).toHaveBeenCalledTimes(1);
		});
	});

	describe('handler — valid source', () => {
		it('appends a .fk-board element to el', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});

		it('el has exactly one child after handler runs', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el, makeCtx());
			expect(el.children.length).toBe(1);
		});

		it('does not append a .fk-error element on success', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-error')).toBeNull();
		});

		it('renders board even when file is not found', () => {
			const { plugin, getHandler } = makePlugin('note.md', null);
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});
	});

	describe('handler — source with warnings', () => {
		it('still renders .fk-board when there are recoverable warnings', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(WARN_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});

		it('renders a .fk-warning-banner above the board', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(WARN_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-warning-banner')).not.toBeNull();
		});

		it('warning banner contains the warning message text', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(WARN_SOURCE, el, makeCtx());
			const banner = el.querySelector('.fk-warning-banner')!;
			expect(banner.textContent!.length).toBeGreaterThan(0);
		});

		it('clicking dismiss removes the warning banner', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(WARN_SOURCE, el, makeCtx());
			const dismiss = el.querySelector<HTMLButtonElement>('.fk-warning-banner__dismiss')!;
			expect(dismiss).not.toBeNull();
			dismiss.click();
			expect(el.querySelector('.fk-warning-banner')).toBeNull();
		});

		it('does not render .fk-error-panel for recoverable warnings', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(WARN_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-error-panel')).toBeNull();
		});
	});

	describe('handler — invalid source', () => {
		it('appends a .fk-error-panel element to el on parse failure', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-error-panel')).not.toBeNull();
		});

		it('el has exactly one child after handler runs on error', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			expect(el.children.length).toBe(1);
		});

		it('does not append a .fk-board element on parse failure', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-board')).toBeNull();
		});

		it('error panel contains a .fk-error message element with non-empty text', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			expect(el.querySelector('.fk-error')!.textContent!.length).toBeGreaterThan(0);
		});

		it('error panel contains a pre element with the raw source text', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			const pre = el.querySelector('.fk-error-panel__source');
			expect(pre).not.toBeNull();
			expect(pre!.textContent).toBe(INVALID_SOURCE);
		});

		it('error panel contains a "Go to source" button', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			const btn = el.querySelector('.fk-error-panel__goto');
			expect(btn).not.toBeNull();
			expect(btn!.textContent).toBe('Go to source');
		});

		it('clicking "Go to source" calls openLinkText with the source path', () => {
			const { plugin, openLinkText, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el, makeCtx());
			const btn = el.querySelector<HTMLButtonElement>('.fk-error-panel__goto')!;
			btn.click();
			expect(openLinkText).toHaveBeenCalledWith('note.md', '', false);
		});
	});
});

describe('blockIndexFromContext', () => {
	const el = document.createElement('div');

	it('returns 0 when the block is the first fancy-kanban block in the file', () => {
		const ctx = {
			sourcePath: 'note.md',
			getSectionInfo: vi.fn(() => ({
				lineStart: 2,
				lineEnd: 8,
				text: '# Note\n\n```fancy-kanban\n---\ntitle: X\n---\n```\n',
			})),
		};
		expect(blockIndexFromContext(ctx as never, el)).toBe(0);
	});

	it('returns 1 when one fancy-kanban block appears before the target', () => {
		const text = [
			'# Note',
			'',
			'```fancy-kanban',
			'---',
			'title: First',
			'---',
			'```',
			'',
			'```fancy-kanban',
			'---',
			'title: Second',
			'---',
			'```',
		].join('\n');
		const ctx = {
			sourcePath: 'note.md',
			getSectionInfo: vi.fn(() => ({ lineStart: 8, lineEnd: 12, text })),
		};
		expect(blockIndexFromContext(ctx as never, el)).toBe(1);
	});

	it('returns 0 when getSectionInfo returns null', () => {
		const ctx = {
			sourcePath: 'note.md',
			getSectionInfo: vi.fn(() => null),
		};
		expect(blockIndexFromContext(ctx as never, el)).toBe(0);
	});

	it('does not count non-fancy-kanban code fences', () => {
		const text = [
			'```javascript',
			'console.log("hi");',
			'```',
			'',
			'```fancy-kanban',
			'---',
			'title: Board',
			'---',
			'```',
		].join('\n');
		const ctx = {
			sourcePath: 'note.md',
			getSectionInfo: vi.fn(() => ({ lineStart: 4, lineEnd: 8, text })),
		};
		expect(blockIndexFromContext(ctx as never, el)).toBe(0);
	});
});
