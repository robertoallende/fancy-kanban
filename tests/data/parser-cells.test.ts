import { describe, it, expect } from 'vitest';
import { splitRow, unescapeCell } from '../../src/data/parser';

describe('splitRow', () => {
	it('splits a standard row on pipes', () => {
		expect(splitRow('| a | b | c |')).toEqual([' a ', ' b ', ' c ']);
	});

	it('does not split on an escaped pipe inside a value', () => {
		expect(splitRow('| a\\|b | c |')).toEqual([' a\\|b ', ' c ']);
	});

	it('handles multiple escaped pipes in one cell', () => {
		expect(splitRow('| a\\|b\\|c | d |')).toEqual([' a\\|b\\|c ', ' d ']);
	});

	it('returns empty string for an empty cell', () => {
		expect(splitRow('| a |  | c |')).toEqual([' a ', '  ', ' c ']);
	});

	it('does not include the leading and trailing pipe delimiters', () => {
		const cells = splitRow('| x |');
		expect(cells).toHaveLength(1);
		expect(cells[0]).toBe(' x ');
	});

	it('handles a row with a single cell', () => {
		expect(splitRow('| only |')).toEqual([' only ']);
	});

	it('preserves whitespace around cell values', () => {
		expect(splitRow('|  spaced  | val |')).toEqual(['  spaced  ', ' val ']);
	});
});

describe('unescapeCell', () => {
	it('unescapes \\| to |', () => {
		expect(unescapeCell('a\\|b')).toBe('a|b');
	});

	it('unescapes <br> to newline', () => {
		expect(unescapeCell('line1<br>line2')).toBe('line1\nline2');
	});

	it('unescapes both in the same value', () => {
		expect(unescapeCell('a\\|b<br>c')).toBe('a|b\nc');
	});

	it('unescapes multiple <br> to multiple newlines', () => {
		expect(unescapeCell('a<br>b<br>c')).toBe('a\nb\nc');
	});

	it('unescapes multiple \\| in one value', () => {
		expect(unescapeCell('a\\|b\\|c')).toBe('a|b|c');
	});

	it('returns value unchanged when no escape sequences present', () => {
		expect(unescapeCell('hello world')).toBe('hello world');
	});

	it('trims leading and trailing whitespace', () => {
		expect(unescapeCell('  hello  ')).toBe('hello');
	});

	it('returns empty string for an empty input', () => {
		expect(unescapeCell('')).toBe('');
	});

	it('trims whitespace after unescaping', () => {
		expect(unescapeCell('  a\\|b  ')).toBe('a|b');
	});
});
