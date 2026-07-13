import { describe, it, expect, vi } from 'vitest';
import type { Vault, TFile } from 'obsidian';
import writeBack from '../../src/integration/write-back';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' }],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [{ id: 'abc12345', values: { status: 'inbox' } }],
};

const BLOCK_IN_FILE = `\`\`\`fancy-kanban
---
title: Test Board
fields:
  - name: status, type: Select, options: inbox|done, label: Status, default: inbox
viewConfig:
  columns: status
---

| _id      | Status |
|----------|--------|
| abc12345 | inbox  |
\`\`\``;

function makeVault(fileContent: string): { vault: Vault; capturedContent: () => string } {
	let stored = fileContent;
	const vault = {
		process: vi.fn((_file: TFile, fn: (content: string) => string) => {
			stored = fn(stored);
			return Promise.resolve(stored);
		}),
	} as unknown as Vault;
	return { vault, capturedContent: () => stored };
}

const mockFile = {} as TFile;

describe('writeBack', () => {
	it('calls vault.process exactly once', async () => {
		const { vault } = makeVault(BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 0, BOARD);
		expect(vault.process).toHaveBeenCalledTimes(1);
	});

	it('calls vault.process with the correct file', async () => {
		const { vault } = makeVault(BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 0, BOARD);
		expect(vault.process).toHaveBeenCalledWith(mockFile, expect.any(Function));
	});

	it('replaces block content when locateBlock finds it', async () => {
		const { vault, capturedContent } = makeVault(BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 0, BOARD);
		const result = capturedContent();
		expect(result).toContain('```fancy-kanban');
		expect(result).toContain('```');
		expect(result).toContain('Test Board');
	});

	it('wraps serialized board in fancy-kanban fences', async () => {
		const { vault, capturedContent } = makeVault(BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 0, BOARD);
		const result = capturedContent();
		expect(result.startsWith('```fancy-kanban\n')).toBe(true);
		expect(result.endsWith('\n```')).toBe(true);
	});

	it('preserves content before the block', async () => {
		const prefix = '# My Note\n\nSome text.\n\n';
		const { vault, capturedContent } = makeVault(prefix + BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 0, BOARD);
		expect(capturedContent().startsWith(prefix)).toBe(true);
	});

	it('preserves content after the block', async () => {
		const suffix = '\n\nSome text after.';
		const { vault, capturedContent } = makeVault(BLOCK_IN_FILE + suffix);
		await writeBack(vault, mockFile, 0, BOARD);
		expect(capturedContent().endsWith(suffix)).toBe(true);
	});

	it('returns content unchanged when block is not found', async () => {
		const noBlock = '# Just a note\n\nNo boards here.';
		const { vault, capturedContent } = makeVault(noBlock);
		await writeBack(vault, mockFile, 0, BOARD);
		expect(capturedContent()).toBe(noBlock);
	});

	it('returns content unchanged when blockIndex exceeds block count', async () => {
		const { vault, capturedContent } = makeVault(BLOCK_IN_FILE);
		await writeBack(vault, mockFile, 1, BOARD);
		expect(capturedContent()).toBe(BLOCK_IN_FILE);
	});

	it('propagates rejection from vault.process to the caller', async () => {
		const vault = {
			process: vi.fn().mockRejectedValue(new Error('disk error')),
		} as unknown as Vault;
		await expect(writeBack(vault, mockFile, 0, BOARD)).rejects.toThrow('disk error');
	});
});
