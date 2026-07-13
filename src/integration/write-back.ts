import type { Vault, TFile } from 'obsidian';
import type { Board } from '../model/board';
import { serializeBoard } from '../data/serializer';

export type BlockLocation = { start: number; end: number };

export function locateBlock(fileContent: string, blockIndex: number): BlockLocation | null {
	const regex = /^```fancy-kanban$[\s\S]*?^```$/gm;
	let match: RegExpExecArray | null;
	let count = 0;

	while ((match = regex.exec(fileContent)) !== null) {
		if (count === blockIndex) {
			return { start: match.index, end: match.index + match[0].length };
		}
		count++;
	}

	return null;
}

export function patchBlock(
	fileContent: string,
	start: number,
	end: number,
	newBlockText: string,
): string {
	return fileContent.slice(0, start) + newBlockText + fileContent.slice(end);
}

export default async function writeBack(
	vault: Vault,
	file: TFile,
	blockIndex: number,
	board: Board,
): Promise<void> {
	const newBlockText = '```fancy-kanban\n' + serializeBoard(board) + '\n```';

	await vault.process(file, (content) => {
		const location = locateBlock(content, blockIndex);
		if (!location) return content;
		return patchBlock(content, location.start, location.end, newBlockText);
	});
}
