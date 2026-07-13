import { addIcon, Notice, Plugin, TFile } from 'obsidian';
import { registerPostProcessor } from './src/integration/postprocessor';
import { FancyKanbanView, VIEW_TYPE_FANCY_KANBAN } from './src/integration/standalone-view';
import { BoardConfigModal } from './src/render/board-config-modal';
import { serializeBoardBlock } from './src/data/serializer';

const FANCY_KANBAN_ICON = 'fancy-kanban-icon';

function registerIcon(): void {
	addIcon(FANCY_KANBAN_ICON, `<g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round">
<path d="M8.2 11H5.8C5.35817 11 5 11.2985 5 11.6667V22.3333C5 22.7015 5.35817 23 5.8 23H8.2C8.64183 23 9 22.7015 9 22.3333V11.6667C9 11.2985 8.64183 11 8.2 11Z"/>
<path d="M13.2 11H10.8C10.3582 11 10 11.2985 10 11.6667V18.3333C10 18.7015 10.3582 19 10.8 19H13.2C13.6418 19 14 18.7015 14 18.3333V11.6667C14 11.2985 13.6418 11 13.2 11Z"/>
<path d="M18.2 11H15.8C15.3582 11 15 11.2686 15 11.6V19.4C15 19.7314 15.3582 20 15.8 20H18.2C18.6418 20 19 19.7314 19 19.4V11.6C19 11.2686 18.6418 11 18.2 11Z"/>
<path d="M18.3001 8.2006L16.4011 2.20929C16.3179 1.97002 16.1853 1.75098 16.0117 1.56651C15.8381 1.38203 15.6275 1.23627 15.3938 1.13875C15.16 1.04123 14.9082 0.994145 14.655 1.00058C14.4018 1.00702 14.1528 1.06682 13.9243 1.17609L12.7759 1.72509C12.5336 1.84071 12.2685 1.90068 12.0001 1.90059H8.85007C8.45798 1.90052 8.07659 2.02846 7.76387 2.26499C7.45115 2.50152 7.22422 2.83369 7.11757 3.21099L5.70007 8.2006"/>
<path d="M3 8.20044H21"/>
</g>`);
}

export default class FancyKanbanPlugin extends Plugin {
	async onload() {
		registerIcon();
		this.registerView(VIEW_TYPE_FANCY_KANBAN, (leaf) => new FancyKanbanView(leaf));

		registerPostProcessor(this);

		this.addRibbonIcon(FANCY_KANBAN_ICON, 'New Fancy Kanban board', () => {
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
				const template = serializeBoardBlock({
					title: 'New Board',
					fields: [
						{ name: 'title', type: 'Text', label: 'Title' },
						{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'], default: 'todo' },
					],
					viewConfig: { columns: 'status' },
					rawWorkflow: '',
					cards: [],
				});
				editor.replaceRange(template, editor.getCursor());
			},
		});
	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_FANCY_KANBAN);
	}

	private newBoard(): void {
		new BoardConfigModal(this.app, null, async (schema) => {
			const baseName = schema.title.trim() || 'New Board';
			let fileName = `${baseName}.md`;
			let counter = 2;
			while (this.app.vault.getAbstractFileByPath(fileName)) {
				fileName = `${baseName} ${counter}.md`;
				counter++;
			}
			const content = serializeBoardBlock({ ...schema, cards: [] });
			const file = await this.app.vault.create(fileName, content);
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(file as TFile);
		}).open();
	}
}
