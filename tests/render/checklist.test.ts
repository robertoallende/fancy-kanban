import { describe, it, expect } from 'vitest';
import { parseChecklistValue, toggleCheckboxLine } from '../../src/render/card';

describe('parseChecklistValue', () => {
	it('parses an unchecked checkbox line', () => {
		const result = parseChecklistValue('- [ ] task');
		expect(result).toEqual([{ kind: 'checkbox', checked: false, text: 'task' }]);
	});

	it('parses a checked checkbox line', () => {
		const result = parseChecklistValue('- [x] done');
		expect(result).toEqual([{ kind: 'checkbox', checked: true, text: 'done' }]);
	});

	it('parses a plain text line', () => {
		const result = parseChecklistValue('plain text');
		expect(result).toEqual([{ kind: 'text', text: 'plain text' }]);
	});

	it('parses mixed checkbox and plain-text lines in order', () => {
		const result = parseChecklistValue('- [ ] first\nsome notes\n- [x] second');
		expect(result).toEqual([
			{ kind: 'checkbox', checked: false, text: 'first' },
			{ kind: 'text', text: 'some notes' },
			{ kind: 'checkbox', checked: true, text: 'second' },
		]);
	});

	it('parses an empty string as a single text line', () => {
		const result = parseChecklistValue('');
		expect(result).toEqual([{ kind: 'text', text: '' }]);
	});

	it('preserves item text exactly including leading spaces', () => {
		const result = parseChecklistValue('- [ ]   spaced text');
		expect(result[0]).toEqual({ kind: 'checkbox', checked: false, text: '  spaced text' });
	});

	it('does not match a line missing the space after the bracket', () => {
		const result = parseChecklistValue('- [] task');
		expect(result[0].kind).toBe('text');
	});

	it('does not match a line with uppercase X', () => {
		const result = parseChecklistValue('- [X] task');
		expect(result[0].kind).toBe('text');
	});
});

describe('toggleCheckboxLine', () => {
	it('toggles an unchecked line to checked', () => {
		const result = toggleCheckboxLine('- [ ] task', 0, true);
		expect(result).toBe('- [x] task');
	});

	it('toggles a checked line to unchecked', () => {
		const result = toggleCheckboxLine('- [x] task', 0, false);
		expect(result).toBe('- [ ] task');
	});

	it('only changes the targeted line index', () => {
		const value = '- [ ] first\n- [ ] second\n- [x] third';
		const result = toggleCheckboxLine(value, 1, true);
		expect(result).toBe('- [ ] first\n- [x] second\n- [x] third');
	});

	it('leaves a non-checkbox line at the target index unchanged', () => {
		const value = 'plain text\n- [ ] task';
		const result = toggleCheckboxLine(value, 0, true);
		expect(result).toBe('plain text\n- [ ] task');
	});

	it('returns the value unchanged when line index is out of bounds', () => {
		const value = '- [ ] task';
		const result = toggleCheckboxLine(value, 5, true);
		expect(result).toBe('- [ ] task');
	});

	it('preserves all other lines when toggling', () => {
		const value = 'notes\n- [ ] item\nmore notes';
		const result = toggleCheckboxLine(value, 1, true);
		expect(result).toBe('notes\n- [x] item\nmore notes');
	});
});
