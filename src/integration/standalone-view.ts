import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type { ViewStateResult } from 'obsidian';
import { parseBlock } from '../data/parser';
import { locateBlock } from './write-back';
import writeBack from './write-back';
import { mountBoard } from '../render/mount';

export const VIEW_TYPE_FANCY_KANBAN = 'fancy-kanban-view';

export const BOARD_TEMPLATE = `\`\`\`fancy-kanban
---
title: New Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
---

| _id | Title | Status |
|-----|-------|--------|
\`\`\``;

export class FancyKanbanView extends ItemView {
	private boardTitle = 'Fancy Kanban';
	private filePath = '';

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_FANCY_KANBAN;
	}

	getDisplayText(): string {
		return this.boardTitle;
	}

	getIcon(): string {
		return 'layout-kanban';
	}

	getState(): Record<string, unknown> {
		return { filePath: this.filePath };
	}

	async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
		if (typeof state.filePath === 'string') this.filePath = state.filePath;
		await super.setState(state, result);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		const path = this.filePath || this.app.workspace.getActiveFile()?.path || '';
		const abstract = path ? this.app.vault.getAbstractFileByPath(path) : null;
		const file = abstract instanceof TFile ? abstract : null;

		if (!file) {
			contentEl.createEl('p', { cls: 'fk-error', text: 'No file is open.' });
			return;
		}

		this.filePath = file.path;

		const content = await this.app.vault.read(file);
		const location = locateBlock(content, 0);
		if (!location) {
			contentEl.createEl('p', { cls: 'fk-error', text: 'No fancy-kanban block found in this file.' });
			return;
		}

		const blockText = content.slice(location.start, location.end);
		const inner = blockText.replace(/^```fancy-kanban\n/, '').replace(/\n```$/, '');
		const result = parseBlock(inner);

		if (!result.ok) {
			contentEl.createEl('p', { cls: 'fk-error', text: result.errors.map(e => e.message).join('; ') });
			return;
		}

		this.boardTitle = result.board.title;
		const save = (board: typeof result.board) => writeBack(this.app.vault, file, 0, board);
		mountBoard(contentEl, result.board, save, this.app);
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
