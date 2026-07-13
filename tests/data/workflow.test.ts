import { describe, it, expect } from 'vitest';
import { parseWorkflow, isTransitionAllowed } from '../../src/data/workflow';

const STATUS_OPTIONS = ['inbox', 'doing', 'done'];
const FULL_WORKFLOW  = 'inbox→doing, inbox→done, doing→done, doing→inbox, done→doing, done→inbox';

describe('parseWorkflow', () => {
	it('parses a full workflow string into an adjacency map', () => {
		const map = parseWorkflow(FULL_WORKFLOW, STATUS_OPTIONS);
		expect(map.get('inbox')).toEqual(new Set(['doing', 'done']));
		expect(map.get('doing')).toEqual(new Set(['done', 'inbox']));
		expect(map.get('done')).toEqual(new Set(['doing', 'inbox']));
	});

	it('parses extra whitespace around arrows and commas', () => {
		const map = parseWorkflow('inbox → doing ,  doing → done', STATUS_OPTIONS);
		expect(map.get('inbox')).toEqual(new Set(['doing']));
		expect(map.get('doing')).toEqual(new Set(['done']));
	});

	it('parses a single transition', () => {
		const map = parseWorkflow('inbox→doing', STATUS_OPTIONS);
		expect(map.get('inbox')).toEqual(new Set(['doing']));
		expect(map.get('doing')).toBeUndefined();
	});

	it('returns all-allowed map when workflow string is empty', () => {
		const map = parseWorkflow('', STATUS_OPTIONS);
		expect(map.get('inbox')).toEqual(new Set(['doing', 'done']));
		expect(map.get('doing')).toEqual(new Set(['inbox', 'done']));
		expect(map.get('done')).toEqual(new Set(['inbox', 'doing']));
	});

	it('returns all-allowed map when workflow string is absent (undefined)', () => {
		const map = parseWorkflow(undefined, STATUS_OPTIONS);
		expect(map.get('inbox')).toEqual(new Set(['doing', 'done']));
	});

	it('handles status values containing spaces', () => {
		const map = parseWorkflow('in progress→done', ['in progress', 'done']);
		expect(map.get('in progress')).toEqual(new Set(['done']));
	});

	it('treats declared transitions as one-directional only', () => {
		const map = parseWorkflow('done→doing', STATUS_OPTIONS);
		expect(map.get('done')).toEqual(new Set(['doing']));
		expect(map.get('doing')).toBeUndefined();
	});

	it('handles a status with no outgoing transitions declared', () => {
		const map = parseWorkflow('inbox→doing', STATUS_OPTIONS);
		expect(map.get('done')).toBeUndefined();
	});
});

describe('isTransitionAllowed', () => {
	const map = parseWorkflow(FULL_WORKFLOW, STATUS_OPTIONS);

	it('returns true for a declared transition', () => {
		expect(isTransitionAllowed(map, 'inbox', 'doing')).toBe(true);
	});

	it('returns false for an undeclared transition', () => {
		const restrictedMap = parseWorkflow('inbox→doing', STATUS_OPTIONS);
		expect(isTransitionAllowed(restrictedMap, 'inbox', 'done')).toBe(false);
	});

	it('returns true for any transition when no workflow was declared', () => {
		const openMap = parseWorkflow('', STATUS_OPTIONS);
		expect(isTransitionAllowed(openMap, 'inbox', 'done')).toBe(true);
		expect(isTransitionAllowed(openMap, 'done', 'inbox')).toBe(true);
	});

	it('returns false for a self-transition regardless of workflow', () => {
		expect(isTransitionAllowed(map, 'inbox', 'inbox')).toBe(false);
	});

	it('returns false for self-transition even when no workflow declared', () => {
		const openMap = parseWorkflow('', STATUS_OPTIONS);
		expect(isTransitionAllowed(openMap, 'doing', 'doing')).toBe(false);
	});

	it('is case-sensitive — mismatched case returns false', () => {
		expect(isTransitionAllowed(map, 'Inbox', 'doing')).toBe(false);
		expect(isTransitionAllowed(map, 'inbox', 'Doing')).toBe(false);
	});

	it('returns false for unknown status values not in the map', () => {
		expect(isTransitionAllowed(map, 'unknown', 'doing')).toBe(false);
	});
});
