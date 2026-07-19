// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderColumn } from '../../src/render/column';
import type { Board, Card } from '../../src/model/board';

const BOARD: Board = {
	title: 'Test Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	version: 1,
	cards: [],
};

const CARDS: Card[] = [
	{ id: 'a1', values: { title: 'Task one', status: 'inbox' } },
	{ id: 'a2', values: { title: 'Task two', status: 'inbox' } },
];

describe('renderColumn', () => {
	describe('container', () => {
		it('returns an HTMLElement', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el).toBeInstanceOf(HTMLElement);
		});

		it('container has class fk-column', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el.classList.contains('fk-column')).toBe(true);
		});
	});

	describe('header', () => {
		it('header element exists with class fk-column__header', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el.querySelector('.fk-column__header')).not.toBeNull();
		});

		it('title element shows the label argument', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el.querySelector('.fk-column__title')!.textContent).toBe('Inbox');
		});

		it('title element shows the label not the name', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'INBOX DISPLAY', CARDS, BOARD);
			expect(el.querySelector('.fk-column__title')!.textContent).toBe('INBOX DISPLAY');
		});

		it('count element shows the number of cards', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('2');
		});

		it('count shows 0 for an empty column', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('0');
		});

		it('count shows 1 for a single card', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', [CARDS[0]], BOARD);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('1');
		});
	});

	describe('cards container', () => {
		it('cards container exists with class fk-column__cards', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			expect(el.querySelector('.fk-column__cards')).not.toBeNull();
		});

		it('each card produces a .fk-card child', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			const cards = el.querySelectorAll('.fk-card');
			expect(cards.length).toBe(2);
		});

		it('empty column has no .fk-card children', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD);
			expect(el.querySelectorAll('.fk-card').length).toBe(0);
		});

		it('cards appear in the same order as the input array', () => {
			const container = document.createElement('div');
			const el = renderColumn(container, 'inbox', 'Inbox', CARDS, BOARD);
			const titles = Array.from(el.querySelectorAll('.fk-card__title')).map(n => n.textContent);
			expect(titles).toEqual(['Task one', 'Task two']);
		});
	});
});
