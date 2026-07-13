import { App } from 'obsidian';
import type { Board } from '../model/board';
import { renderBoard } from './board';
import { reorderCard, deleteCard, createCard, updateCard } from '../model/mutations';
import { parseWorkflow, isTransitionAllowed } from '../data/workflow';
import { CardModal } from './card-modal';
import { BoardConfigModal } from './board-config-modal';
import { reconcileCards } from '../data/schema';

export type SaveFn = (board: Board) => Promise<void>;

export function mountBoard(el: HTMLElement, board: Board, save: SaveFn, app?: App): void {
	while (el.firstChild) el.removeChild(el.firstChild);

	const dispatch = (newBoard: Board): void => {
		save(newBoard).then(() => mountBoard(el, newBoard, save, app));
	};

	const boardEl = renderBoard(board);
	attachDragDrop(boardEl, board, dispatch);
	attachCardActions(boardEl, board, dispatch, app);
	el.appendChild(boardEl);
}

function attachCardActions(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void, app?: App): void {
	boardEl.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;

		const deleteBtn = target.closest<HTMLElement>('.fk-card__delete');
		if (deleteBtn) {
			const card = deleteBtn.closest<HTMLElement>('.fk-card');
			const cardId = card?.dataset.cardId ?? '';
			dispatch(deleteCard(board, cardId));
			return;
		}

		const settingsBtn = target.closest<HTMLElement>('.fk-board__settings');
		if (settingsBtn && app) {
			new BoardConfigModal(app, board, (schema) => {
				const reconciledCards = reconcileCards(schema.fields, board.cards);
				dispatch({ ...schema, cards: reconciledCards });
			}).open();
			return;
		}

		const addBtn = target.closest<HTMLElement>('.fk-col__add-btn');
		if (addBtn) {
			const col = addBtn.closest<HTMLElement>('.fk-column');
			const columnValue = col?.dataset.columnValue ?? '';
			if (app) {
				new CardModal(app, board, null, columnValue, (values) => {
					dispatch(createCard(board, columnValue, values));
				}).open();
			} else {
				dispatch(createCard(board, columnValue, {}));
			}
			return;
		}

		const cardEl = target.closest<HTMLElement>('.fk-card');
		if (cardEl) {
			const cardId = cardEl.dataset.cardId ?? '';
			const card = board.cards.find(c => c.id === cardId) ?? null;
			const columnValue = cardEl.closest<HTMLElement>('.fk-column')?.dataset.columnValue ?? '';
			if (app && card) {
				new CardModal(app, board, card, columnValue, (values) => {
					dispatch(updateCard(board, cardId, values));
				}).open();
			}
		}
	});
}

function getInsertBeforeId(e: Event, col: HTMLElement): string | null {
	const clientY = (e as MouseEvent).clientY ?? 0;
	const cards = Array.from(col.querySelectorAll<HTMLElement>('.fk-card:not(.fk-card--dragging)'));
	for (const card of cards) {
		const rect = card.getBoundingClientRect();
		if (clientY < rect.top + rect.height / 2) return card.dataset.cardId ?? null;
	}
	return null;
}

function updateDropIndicator(col: HTMLElement, insertBeforeId: string | null): void {
	col.querySelectorAll('.fk-drop-indicator').forEach(el => el.remove());
	const indicator = activeDocument.createElement('div');
	indicator.classList.add('fk-drop-indicator');
	const cardsEl = col.querySelector('.fk-column__cards');
	if (!cardsEl) return;
	if (insertBeforeId === null) {
		cardsEl.appendChild(indicator);
	} else {
		const target = cardsEl.querySelector(`[data-card-id="${insertBeforeId}"]`);
		if (target) cardsEl.insertBefore(indicator, target);
		else cardsEl.appendChild(indicator);
	}
}

function clearDropState(boardEl: HTMLElement): void {
	boardEl.querySelectorAll('.fk-card--dragging').forEach(c => c.classList.remove('fk-card--dragging'));
	boardEl.querySelectorAll('.fk-column--drag-over').forEach(c => c.classList.remove('fk-column--drag-over'));
	boardEl.querySelectorAll('.fk-drop-indicator').forEach(el => el.remove());
}

function attachDragDrop(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void): void {
	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);
	const statusOptions = columnField?.options ?? [];
	const workflowMap = parseWorkflow(board.rawWorkflow || undefined, statusOptions);

	let draggingCardId: string | null = null;
	let insertBeforeId: string | null = null;

	boardEl.addEventListener('dragstart', (e) => {
		const card = (e.target as HTMLElement).closest<HTMLElement>('.fk-card');
		if (!card) return;
		draggingCardId = card.dataset.cardId ?? null;
		card.classList.add('fk-card--dragging');
	});

	boardEl.addEventListener('dragend', () => {
		draggingCardId = null;
		insertBeforeId = null;
		clearDropState(boardEl);
	});

	boardEl.addEventListener('dragover', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col) return;
		e.preventDefault();
		boardEl.querySelectorAll('.fk-column--drag-over').forEach(c => c.classList.remove('fk-column--drag-over'));
		col.classList.add('fk-column--drag-over');
		insertBeforeId = getInsertBeforeId(e, col);
		updateDropIndicator(col, insertBeforeId);
	});

	boardEl.addEventListener('dragleave', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col) return;
		if (!col.contains(e.relatedTarget as Node)) {
			col.classList.remove('fk-column--drag-over');
			col.querySelectorAll('.fk-drop-indicator').forEach(el => el.remove());
		}
	});

	boardEl.addEventListener('drop', (e) => {
		const col = (e.target as HTMLElement).closest<HTMLElement>('.fk-column');
		if (!col || !draggingCardId) return;

		clearDropState(boardEl);

		const toValue = col.dataset.columnValue ?? '';
		const draggedCard = board.cards.find(c => c.id === draggingCardId);
		const fromValue = draggedCard?.values[board.viewConfig.columns] ?? '';

		if (fromValue !== toValue && !isTransitionAllowed(workflowMap, fromValue, toValue)) return;

		dispatch(reorderCard(board, draggingCardId, toValue, insertBeforeId));
		insertBeforeId = null;
	});
}
