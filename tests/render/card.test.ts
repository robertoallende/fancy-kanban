// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderCard, effectiveCardFields } from '../../src/render/card';
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

describe('effectiveCardFields', () => {
	it('returns explicit cardFields filtered to known field names', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'due'] } };
		expect(effectiveCardFields(board)).toEqual(['title', 'due']);
	});

	it('filters out unknown field names from cardFields', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'nonexistent'] } };
		expect(effectiveCardFields(board)).toEqual(['title']);
	});

	it('falls back to first non-_id non-column field when cardFields is undefined', () => {
		expect(effectiveCardFields(BASE_BOARD)).toEqual(['title']);
	});

	it('falls back when cardFields is empty array', () => {
		const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: [] } };
		expect(effectiveCardFields(board)).toEqual(['title']);
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
		it('renders the first non-id non-column field value as fk-card__title', () => {
			const el = renderCard(CARD, BASE_BOARD);
			const title = el.querySelector('.fk-card__title');
			expect(title).not.toBeNull();
			expect(title!.textContent).toBe('Buy milk');
		});

		it('title element is present even when value is empty', () => {
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
		it('does not render any .fk-card__field rows when only title in cardFields', () => {
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

		it('renders secondary field rows when cardFields has multiple entries', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'due'] } };
			const card: Card = { ...CARD, values: { ...CARD.values, due: '2026-08-01' } };
			const el = renderCard(card, board);
			const rows = el.querySelectorAll('.fk-card__field');
			expect(rows.length).toBe(1);
			expect(rows[0].querySelector('.fk-card__field-label')!.textContent).toBe('Due date');
			expect(rows[0].querySelector('.fk-card__field-value')!.textContent).toBe('2026-08-01');
		});

		it('skips secondary fields with empty values', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'due'] } };
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', due: '', docs: '' } };
			const el = renderCard(card, board);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('renders Link field items as .fk-card__field-link spans with data-href', () => {
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardFields: ['title', 'docs'] } };
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
