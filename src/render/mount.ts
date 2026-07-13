import type { Board } from '../model/board';
import { renderBoard } from './board';
import { moveCard, addCard, deleteCard } from '../model/mutations';
import { parseWorkflow, isTransitionAllowed } from '../data/workflow';

export type SaveFn = (board: Board) => Promise<void>;

export function mountBoard(el: HTMLElement, board: Board, save: SaveFn): void {
	while (el.firstChild) el.removeChild(el.firstChild);

	const dispatch = (newBoard: Board): void => {
		save(newBoard).then(() => mountBoard(el, newBoard, save));
	};

	const boardEl = renderBoard(board);
	attachDragDrop(boardEl, board, dispatch);
	attachCardActions(boardEl, board, dispatch);
	el.appendChild(boardEl);
}

function attachCardActions(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void): void {
	boardEl.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;

		const addBtn = target.closest<HTMLElement>('.fk-col__add-btn');
		if (addBtn) {
			const col = addBtn.closest<HTMLElement>('.fk-column');
			const columnValue = col?.dataset.columnValue ?? '';
			dispatch(addCard(board, columnValue));
			return;
		}

		const deleteBtn = target.closest<HTMLElement>('.fk-card__delete');
		if (deleteBtn) {
			const card = deleteBtn.closest<HTMLElement>('.fk-card');
			const cardId = card?.dataset.cardId ?? '';
			dispatch(deleteCard(board, cardId));
			return;
		}
	});
}

function attachDragDrop(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void): void {
	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);
	const statusOptions = columnField?.options ?? [];
	const workflowMap = parseWorkflow(board.rawWorkflow || undefined, statusOptions);

	let draggingCardId: string | null = null;

	boardEl.addEventListener('dragstart', (e) => {
		const card = (e.target as HTMLElement).closest<HTMLElement>('.fk-card');
		if (!card) return;
		draggingCardId = card.dataset.cardId ?? null;
		card.classList.add('fk-card--dragging');
	});

	boardEl.addEventListener('dragend', () => {
		draggingCardId = null;
		boardEl.querySelectorAll('.fk-card--dragging').forEach(c => c.classList.remove('fk-card--dragging'));
		boardEl.querySelectorAll('.fk-column--drag-over').forEach(c => c.classList.remove('fk-column--drag-over'));
	});

	boardEl.addEventListener('dragover', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col) return;
		e.preventDefault();
		boardEl.querySelectorAll('.fk-column--drag-over').forEach(c => c.classList.remove('fk-column--drag-over'));
		col.classList.add('fk-column--drag-over');
	});

	boardEl.addEventListener('dragleave', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col) return;
		// Only remove if leaving the column entirely (not entering a child)
		if (!col.contains(e.relatedTarget as Node)) {
			col.classList.remove('fk-column--drag-over');
		}
	});

	boardEl.addEventListener('drop', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col || !draggingCardId) return;

		boardEl.querySelectorAll('.fk-column--drag-over').forEach(c => c.classList.remove('fk-column--drag-over'));

		const toValue = col.dataset.columnValue ?? '';
		const draggedCard = board.cards.find(c => c.id === draggingCardId);
		const fromValue = draggedCard?.values[board.viewConfig.columns] ?? '';

		if (!isTransitionAllowed(workflowMap, fromValue, toValue)) return;

		dispatch(moveCard(board, draggingCardId, toValue));
	});
}
