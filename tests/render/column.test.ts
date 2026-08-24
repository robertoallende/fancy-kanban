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

describe('renderColumn — lane value (swimlane cell)', () => {
	it('sets data-lane-value on the container when laneValue is provided', () => {
		const container = document.createElement('div');
		const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD, 'alice');
		expect(el.dataset.laneValue).toBe('alice');
	});

	it('does not set data-lane-value when laneValue is omitted', () => {
		const container = document.createElement('div');
		const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD);
		expect(el.dataset.laneValue).toBeUndefined();
	});

	it('omits .fk-column__header when laneValue is provided', () => {
		const container = document.createElement('div');
		const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD, 'alice');
		expect(el.querySelector('.fk-column__header')).toBeNull();
	});

	it('still renders .fk-column__header when laneValue is omitted', () => {
		const container = document.createElement('div');
		const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD);
		expect(el.querySelector('.fk-column__header')).not.toBeNull();
	});

	it('still sets data-column-value regardless of laneValue', () => {
		const container = document.createElement('div');
		const el = renderColumn(container, 'inbox', 'Inbox', [], BOARD, 'alice');
		expect(el.dataset.columnValue).toBe('inbox');
	});
});

// unit 33.2 — card_limit column rendering
describe('renderColumn — card limit', () => {
	const FIVE_CARDS: Card[] = [
		{ id: 'c1', values: { title: 'One',   status: 'done' } },
		{ id: 'c2', values: { title: 'Two',   status: 'done' } },
		{ id: 'c3', values: { title: 'Three', status: 'done' } },
		{ id: 'c4', values: { title: 'Four',  status: 'done' } },
		{ id: 'c5', values: { title: 'Five',  status: 'done' } },
	];

	function makeBoard(cardLimit: number | undefined): Board {
		return { ...BOARD, viewConfig: { columns: 'status', cardLimit } };
	}

	it('renders all cards when cardLimit is undefined', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(undefined));
		expect(el.querySelectorAll('.fk-card').length).toBe(5);
	});

	it('renders all cards when cardLimit is 0', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(0));
		expect(el.querySelectorAll('.fk-card').length).toBe(5);
	});

	it('renders all cards when count does not exceed the limit', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(5));
		expect(el.querySelectorAll('.fk-card').length).toBe(5);
		expect(el.querySelector('.fk-col__show-more')).toBeNull();
	});

	it('hides cards beyond the limit with fk-hidden', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		const hidden = el.querySelectorAll('.fk-card.fk-hidden');
		expect(hidden.length).toBe(2);
	});

	it('first N cards are visible (no fk-hidden)', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		const cards = el.querySelectorAll('.fk-card');
		expect(cards[0].classList.contains('fk-hidden')).toBe(false);
		expect(cards[1].classList.contains('fk-hidden')).toBe(false);
		expect(cards[2].classList.contains('fk-hidden')).toBe(false);
	});

	it('shows a .fk-col__show-more button when limit is exceeded', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		expect(el.querySelector('.fk-col__show-more')).not.toBeNull();
	});

	it('show-more button text includes the hidden count', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		const btn = el.querySelector<HTMLButtonElement>('.fk-col__show-more')!;
		expect(btn.textContent).toContain('2');
	});

	it('clicking show-more reveals all hidden cards', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		el.querySelector<HTMLButtonElement>('.fk-col__show-more')!.click();
		expect(el.querySelectorAll('.fk-card.fk-hidden').length).toBe(0);
	});

	it('clicking show-more removes the button', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		el.querySelector<HTMLButtonElement>('.fk-col__show-more')!.click();
		expect(el.querySelector('.fk-col__show-more')).toBeNull();
	});

	it('all cards remain in the DOM even when hidden', () => {
		const el = renderColumn(document.createElement('div'), 'done', 'Done', FIVE_CARDS, makeBoard(3));
		expect(el.querySelectorAll('.fk-card').length).toBe(5);
	});
});
