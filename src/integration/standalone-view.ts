import { ItemView, WorkspaceLeaf } from 'obsidian';
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

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		const file = this.app.workspace.getActiveFile();
		if (!file) {
			const err = contentEl.createEl('p', { cls: 'fk-error' });
			err.textContent = 'No file is open.';
			return;
		}

		const content = await this.app.vault.read(file);
		const location = locateBlock(content, 0);
		if (!location) {
			const err = contentEl.createEl('p', { cls: 'fk-error' });
			err.textContent = 'No fancy-kanban block found in this file.';
			return;
		}

		const blockText = content.slice(location.start, location.end);
		const inner = blockText.replace(/^```fancy-kanban\n/, '').replace(/\n```$/, '');
		const result = parseBlock(inner);

		if (!result.ok) {
			const err = contentEl.createEl('p', { cls: 'fk-error' });
			err.textContent = result.error;
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
