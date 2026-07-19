import { describe, it, expect } from 'vitest';
import { splitLinks, joinLinks } from '../../src/data/link';
import { escapeCell } from '../../src/data/serializer';
import { unescapeCell } from '../../src/data/parser';

describe('splitLinks', () => {
	it('returns empty array for empty string', () => {
		expect(splitLinks('')).toEqual([]);
	});

	it('returns single item for a value with no newline', () => {
		expect(splitLinks('notes/doc.pdf')).toEqual(['notes/doc.pdf']);
	});

	it('returns two items for a newline-delimited value', () => {
		expect(splitLinks('notes/doc.pdf\nhttps://example.com')).toEqual([
			'notes/doc.pdf',
			'https://example.com',
		]);
	});

	it('returns three items for two newline delimiters', () => {
		expect(splitLinks('a\nb\nc')).toEqual(['a', 'b', 'c']);
	});

	it('filters out empty entries from leading newline', () => {
		expect(splitLinks('\nnotes/doc.pdf')).toEqual(['notes/doc.pdf']);
	});

	it('filters out empty entries from trailing newline', () => {
		expect(splitLinks('notes/doc.pdf\n')).toEqual(['notes/doc.pdf']);
	});

	it('preserves whitespace within a value', () => {
		expect(splitLinks('notes/my doc.pdf')).toEqual(['notes/my doc.pdf']);
	});
});

describe('joinLinks', () => {
	it('returns empty string for empty array', () => {
		expect(joinLinks([])).toBe('');
	});

	it('returns the item unchanged for a single-item array', () => {
		expect(joinLinks(['notes/doc.pdf'])).toBe('notes/doc.pdf');
	});

	it('joins two items with a newline', () => {
		expect(joinLinks(['notes/doc.pdf', 'https://example.com'])).toBe(
			'notes/doc.pdf\nhttps://example.com'
		);
	});

	it('round-trips through splitLinks', () => {
		const original = 'notes/doc.pdf\nhttps://example.com\nftp://files.example.com';
		expect(joinLinks(splitLinks(original))).toBe(original);
	});

	it('round-trips a single value unchanged', () => {
		expect(joinLinks(splitLinks('notes/doc.pdf'))).toBe('notes/doc.pdf');
	});
});

describe('serializer round-trip', () => {
	it('newline delimiter survives escapeCell / unescapeCell', () => {
		const value = joinLinks(['notes/doc.pdf', 'https://example.com']);
		const escaped = escapeCell(value);
		expect(escaped).toBe('notes/doc.pdf<br>https://example.com');
		const unescaped = unescapeCell(escaped);
		expect(splitLinks(unescaped)).toEqual(['notes/doc.pdf', 'https://example.com']);
	});
});
