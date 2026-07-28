// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderBoard } from '../../src/render/board';
import type { Board } from '../../src/model/board';

const BOARD: Board = {
	title: 'My Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'doing', 'done'], default: 'inbox' },
	],
	viewConfig: { columns: 'status' },
	rawWorkflow: '',
	cards: [
		{ id: 'a1', values: { title: 'Alpha', status: 'inbox' } },
		{ id: 'a2', values: { title: 'Beta', status: 'doing' } },
		{ id: 'a3', values: { title: 'Gamma', status: 'done' } },
		{ id: 'a4', values: { title: 'Delta', status: 'inbox' } },
	],
};

describe('renderBoard', () => {
	describe('structure', () => {
		it('returns an HTMLElement', () => {
			const container = document.createElement('div');
			expect(renderBoard(container, BOARD)).toBeInstanceOf(HTMLElement);
		});

		it('wrapper has class fk-board', () => {
			const container = document.createElement('div');
			expect(renderBoard(container, BOARD).classList.contains('fk-board')).toBe(true);
		});

		it('columns container has class fk-board__columns', () => {
			const container = document.createElement('div');
			expect(renderBoard(container, BOARD).querySelector('.fk-board__columns')).not.toBeNull();
		});
	});

	describe('columns', () => {
		it('creates one column per option in the columns field', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			expect(el.querySelectorAll('.fk-column').length).toBe(3);
		});

		it('column order matches field.options order', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			const titles = Array.from(el.querySelectorAll('.fk-column__title')).map(n => n.textContent);
			expect(titles).toEqual(['Inbox', 'Doing', 'Done']);
		});

		it('label capitalises first character of option value', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			const titles = Array.from(el.querySelectorAll('.fk-column__title')).map(n => n.textContent);
			expect(titles[0]).toBe('Inbox');
		});
	});

	describe('card distribution', () => {
		it('cards appear in their correct column', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			const inboxCol = el.querySelectorAll('.fk-column')[0];
			const titles = Array.from(inboxCol.querySelectorAll('.fk-card__title')).map(n => n.textContent);
			expect(titles).toContain('Alpha');
			expect(titles).toContain('Delta');
		});

		it('card does not appear in the wrong column', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			const doneCol = el.querySelectorAll('.fk-column')[2];
			const titles = Array.from(doneCol.querySelectorAll('.fk-card__title')).map(n => n.textContent);
			expect(titles).not.toContain('Alpha');
		});

		it('column count badge reflects actual card count', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			const counts = Array.from(el.querySelectorAll('.fk-column__count')).map(n => n.textContent);
			expect(counts).toEqual(['2', '1', '1']);
		});

		it('card with no matching status is excluded from all columns', () => {
			const container = document.createElement('div');
			const board: Board = {
				...BOARD,
				cards: [{ id: 'x', values: { title: 'Orphan', status: 'archived' } }],
			};
			const el = renderBoard(container, board);
			const counts = Array.from(el.querySelectorAll('.fk-column__count')).map(n => n.textContent);
			expect(counts).toEqual(['0', '0', '0']);
		});
	});

	describe('header', () => {
		it('renders a .fk-board__header element', () => {
			const container = document.createElement('div');
			expect(renderBoard(container, BOARD).querySelector('.fk-board__header')).not.toBeNull();
		});

		it('displays the board title in .fk-board__title', () => {
			const container = document.createElement('div');
			const el = renderBoard(container, BOARD);
			expect(el.querySelector('.fk-board__title')?.textContent).toBe('My Board');
		});

		it('renders a settings button with class fk-board__settings', () => {
			const container = document.createElement('div');
			expect(renderBoard(container, BOARD).querySelector('.fk-board__settings')).not.toBeNull();
		});
	});

	describe('edge cases', () => {
		it('board with no cards renders all columns with count 0', () => {
			const container = document.createElement('div');
			const board: Board = { ...BOARD, cards: [] };
			const el = renderBoard(container, board);
			const counts = Array.from(el.querySelectorAll('.fk-column__count')).map(n => n.textContent);
			expect(counts).toEqual(['0', '0', '0']);
		});

		it('missing columns field renders board with no columns', () => {
			const container = document.createElement('div');
			const board: Board = { ...BOARD, viewConfig: { columns: 'nonexistent' } };
			const el = renderBoard(container, board);
			expect(el.querySelectorAll('.fk-column').length).toBe(0);
		});
	});
});

const SWIMLANE_BOARD: Board = {
	title: 'Swim Board',
	fields: [
		{ name: 'title', type: 'Text', label: 'Title' },
		{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'done'], default: 'todo' },
		{ name: 'assignee', type: 'Select', label: 'Assignee', options: ['alice', 'bob'], default: 'alice' },
	],
	viewConfig: { columns: 'status', lanes: 'assignee' },
	rawWorkflow: '',
	cards: [
		{ id: 's1', values: { title: 'Alice todo', status: 'todo', assignee: 'alice' } },
		{ id: 's2', values: { title: 'Alice done', status: 'done', assignee: 'alice' } },
		{ id: 's3', values: { title: 'Bob todo',   status: 'todo', assignee: 'bob' } },
	],
};

describe('renderBoard — swimlane grid', () => {
	it('renders .fk-board__grid instead of .fk-board__columns when lanes is set', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		expect(el.querySelector('.fk-board__grid')).not.toBeNull();
		expect(el.querySelector('.fk-board__columns')).toBeNull();
	});

	it('renders a .fk-board__col-headers row', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		expect(el.querySelector('.fk-board__col-headers')).not.toBeNull();
	});

	it('renders one column header per column option', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		const titles = Array.from(el.querySelectorAll('.fk-board__col-headers .fk-column__title')).map(n => n.textContent);
		expect(titles).toEqual(['Todo', 'Done']);
	});

	it('column header count shows total cards across all lanes', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		const counts = Array.from(el.querySelectorAll('.fk-board__col-headers .fk-column__count')).map(n => n.textContent);
		expect(counts).toEqual(['2', '1']); // todo: alice+bob=2, done: alice=1
	});

	it('renders one .fk-swimlane row per lane option', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		expect(el.querySelectorAll('.fk-swimlane').length).toBe(2);
	});

	it('renders lane labels with capitalised text', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		const labels = Array.from(el.querySelectorAll('.fk-swimlane__label')).map(n => n.textContent);
		expect(labels).toEqual(['Alice', 'Bob']);
	});

	it('each swimlane row carries the correct data-lane-value', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		const laneValues = Array.from(el.querySelectorAll('.fk-swimlane')).map(n => (n as HTMLElement).dataset.laneValue);
		expect(laneValues).toEqual(['alice', 'bob']);
	});

	it('cards appear in the correct lane × column cell', () => {
		const container = document.createElement('div');
		const el = renderBoard(container, SWIMLANE_BOARD);
		const aliceTodo = el.querySelector('[data-lane-value="alice"][data-column-value="todo"]');
		expect(aliceTodo?.querySelector('[data-card-id="s1"]')).not.toBeNull();
		const bobTodo = el.querySelector('[data-lane-value="bob"][data-column-value="todo"]');
		expect(bobTodo?.querySelector('[data-card-id="s3"]')).not.toBeNull();
	});
});
