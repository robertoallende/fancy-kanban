// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { Plugin } from 'obsidian';
import { registerPostProcessor } from '../../src/integration/postprocessor';

function makePlugin(): { plugin: Plugin; getHandler: () => ((source: string, el: HTMLElement) => void) } {
	let capturedHandler: ((source: string, el: HTMLElement) => void) | null = null;
	const plugin = {
		registerMarkdownCodeBlockProcessor: vi.fn((_, handler) => {
			capturedHandler = handler;
		}),
	} as unknown as Plugin;
	return {
		plugin,
		getHandler: () => {
			if (!capturedHandler) throw new Error('handler not registered');
			return capturedHandler;
		},
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
			getHandler()(VALID_SOURCE, el);
			expect(el.querySelector('.fk-board')).not.toBeNull();
		});

		it('el has exactly one child after handler runs', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el);
			expect(el.children.length).toBe(1);
		});

		it('does not append a .fk-error element on success', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(VALID_SOURCE, el);
			expect(el.querySelector('.fk-error')).toBeNull();
		});
	});

	describe('handler — invalid source', () => {
		it('appends a .fk-error element to el on parse failure', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el);
			expect(el.querySelector('.fk-error')).not.toBeNull();
		});

		it('el has exactly one child after handler runs on error', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el);
			expect(el.children.length).toBe(1);
		});

		it('does not append a .fk-board element on parse failure', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el);
			expect(el.querySelector('.fk-board')).toBeNull();
		});

		it('error element contains text from ParseResult.error', () => {
			const { plugin, getHandler } = makePlugin();
			registerPostProcessor(plugin);
			const el = document.createElement('div');
			getHandler()(INVALID_SOURCE, el);
			expect(el.querySelector('.fk-error')!.textContent!.length).toBeGreaterThan(0);
		});
	});
});
