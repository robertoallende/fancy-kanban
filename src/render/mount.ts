import { App, Workspace } from 'obsidian';
import type { Board } from '../model/board';
import { renderBoard } from './board';
import { reorderCard, deleteCard, createCard, updateCard } from '../model/mutations';
import { parseWorkflow, isTransitionAllowed } from '../data/workflow';
import { CardModal } from './card-modal';
import { BoardConfigModal } from './board-config-modal';
import { reconcileCards } from '../data/schema';

export type SaveFn = (board: Board) => Promise<void>;

export function mountBoard(el: HTMLElement, board: Board, save: SaveFn, app?: App, sourcePath = ''): void {
	while (el.firstChild) el.removeChild(el.firstChild);

	const dispatch = (newBoard: Board): void => {
		void save(newBoard).then(() => mountBoard(el, newBoard, save, app, sourcePath));
	};

	const boardEl = renderBoard(board);
	attachDragDrop(boardEl, board, dispatch);
	attachCardActions(boardEl, board, dispatch, app, sourcePath);
	el.appendChild(boardEl);
}

function attachCardActions(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void, app?: App, sourcePath = ''): void {
	boardEl.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;

		const linkEl = target.closest<HTMLElement>('.fk-card__field-link');
		if (linkEl) {
			e.stopPropagation();
			const href = linkEl.dataset.href ?? '';
			if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(href)) {
				window.open(href, '_blank');
			} else if (app) {
				void (app.workspace as Workspace).openLinkText(href, sourcePath, 'tab');
			}
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
				}, undefined, sourcePath).open();
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
				}, () => {
					dispatch(deleteCard(board, cardId));
				}, sourcePath).open();
			}
		}
	});
}

function getInsertBeforeId(clientY: number, col: HTMLElement): string | null {
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

export function showTransitionBlockedToast(from: string, to: string): void {
	const existing = activeDocument.querySelector('.fk-toast');
	if (existing) existing.remove();

	const toast = activeDocument.createElement('div');
	toast.classList.add('fk-toast');
	toast.textContent = `Cannot move from '${from}' to '${to}'. To allow this transition, add '${from} → ${to}' to the workflow.`;
	activeDocument.body.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('fk-toast--hiding');
		setTimeout(() => toast.remove(), 400);
	}, 3000);
}

function attachDragDrop(boardEl: HTMLElement, board: Board, dispatch: (b: Board) => void): void {
	const columnField = board.fields.find(f => f.name === board.viewConfig.columns);
	const statusOptions = columnField?.options ?? [];
	const workflowMap = parseWorkflow(board.rawWorkflow || undefined, statusOptions);

	let draggingCardId: string | null = null;
	let currentCol: HTMLElement | null = null;
	let insertBeforeId: string | null = null;

	boardEl.addEventListener('pointerdown', (e) => {
		const target = e.target as HTMLElement;
		if (target.closest('button')) return;
		const card = target.closest<HTMLElement>('.fk-card');
		if (!card) return;

		const startX = e.clientX;
		const startY = e.clientY;
		let dragStarted = false;

		const onMove = (ev: PointerEvent) => {
			if (!dragStarted) {
				const dx = ev.clientX - startX;
				const dy = ev.clientY - startY;
				if (dx * dx + dy * dy < 25) return;
				dragStarted = true;
				draggingCardId = card.dataset.cardId ?? null;
				card.classList.add('fk-card--dragging');
			}
			ev.preventDefault();
			const below = activeDocument.elementFromPoint(ev.clientX, ev.clientY);
			const col = below?.closest<HTMLElement>('.fk-column') ?? null;
			if (col !== currentCol) {
				currentCol?.classList.remove('fk-column--drag-over');
				currentCol?.querySelectorAll('.fk-drop-indicator').forEach(el => el.remove());
				currentCol = col;
				col?.classList.add('fk-column--drag-over');
			}
			if (col) {
				insertBeforeId = getInsertBeforeId(ev.clientY, col);
				updateDropIndicator(col, insertBeforeId);
			}
		};

		const onUp = () => {
			activeDocument.removeEventListener('pointermove', onMove);
			activeDocument.removeEventListener('pointerup', onUp);
			if (!dragStarted) return;
			const col = currentCol;
			clearDropState(boardEl);
			if (col && draggingCardId) {
				const toValue = col.dataset.columnValue ?? '';
				const draggedCard = board.cards.find(c => c.id === draggingCardId);
				const fromValue = draggedCard?.values[board.viewConfig.columns] ?? '';
				if (fromValue === toValue || isTransitionAllowed(workflowMap, fromValue, toValue)) {
					dispatch(reorderCard(board, draggingCardId, toValue, insertBeforeId));
				} else if (fromValue !== toValue) {
					showTransitionBlockedToast(fromValue, toValue);
				}
			}
			draggingCardId = null;
			currentCol = null;
			insertBeforeId = null;
		};

		activeDocument.addEventListener('pointermove', onMove);
		activeDocument.addEventListener('pointerup', onUp);
	});
}
