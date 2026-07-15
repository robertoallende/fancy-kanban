import type { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { TFile } from 'obsidian';
import { parseBlock } from '../data/parser';
import type { ParseIssue } from '../data/parser';
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

function renderErrorPanel(
	container: HTMLElement,
	errors: ParseIssue[],
	source: string,
	onGoToSource: () => void,
): void {
	const panel = activeDocument.createElement('div');
	panel.classList.add('fk-error-panel');

	for (const err of errors) {
		const msg = activeDocument.createElement('p');
		msg.classList.add('fk-error');
		msg.textContent = err.message;
		if (err.hint) {
			const hint = activeDocument.createElement('span');
			hint.classList.add('fk-error-panel__hint');
			hint.textContent = ` — ${err.hint}`;
			msg.appendChild(hint);
		}
		panel.appendChild(msg);
	}

	const pre = activeDocument.createElement('pre');
	pre.classList.add('fk-error-panel__source');
	pre.textContent = source;
	panel.appendChild(pre);

	const btn = activeDocument.createElement('button');
	btn.classList.add('fk-error-panel__goto');
	btn.textContent = 'Go to source';
	btn.addEventListener('click', onGoToSource);
	panel.appendChild(btn);

	container.appendChild(panel);
}

export function registerPostProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor('fancy-kanban', (source, el, ctx) => {
		const result = parseBlock(source);
		if (!result.ok) {
			renderErrorPanel(el, result.errors, source, () => {
				void plugin.app.workspace.openLinkText(ctx.sourcePath, '', false);
			});
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
			banner.textContent = result.readonlyReason ?? '';
			el.appendChild(banner);
		}

		const blockIndex = blockIndexFromContext(ctx, el);
		const save = result.readonly
			? () => Promise.resolve()
			: (b: typeof result.board) => writeBack(plugin.app.vault, file, blockIndex, b);

		mountBoard(el, result.board, save, plugin.app);
	});
}
