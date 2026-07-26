import { describe, it, expect } from 'vitest';
import { effectiveLanes, groupCards } from '../../src/render/lanes';
import type { Board } from '../../src/model/board';

function makeBoard(overrides: Partial<Board> = {}): Board {
	return {
		title: 'Test',
		version: 2,
		rawWorkflow: '',
		fields: [
			{ name: 'title', type: 'Text', label: 'Title' },
			{ name: 'status', type: 'Select', label: 'Status', options: ['todo', 'doing', 'done'] },
			{ name: 'assignee', type: 'Select', label: 'Assignee', options: ['roberto', 'teacher'] },
		],
		viewConfig: { columns: 'status' },
		cards: [],
		...overrides,
	};
}

describe('effectiveLanes', () => {
	it('returns null when lanes is not configured', () => {
		expect(effectiveLanes(makeBoard())).toBeNull();
	});

	it('returns null when the lanes field does not exist', () => {
		const board = makeBoard({ viewConfig: { columns: 'status', lanes: 'nonexistent' } });
		expect(effectiveLanes(board)).toBeNull();
	});

	it('returns null when the lanes field has no options', () => {
		const board = makeBoard({
			fields: [
				{ name: 'status', type: 'Select', label: 'Status', options: ['todo'] },
				{ name: 'assignee', type: 'Select', label: 'Assignee' },
			],
			viewConfig: { columns: 'status', lanes: 'assignee' },
		});
		expect(effectiveLanes(board)).toBeNull();
	});

	it('returns lane options in order when configured', () => {
		const board = makeBoard({ viewConfig: { columns: 'status', lanes: 'assignee' } });
		expect(effectiveLanes(board)).toEqual(['roberto', 'teacher']);
	});
});

describe('groupCards', () => {
	const CARDS = [
		{ id: 'c1', values: { status: 'todo',  assignee: 'roberto' } },
		{ id: 'c2', values: { status: 'doing', assignee: 'roberto' } },
		{ id: 'c3', values: { status: 'todo',  assignee: 'teacher' } },
		{ id: 'c4', values: { status: 'done',  assignee: 'teacher' } },
		{ id: 'c5', values: { status: 'doing', assignee: 'teacher' } },
	];

	describe('without lanes', () => {
		it('returns a single outer key (empty string)', () => {
			const board = makeBoard({ cards: CARDS });
			const grouped = groupCards(board);
			expect([...grouped.keys()]).toEqual(['']);
		});

		it('groups all cards by column under the single lane', () => {
			const board = makeBoard({ cards: CARDS });
			const grouped = groupCards(board);
			const colMap = grouped.get('')!;
			expect(colMap.get('todo')?.length).toBe(2);
			expect(colMap.get('doing')?.length).toBe(2);
			expect(colMap.get('done')?.length).toBe(1);
		});

		it('creates empty arrays for columns with no cards', () => {
			const board = makeBoard({ cards: [] });
			const colMap = groupCards(board).get('')!;
			expect(colMap.get('todo')).toEqual([]);
		});
	});

	describe('with lanes', () => {
		const laneBoard = (cards = CARDS) => makeBoard({
			cards,
			viewConfig: { columns: 'status', lanes: 'assignee' },
		});

		it('returns one outer key per lane option', () => {
			const grouped = groupCards(laneBoard());
			expect([...grouped.keys()]).toEqual(['roberto', 'teacher']);
		});

		it('places cards in the correct lane × column cell', () => {
			const grouped = groupCards(laneBoard());
			expect(grouped.get('roberto')?.get('todo')?.map(c => c.id)).toEqual(['c1']);
			expect(grouped.get('roberto')?.get('doing')?.map(c => c.id)).toEqual(['c2']);
			expect(grouped.get('teacher')?.get('todo')?.map(c => c.id)).toEqual(['c3']);
			expect(grouped.get('teacher')?.get('done')?.map(c => c.id)).toEqual(['c4']);
			expect(grouped.get('teacher')?.get('doing')?.map(c => c.id)).toEqual(['c5']);
		});

		it('cells with no matching cards contain an empty array', () => {
			const grouped = groupCards(laneBoard());
			expect(grouped.get('roberto')?.get('done')).toEqual([]);
		});

		it('card with unrecognised lane value falls into first lane', () => {
			const cards = [{ id: 'cx', values: { status: 'todo', assignee: 'unknown' } }];
			const grouped = groupCards(laneBoard(cards));
			expect(grouped.get('roberto')?.get('todo')?.map(c => c.id)).toContain('cx');
		});

		it('card with unrecognised column value falls into first column', () => {
			const cards = [{ id: 'cx', values: { status: 'unknown', assignee: 'roberto' } }];
			const grouped = groupCards(laneBoard(cards));
			expect(grouped.get('roberto')?.get('todo')?.map(c => c.id)).toContain('cx');
		});

		it('preserves column order from field options', () => {
			const grouped = groupCards(laneBoard());
			expect([...grouped.get('roberto')!.keys()]).toEqual(['todo', 'doing', 'done']);
		});
	});
});
