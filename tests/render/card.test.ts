// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderCard, effectiveCardTitle, effectiveCardFields } from '../../src/render/card';
import type { Board, Card } from '../../src/model/board';

const BASE_BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
		{ name: 'due', type: 'Date', label: 'Due date' },
		{ name: 'docs', type: 'Link', label: 'Docs' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	version: 1,
	cards: [],
};

const CARD: Card = {
	id: 'abc12345',
	values: { title: 'Buy milk', status: 'inbox', due: '2026-08-01', docs: '' },
};

describe('effectiveCardTitle', () => {
	it('returns the first non-_id non-column field when cardTitle is undefined', () => {
		expect(effectiveCardTitle(BASE_BOARD)).toBe('title');
	});

	it('returns the explicit cardTitle field name', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'due' } };
		expect(effectiveCardTitle(board)).toBe('due');
	});

	it('returns null when cardTitle is empty string', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: '' } };
		expect(effectiveCardTitle(board)).toBeNull();
	});

	it('returns null when cardTitle names a field that does not exist', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'nonexistent' } };
		expect(effectiveCardTitle(board)).toBeNull();
	});
});

describe('effectiveCardFields', () => {
	it('returns explicit secondary cardFields filtered to known field names', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['due'] } };
		expect(effectiveCardFields(board)).toEqual(['due']);
	});

	it('filters out unknown field names', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['due', 'nonexistent'] } };
		expect(effectiveCardFields(board)).toEqual(['due']);
	});

	it('returns empty array when cardFields is undefined', () => {
		expect(effectiveCardFields(BASE_BOARD)).toEqual([]);
	});

	it('returns empty array when cardFields is empty', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: [] } };
		expect(effectiveCardFields(board)).toEqual([]);
	});

	it('filters out the card title field to avoid duplication', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'due'] } };
		expect(effectiveCardFields(board)).toEqual(['due']);
	});

	it('filters out the explicit cardTitle field when present in cardFields', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'due', cardFields: ['due', 'docs'] } };
		expect(effectiveCardFields(board)).toEqual(['docs']);
	});
});

describe('renderCard', () => {
	describe('container', () => {
		it('returns an HTMLElement', () => {
			const el = renderCard(CARD, BASE_BOARD);
			expect(el).toBeInstanceOf(HTMLElement);
		});

		it('container has class fk-card', () => {
			const el = renderCard(CARD, BASE_BOARD);
			expect(el.classList.contains('fk-card')).toBe(true);
		});
	});

	describe('title field', () => {
		it('renders the auto-detected title as fk-card__title', () => {
			const el = renderCard(CARD, BASE_BOARD);
			const title = el.querySelector('.fk-card__title');
			expect(title).not.toBeNull();
			expect(title!.textContent).toBe('Buy milk');
		});

		it('renders the explicit cardTitle field', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'due' } };
			const el = renderCard(CARD, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('2026-08-01');
		});

		it('renders no title element when cardTitle is empty string', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: '' } };
			const el = renderCard(CARD, board);
			expect(el.querySelector('.fk-card__title')).toBeNull();
		});

		it('title element is present even when value is empty (auto-detect)', () => {
			const card: Card = { id: 'x', values: { title: '', status: 'inbox', due: '', docs: '' } };
			const el = renderCard(card, BASE_BOARD);
			expect(el.querySelector('.fk-card__title')).not.toBeNull();
		});

		it('uses the first non-id non-column field as title regardless of name', () => {
			const board: Board = {
				...BASE_BOARD,
				fields: [
					{ name: 'subject', type: 'Text', label: 'Subject' },
					{ name: 'status', type: 'Select', label: 'Status', options: ['open'], default: 'open' },
				],
			};
			const card: Card = { id: 'x', values: { subject: 'My task', status: 'open' } };
			const el = renderCard(card, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('My task');
		});
	});

	describe('secondary fields', () => {
		it('does not render any secondary rows when cardFields is absent', () => {
			const el = renderCard(CARD, BASE_BOARD);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('does not render _id in the output', () => {
			const board: Board = {
				...BASE_BOARD,
				fields: [
					{ name: '_id', type: 'Text', label: 'ID' },
					{ name: 'title', type: 'Text', label: 'Title' },
				],
			};
			const card: Card = { id: 'x', values: { _id: 'x', title: 'Task' } };
			const el = renderCard(card, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('Task');
		});

		it('renders secondary field rows with label and value', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] } };
			const el = renderCard(CARD, board);
			const rows = el.querySelectorAll('.fk-card__field');
			expect(rows.length).toBe(1);
			expect(rows[0].querySelector('.fk-card__field-label')!.textContent).toBe('Due date');
			expect(rows[0].querySelector('.fk-card__field-value')!.textContent).toBe('2026-08-01');
		});

		it('hides labels when cardLabels is false', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'], cardLabels: false } };
			const el = renderCard(CARD, board);
			const rows = el.querySelectorAll('.fk-card__field');
			expect(rows.length).toBe(1);
			expect(rows[0].querySelector('.fk-card__field-label')).toBeNull();
			expect(rows[0].querySelector('.fk-card__field-value')!.textContent).toBe('2026-08-01');
		});

		it('skips secondary fields with empty values', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] } };
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', due: '', docs: '' } };
			const el = renderCard(card, board);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('renders Link field items as .fk-card__field-link spans with data-href', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['docs'] } };
			const card: Card = { ...CARD, values: { ...CARD.values, docs: 'notes/spec.md\nhttps://example.com' } };
			const el = renderCard(card, board);
			const links = el.querySelectorAll<HTMLElement>('.fk-card__field-link');
			expect(links.length).toBe(2);
			expect(links[0].dataset.href).toBe('notes/spec.md');
			expect(links[1].dataset.href).toBe('https://example.com');
		});
	});

	describe('drag', () => {
		it('has class fk-card--draggable', () => {
			const el = renderCard(CARD, BASE_BOARD);
			expect(el.classList.contains('fk-card--draggable')).toBe(true);
		});
	});
});
