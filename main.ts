import { Notice, Plugin, TFile } from 'obsidian';
import { registerPostProcessor } from './src/integration/postprocessor';
import { FancyKanbanView, VIEW_TYPE_FANCY_KANBAN, BOARD_TEMPLATE } from './src/integration/standalone-view';

export default class FancyKanbanPlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_FANCY_KANBAN, (leaf) => new FancyKanbanView(leaf));

		registerPostProcessor(this);

		this.addRibbonIcon('layout-kanban', 'New Fancy Kanban board', () => {
			this.newBoard();
		});

		this.addCommand({
			id: 'new-board',
			name: 'New Fancy Kanban board',
			callback: () => this.newBoard(),
		});

		this.addCommand({
			id: 'insert-board',
			name: 'Insert Fancy Kanban board',
			editorCallback: (editor) => {
				editor.replaceRange(BOARD_TEMPLATE, editor.getCursor());
			},
		});
	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_FANCY_KANBAN);
	}

	private async newBoard(): Promise<void> {
		const baseName = 'New Board';
		let fileName = `${baseName}.md`;
		let counter = 2;
		while (this.app.vault.getAbstractFileByPath(fileName)) {
			fileName = `${baseName} ${counter}.md`;
			counter++;
		}

		const file = await this.app.vault.create(fileName, BOARD_TEMPLATE);
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(file as TFile);
	}
}
