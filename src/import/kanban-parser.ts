export interface KanbanCard {
	title: string;
	body: string;
	checked: boolean;
}

export interface KanbanLane {
	title: string;
	complete: boolean;
	cards: KanbanCard[];
}

export interface KanbanBoard {
	lanes: KanbanLane[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const SETTINGS_BLOCK_RE = /%%\s*kanban:settings[\s\S]*?%%/g;
const WIP_LIMIT_RE = /\s*\(\d+\)\s*$/;
const LIST_ITEM_RE = /^- \[([ x/])\] (.*)/;
const CONTINUATION_RE = /^(\t| {4})(.*)/;

const STRIP_RES = [
	/@@\{[^}]+\}/g,
	/@\{[^}]+\}/g,
	/@\[\[[^\]]+\]\]/g,
	/!?\[\[[^\]]+\]\]/g,
	/#[\w/-]+/g,
	/\^[\w-]+$/,
];

function stripMetadata(text: string): string {
	let s = text;
	for (const re of STRIP_RES) s = s.replace(re, '');
	return s.trim();
}

function extractFrontmatter(text: string): Record<string, string> {
	const m = text.match(FRONTMATTER_RE);
	if (!m) return {};
	const result: Record<string, string> = {};
	for (const line of m[1].split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return result;
}

export function parseKanbanBoard(text: string): KanbanBoard {
	const frontmatter = extractFrontmatter(text);
	const plugin = frontmatter['kanban-plugin'];
	if (!plugin || (plugin !== 'board' && plugin !== 'basic')) {
		throw new Error("File does not contain 'kanban-plugin: board' in frontmatter");
	}

	const body = text
		.replace(FRONTMATTER_RE, '')
		.replace(SETTINGS_BLOCK_RE, '');

	const lanes: KanbanLane[] = [];
	let currentLane: KanbanLane | null = null;
	let inArchive = false;
	let pendingContinuation: string[] = [];
	let pendingCard: KanbanCard | null = null;

	function flushCard() {
		if (pendingCard && currentLane) {
			pendingCard.body = pendingContinuation.join('\n').trim();
			currentLane.cards.push(pendingCard);
		}
		pendingCard = null;
		pendingContinuation = [];
	}

	for (const line of body.split('\n')) {
		const trimmed = line.trim();

		if (trimmed === '***') {
			flushCard();
			inArchive = true;
			continue;
		}

		if (inArchive) continue;

		if (trimmed.startsWith('## ')) {
			flushCard();
			const rawTitle = trimmed.slice(3).trim();
			if (rawTitle.toLowerCase() === 'archive') {
				inArchive = true;
				continue;
			}
			const title = rawTitle.replace(WIP_LIMIT_RE, '').trim();
			currentLane = { title, complete: false, cards: [] };
			lanes.push(currentLane);
			continue;
		}

		if (!currentLane) continue;

		if (trimmed === '**Complete**') {
			currentLane.complete = true;
			continue;
		}

		const contMatch = line.match(CONTINUATION_RE);
		if (contMatch && pendingCard) {
			pendingContinuation.push(contMatch[2]);
			continue;
		}

		const itemMatch = trimmed.match(LIST_ITEM_RE);
		if (itemMatch) {
			flushCard();
			pendingCard = {
				title: stripMetadata(itemMatch[2]),
				body: '',
				checked: itemMatch[1] === 'x',
			};
			continue;
		}

		if (pendingCard && trimmed === '') {
			// blank line ends a card's continuation
			flushCard();
		}
	}

	flushCard();

	return { lanes };
}
