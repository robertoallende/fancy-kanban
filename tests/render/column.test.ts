// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderColumn } from '../../src/render/column';
import type { Card, FieldDefinition } from '../../src/model/board';

const FIELDS: FieldDefinition[] = [
	{ name: 'title', type: 'Text', label: 'Title' },
	{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
];

const CARDS: Card[] = [
	{ id: 'a1', values: { title: 'Task one', status: 'inbox' } },
	{ id: 'a2', values: { title: 'Task two', status: 'inbox' } },
];

describe('renderColumn', () => {
	describe('container', () => {
		it('returns an HTMLElement', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el).toBeInstanceOf(HTMLElement);
		});

		it('container has class fk-column', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el.classList.contains('fk-column')).toBe(true);
		});
	});

	describe('header', () => {
		it('header element exists with class fk-column__header', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el.querySelector('.fk-column__header')).not.toBeNull();
		});

		it('title element shows the label argument', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el.querySelector('.fk-column__title')!.textContent).toBe('Inbox');
		});

		it('title element shows the label not the name', () => {
			const el = renderColumn('inbox', 'INBOX DISPLAY', CARDS, FIELDS);
			expect(el.querySelector('.fk-column__title')!.textContent).toBe('INBOX DISPLAY');
		});

		it('count element shows the number of cards', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('2');
		});

		it('count shows 0 for an empty column', () => {
			const el = renderColumn('inbox', 'Inbox', [], FIELDS);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('0');
		});

		it('count shows 1 for a single card', () => {
			const el = renderColumn('inbox', 'Inbox', [CARDS[0]], FIELDS);
			expect(el.querySelector('.fk-column__count')!.textContent).toBe('1');
		});
	});

	describe('cards container', () => {
		it('cards container exists with class fk-column__cards', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			expect(el.querySelector('.fk-column__cards')).not.toBeNull();
		});

		it('each card produces a .fk-card child', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			const cards = el.querySelectorAll('.fk-card');
			expect(cards.length).toBe(2);
		});

		it('empty column has no .fk-card children', () => {
			const el = renderColumn('inbox', 'Inbox', [], FIELDS);
			expect(el.querySelectorAll('.fk-card').length).toBe(0);
		});

		it('cards appear in the same order as the input array', () => {
			const el = renderColumn('inbox', 'Inbox', CARDS, FIELDS);
			const titles = Array.from(el.querySelectorAll('.fk-card__title')).map(n => n.textContent);
			expect(titles).toEqual(['Task one', 'Task two']);
		});
	});
});
