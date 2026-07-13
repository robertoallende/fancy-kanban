import type { Board } from '../model/board';
import { renderBoard } from './board';

export type SaveFn = (board: Board) => Promise<void>;

export function mountBoard(el: HTMLElement, board: Board, save: SaveFn): void {
	while (el.firstChild) el.removeChild(el.firstChild);

	const dispatch = (newBoard: Board): void => {
		save(newBoard).then(() => mountBoard(el, newBoard, save));
	};

	el.appendChild(renderBoard(board));

	// Event handlers attached in subunits 003–005
	void dispatch;
}
