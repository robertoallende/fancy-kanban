import type { App, Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { MarkdownRenderChild, TFile } from 'obsidian';
import { parseBlock } from '../data/parser';
import type { ParseIssue } from '../data/parser';
import type { Board } from '../model/board';
import { mountBoard } from '../render/mount';
import type { SaveFn } from '../render/mount';
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
	const panel = container.createDiv({ cls: 'fk-error-panel' });

	for (const err of errors) {
		const msg = panel.createEl('p', { cls: 'fk-error', text: err.message });
		if (err.hint) {
			msg.createSpan({ cls: 'fk-error-panel__hint', text: ` — ${err.hint}` });
		}
	}

	panel.createEl('pre', { cls: 'fk-error-panel__source', text: source });

	const btn = panel.createEl('button', { cls: 'fk-error-panel__goto', text: 'Go to source' });
	btn.addEventListener('click', onGoToSource);
}

function renderWarningBanner(container: HTMLElement, warnings: ParseIssue[]): void {
	const banner = container.createDiv({ cls: 'fk-warning-banner' });

	const body = banner.createDiv({ cls: 'fk-warning-banner__body' });
	for (const w of warnings) {
		body.createEl('p', { cls: 'fk-warning-banner__item', text: w.message });
	}

	const dismiss = banner.createEl('button', { cls: 'fk-warning-banner__dismiss', text: '×' });
	dismiss.setAttribute('aria-label', 'Dismiss warnings');
	dismiss.addEventListener('click', () => banner.remove());
}

class FancyKanbanView extends MarkdownRenderChild {
	constructor(
		el: HTMLElement,
		private readonly board: Board,
		private readonly save: SaveFn,
		private readonly warnings: ParseIssue[],
		private readonly isReadonly: boolean,
		private readonly readonlyReason: string | undefined,
		private readonly app: App,
		private readonly sourcePath: string,
	) {
		super(el);
	}

	onload(): void {
		if (this.isReadonly) {
			this.containerEl.createEl('p', { cls: ['fk-banner', 'fk-banner--warning'], text: this.readonlyReason ?? '' });
		}
		if (this.warnings.length > 0) renderWarningBanner(this.containerEl, this.warnings);
		const boardWrapper = this.containerEl.createDiv();
		mountBoard(boardWrapper, this.board, this.save, this.app, this.sourcePath);
	}
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

		const blockIndex = blockIndexFromContext(ctx, el);
		const save: SaveFn = (result.readonly || !file)
			? () => Promise.resolve()
			: (b) => writeBack(plugin.app.vault, file, blockIndex, b);

		ctx.addChild(new FancyKanbanView(
			el,
			result.board,
			save,
			result.warnings,
			result.readonly,
			result.readonlyReason,
			plugin.app,
			ctx.sourcePath,
		));
	});
}
