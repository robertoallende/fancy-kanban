import { Notice, Plugin } from 'obsidian';

export default class FancyKanbanPlugin extends Plugin {
	async onload() {
		new Notice('Fancy Kanban loaded');

		this.addCommand({
			id: 'hello',
			name: 'Hello',
			callback: () => {
				new Notice('Fancy Kanban: Hello!');
			},
		});

		// Register markdown code block processor for 'fancy-kanban' blocks
		// this.registerMarkdownCodeBlockProcessor('fancy-kanban', (source, el, ctx) => { ... });

		// Register standalone board view (ItemView) for whole-file boards
		// this.registerView(VIEW_TYPE_FANCY_KANBAN, (leaf) => new StandaloneView(leaf));

		// Register CM6 editor extension for Live Preview widget
		// this.registerEditorExtension([...]);
	}

	async onunload() {
		// Views and editor extensions are cleaned up automatically by the Plugin base class.
	}
}
