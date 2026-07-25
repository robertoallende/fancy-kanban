import { describe, it, expect } from 'vitest';
import { parseKanbanBoard } from '../../src/import/kanban-parser';

const MINIMAL = `---
kanban-plugin: board
---

## To Do

- [ ] First task

## Done

`;

const FULL = `---
kanban-plugin: board
---

## Backlog

- [ ] Research competitors @{2026-01-20} #research
- [ ] Write design doc [[Design Brief]]
- [ ] Set up CI/CD @@{14:00}

## In Progress (3)

- [ ] Fix navigation bug
    Additional notes on the second line
    Second continuation line

## Done

**Complete**

- [x] Project kickoff @{2026-01-10} ^block-id-1
- [x] Implement login flow

***

## Archive

- [x] Old completed task

%% kanban:settings
\`\`\`
{"kanban-plugin":"board"}
\`\`\`
%%
`;

describe('parseKanbanBoard', () => {
	describe('validation', () => {
		it('throws if kanban-plugin frontmatter key is absent', () => {
			expect(() => parseKanbanBoard('# Just a note\n\nSome content')).toThrow();
		});

		it('throws if kanban-plugin value is not board or basic', () => {
			expect(() => parseKanbanBoard('---\nkanban-plugin: other\n---\n')).toThrow();
		});

		it('accepts kanban-plugin: basic', () => {
			const text = '---\nkanban-plugin: basic\n---\n\n## Lane\n\n- [ ] task\n';
			expect(() => parseKanbanBoard(text)).not.toThrow();
		});
	});

	describe('lanes', () => {
		it('parses lane titles from ## headings', () => {
			const board = parseKanbanBoard(MINIMAL);
			expect(board.lanes.map(l => l.title)).toEqual(['To Do', 'Done']);
		});

		it('strips WIP limit from lane title', () => {
			const board = parseKanbanBoard(FULL);
			const lane = board.lanes.find(l => l.title === 'In Progress');
			expect(lane).toBeDefined();
		});

		it('does not include Archive as a lane', () => {
			const board = parseKanbanBoard(FULL);
			expect(board.lanes.map(l => l.title)).not.toContain('Archive');
		});

		it('detects **Complete** marker on a lane', () => {
			const board = parseKanbanBoard(FULL);
			const done = board.lanes.find(l => l.title === 'Done');
			expect(done?.complete).toBe(true);
		});

		it('lanes without **Complete** have complete: false', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog');
			expect(backlog?.complete).toBe(false);
		});
	});

	describe('cards', () => {
		it('parses unchecked cards', () => {
			const board = parseKanbanBoard(MINIMAL);
			expect(board.lanes[0].cards[0].checked).toBe(false);
		});

		it('parses checked cards', () => {
			const board = parseKanbanBoard(FULL);
			const done = board.lanes.find(l => l.title === 'Done')!;
			expect(done.cards.every(c => c.checked)).toBe(true);
		});

		it('assigns cards to the correct lane', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards.length).toBe(3);
		});

		it('does not import archive cards', () => {
			const board = parseKanbanBoard(FULL);
			const total = board.lanes.reduce((n, l) => n + l.cards.length, 0);
			expect(total).toBe(6);
		});
	});

	describe('metadata stripping', () => {
		it('strips date triggers @{…} from card title', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards[0].title).not.toContain('@{');
		});

		it('strips time triggers @@{…} from card title', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards[2].title).not.toContain('@@{');
		});

		it('strips hashtags from card title', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards[0].title).not.toContain('#research');
		});

		it('strips wikilinks from card title', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards[1].title).not.toContain('[[');
		});

		it('strips block IDs from card title', () => {
			const board = parseKanbanBoard(FULL);
			const done = board.lanes.find(l => l.title === 'Done')!;
			expect(done.cards[0].title).not.toContain('^block-id-1');
		});

		it('preserves the meaningful text after stripping', () => {
			const board = parseKanbanBoard(FULL);
			const backlog = board.lanes.find(l => l.title === 'Backlog')!;
			expect(backlog.cards[0].title).toBe('Research competitors');
		});
	});

	describe('multi-line cards', () => {
		it('collects indented continuation lines into body', () => {
			const board = parseKanbanBoard(FULL);
			const inProgress = board.lanes.find(l => l.title === 'In Progress')!;
			expect(inProgress.cards[0].body).toContain('Additional notes on the second line');
		});

		it('joins multiple continuation lines with newline', () => {
			const board = parseKanbanBoard(FULL);
			const inProgress = board.lanes.find(l => l.title === 'In Progress')!;
			expect(inProgress.cards[0].body).toContain('Second continuation line');
		});

		it('cards without continuation have empty body', () => {
			const board = parseKanbanBoard(MINIMAL);
			expect(board.lanes[0].cards[0].body).toBe('');
		});
	});

	describe('settings block', () => {
		it('ignores the %% kanban:settings %% block', () => {
			const board = parseKanbanBoard(FULL);
			const total = board.lanes.reduce((n, l) => n + l.cards.length, 0);
			expect(total).toBeGreaterThan(0);
		});
	});
});
