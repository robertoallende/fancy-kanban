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
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el).toBeInstanceOf(HTMLElement);
		});

		it('container has class fk-card', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el.classList.contains('fk-card')).toBe(true);
		});
	});

	describe('title field', () => {
		it('renders the auto-detected title as fk-card__title', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			const title = el.querySelector('.fk-card__title');
			expect(title).not.toBeNull();
			expect(title!.textContent).toBe('Buy milk');
		});

		it('renders the explicit cardTitle field', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'due' } };
			const el = renderCard(container, CARD, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('2026-08-01');
		});

		it('renders no title element when cardTitle is empty string', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: '' } };
			const el = renderCard(container, CARD, board);
			expect(el.querySelector('.fk-card__title')).toBeNull();
		});

		it('title element is present even when value is empty (auto-detect)', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: '', status: 'inbox', due: '', docs: '' } };
			const el = renderCard(container, card, BASE_BOARD);
			expect(el.querySelector('.fk-card__title')).not.toBeNull();
		});

		it('uses the first non-id non-column field as title regardless of name', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				fields: [
					{ name: 'subject', type: 'Text', label: 'Subject' },
					{ name: 'status', type: 'Select', label: 'Status', options: ['open'], default: 'open' },
				],
			};
			const card: Card = { id: 'x', values: { subject: 'My task', status: 'open' } };
			const el = renderCard(container, card, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('My task');
		});
	});

	describe('secondary fields', () => {
		it('does not render any secondary rows when cardFields is absent', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('does not render _id in the output', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				fields: [
					{ name: '_id', type: 'Text', label: 'ID' },
					{ name: 'title', type: 'Text', label: 'Title' },
				],
			};
			const card: Card = { id: 'x', values: { _id: 'x', title: 'Task' } };
			const el = renderCard(container, card, board);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('Task');
		});

		it('renders secondary field rows with label and value', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] } };
			const el = renderCard(container, CARD, board);
			const rows = el.querySelectorAll('.fk-card__field');
			expect(rows.length).toBe(1);
			expect(rows[0].querySelector('.fk-card__field-label')!.textContent).toBe('Due date');
			expect(rows[0].querySelector('.fk-card__field-value')!.textContent).toBe('2026-08-01');
		});

		it('hides labels when cardLabels is false', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'], cardLabels: false } };
			const el = renderCard(container, CARD, board);
			const rows = el.querySelectorAll('.fk-card__field');
			expect(rows.length).toBe(1);
			expect(rows[0].querySelector('.fk-card__field-label')).toBeNull();
			expect(rows[0].querySelector('.fk-card__field-value')!.textContent).toBe('2026-08-01');
		});

		it('skips secondary fields with empty values', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] } };
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', due: '', docs: '' } };
			const el = renderCard(container, card, board);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('renders Link field items as .fk-card__field-link spans with data-href', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['docs'] } };
			const card: Card = { ...CARD, values: { ...CARD.values, docs: 'notes/spec.md\nhttps://example.com' } };
			const el = renderCard(container, card, board);
			const links = el.querySelectorAll<HTMLElement>('.fk-card__field-link');
			expect(links.length).toBe(2);
			expect(links[0].dataset.href).toBe('notes/spec.md');
			expect(links[1].dataset.href).toBe('https://example.com');
		});

		it('sets title attribute to full URL on Link field spans so long links are accessible on hover', () => {
			const container = document.createElement('div');
			const longUrl = 'https://www.example.com/very/long/path/that/overflows/the/card/width/easily';
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['docs'] } };
			const card: Card = { ...CARD, values: { ...CARD.values, docs: longUrl } };
			const el = renderCard(container, card, board);
			const link = el.querySelector<HTMLElement>('.fk-card__field-link');
			expect(link?.title).toBe(longUrl);
			expect(link?.dataset.href).toBe(longUrl);
		});
	});

	describe('markdown rendering on card face', () => {
		const MD_BOARD: Board = {
			...BASE_BOARD,
			fields: [
				{ name: 'title', type: 'Text', label: 'Title' },
				{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
				{ name: 'notes', type: 'Textarea', label: 'Notes' },
			],
			viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['notes'] },
		};

		it('renders **bold** in a Text field value as <strong>', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] },
				fields: [
					{ name: 'title', type: 'Text', label: 'Title' },
					{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'] },
					{ name: 'due', type: 'Text', label: 'Priority' },
				],
			};
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', due: '**urgent**' } };
			const el = renderCard(container, card, board);
			expect(el.querySelector('.fk-card__field-value strong')?.textContent).toBe('urgent');
		});

		it('renders *italic* in a Text field value as <em>', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] },
				fields: [
					{ name: 'title', type: 'Text', label: 'Title' },
					{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'] },
					{ name: 'due', type: 'Text', label: 'Note' },
				],
			};
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', due: '*maybe*' } };
			const el = renderCard(container, card, board);
			expect(el.querySelector('.fk-card__field-value em')?.textContent).toBe('maybe');
		});

		it('renders a Textarea value of "- a\\n- b" as a <ul> with two <li> elements', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', notes: '- alpha\n- beta' } };
			const el = renderCard(container, card, MD_BOARD);
			const ul = el.querySelector('ul');
			expect(ul).not.toBeNull();
			const items = ul!.querySelectorAll('li');
			expect(items.length).toBe(2);
			expect(items[0].textContent).toBe('alpha');
			expect(items[1].textContent).toBe('beta');
		});

		it('renders a Textarea value of "1. a\\n2. b" as an <ol> with two <li> elements', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', notes: '1. first\n2. second' } };
			const el = renderCard(container, card, MD_BOARD);
			const ol = el.querySelector('ol');
			expect(ol).not.toBeNull();
			const items = ol!.querySelectorAll('li');
			expect(items.length).toBe(2);
			expect(items[0].textContent).toBe('first');
			expect(items[1].textContent).toBe('second');
		});

		it('renders **bold** in the card title as <strong>', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: '**urgent** task', status: 'inbox', notes: '' } };
			const el = renderCard(container, card, MD_BOARD);
			expect(el.querySelector('.fk-card__title strong')?.textContent).toBe('urgent');
		});

		it('renders mixed prose+list Textarea with prose as text block and list items as <ul>', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', notes: 'intro text\n- item one\n- item two' } };
			const el = renderCard(container, card, MD_BOARD);
			const wrapper = el.querySelector('.fk-card__field-value')!;
			expect(wrapper.querySelector('div')?.textContent).toBe('intro text');
			const ul = wrapper.querySelector('ul');
			expect(ul).not.toBeNull();
			expect(ul!.querySelectorAll('li').length).toBe(2);
		});

		it('renders **bold** inside a checklist item label as <strong>', () => {
			const container = document.createElement('div');
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', notes: '- [ ] **important**' } };
			const el = renderCard(container, card, MD_BOARD);
			expect(el.querySelector('.fk-card__checklist-item strong')?.textContent).toBe('important');
		});
	});

	describe('drag', () => {
		it('has class fk-card--draggable', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el.classList.contains('fk-card--draggable')).toBe(true);
		});
	});

	describe('data attributes', () => {
		it('sets data-column to the card status value', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el.dataset.column).toBe('inbox');
		});

		it('data-column reflects the actual column value of the card', () => {
			const container = document.createElement('div');
			const card: Card = { ...CARD, values: { ...CARD.values, status: 'done' } };
			const el = renderCard(container, card, BASE_BOARD);
			expect(el.dataset.column).toBe('done');
		});

		it('sets data-lane when the board has swimlanes', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				fields: [
					...BASE_BOARD.fields,
					{ name: 'owner', type: 'Select', label: 'Owner', options: ['alice', 'bob'], default: 'alice' },
				],
				viewConfig: { columns: 'status', lanes: 'owner' },
			};
			const card: Card = { ...CARD, values: { ...CARD.values, owner: 'alice' } };
			const el = renderCard(container, card, board);
			expect(el.dataset.lane).toBe('alice');
		});

		it('omits data-lane when the board has no swimlanes', () => {
			const container = document.createElement('div');
			const el = renderCard(container, CARD, BASE_BOARD);
			expect(el.dataset.lane).toBeUndefined();
		});

		it('secondary Text field value span has data-key and data-value', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] },
			};
			const el = renderCard(container, CARD, board);
			const span = el.querySelector<HTMLElement>('.fk-card__field-value');
			expect(span?.dataset.key).toBe('due');
			expect(span?.dataset.value).toBe('2026-08-01');
		});

		it('secondary Select field value span has data-key and data-value', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				fields: [
					{ name: 'title', type: 'Text', label: 'Title' },
					{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
					{ name: 'priority', type: 'Select', label: 'Priority', options: ['low', 'high'], default: 'low' },
				],
				viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['priority'] },
			};
			const card: Card = { id: 'x', values: { title: 'Task', status: 'inbox', priority: 'high' } };
			const el = renderCard(container, card, board);
			const span = el.querySelector<HTMLElement>('.fk-card__field-value');
			expect(span?.dataset.key).toBe('priority');
			expect(span?.dataset.value).toBe('high');
		});

		it('secondary Date field value span has data-key and data-value', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BASE_BOARD,
				viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['due'] },
			};
			const el = renderCard(container, CARD, board);
			const span = el.querySelector<HTMLElement>('.fk-card__field-value');
			expect(span?.dataset.key).toBe('due');
			expect(span?.dataset.value).toBe('2026-08-01');
		});

		it('Link field spans do not get data-key or data-value', () => {
			const container = document.createElement('div');
			const board: Board = { ...BASE_BOARD, viewConfig: { columns: 'status', cardTitle: 'title', cardFields: ['docs'] } };
			const card: Card = { ...CARD, values: { ...CARD.values, docs: 'notes/spec.md' } };
			const el = renderCard(container, card, board);
			const link = el.querySelector<HTMLElement>('.fk-card__field-link');
			expect(link?.dataset.key).toBeUndefined();
			expect(link?.dataset.value).toBeUndefined();
			expect(link?.dataset.href).toBe('notes/spec.md');
		});
	});
});
