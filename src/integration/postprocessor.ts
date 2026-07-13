import type { Plugin } from 'obsidian';
import { parseBlock } from '../data/parser';
import { renderBoard } from '../render/board';

export function registerPostProcessor(plugin: Plugin): void {
	plugin.registerMarkdownCodeBlockProcessor('fancy-kanban', (source, el) => {
		const result = parseBlock(source);
		if (!result.ok) {
			const error = document.createElement('p');
			error.classList.add('fk-error');
			error.textContent = result.error;
			el.appendChild(error);
			return;
		}
		el.appendChild(renderBoard(result.board));
	});
}
