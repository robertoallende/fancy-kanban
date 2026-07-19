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
	const panel = container.createEl('div', { cls: 'fk-error-panel' });

	for (const err of errors) {
		const msg = panel.createEl('p', { cls: 'fk-error', text: err.message });
		if (err.hint) {
			msg.createEl('span', { cls: 'fk-error-panel__hint', text: ` — ${err.hint}` });
		}
	}

	panel.createEl('pre', { cls: 'fk-error-panel__source', text: source });

	const btn = panel.createEl('button', { cls: 'fk-error-panel__goto', text: 'Go to source' });
	btn.addEventListener('click', onGoToSource);
}

function renderWarningBanner(container: HTMLElement, warnings: ParseIssue[]): void {
	const banner = container.createEl('div', { cls: 'fk-warning-banner' });

	const body = banner.createEl('div', { cls: 'fk-warning-banner__body' });
	for (const w of warnings) {
		body.createEl('p', { cls: 'fk-warning-banner__item', text: w.message });
	}

	const dismiss = banner.createEl('button', { cls: 'fk-warning-banner__dismiss', text: '×' });
	dismiss.setAttribute('aria-label', 'Dismiss warnings');
	dismiss.addEventListener('click', () => banner.remove());
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
			if (result.warnings.length > 0) renderWarningBanner(el, result.warnings);
			const boardWrapper = el.createEl('div');
			mountBoard(boardWrapper, result.board, () => Promise.resolve(), plugin.app, ctx.sourcePath);
			return;
		}

		if (result.readonly) {
			el.createEl('p', { cls: ['fk-banner', 'fk-banner--warning'], text: result.readonlyReason ?? '' });
		}

		if (result.warnings.length > 0) renderWarningBanner(el, result.warnings);

		const boardWrapper = el.createEl('div');
		const blockIndex = blockIndexFromContext(ctx, el);
		const save = result.readonly
			? () => Promise.resolve()
			: (b: typeof result.board) => writeBack(plugin.app.vault, file, blockIndex, b);

		mountBoard(boardWrapper, result.board, save, plugin.app, ctx.sourcePath);
	});
}
