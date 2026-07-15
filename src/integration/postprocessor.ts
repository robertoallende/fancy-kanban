import type { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { TFile } from 'obsidian';
import { parseBlock } from '../data/parser';
import { mountBoard } from '../render/mount';
import writeBack from './write-back';

export function blockIndexFromContext(ctx: MarkdownPostProcessorContext, el: HTMLElement): number {
	const info = ctx.getSectionInfo(el);
	if (!info) return 0;
	const lines = info.text.split('\n');
	let count = 0;
	for (let i = 0; i < info.lineStart; i++) {
		if (lines[i].trimEnd() === '```fancy-kanban') count++;
	}
	return count;
}

export function registerPostProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor('fancy-kanban', (source, el, ctx) => {
		const result = parseBlock(source);
		if (!result.ok) {
			const error = activeDocument.createElement('p');
			error.classList.add('fk-error');
			error.textContent = result.error;
			el.appendChild(error);
			return;
		}

		const abstract = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
		const file = abstract instanceof TFile ? abstract : null;
		if (!file) {
			mountBoard(el, result.board, () => Promise.resolve(), plugin.app);
			return;
		}

		if (result.readonly) {
			const banner = activeDocument.createElement('p');
			banner.classList.add('fk-banner', 'fk-banner--warning');
			banner.textContent = result.readonlyReason;
			el.appendChild(banner);
		}

		const blockIndex = blockIndexFromContext(ctx, el);
		const save = result.readonly
			? () => Promise.resolve()
			: (b: typeof result.board) => writeBack(plugin.app.vault, file, blockIndex, b);

		mountBoard(el, result.board, save, plugin.app);
	});
}
