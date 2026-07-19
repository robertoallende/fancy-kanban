import { describe, it, expect } from 'vitest';
import { splitLinks, joinLinks, validateLinkItem } from '../../src/data/link';
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

describe('validateLinkItem', () => {
	describe('valid vault paths', () => {
		it('accepts a simple filename', () => {
			expect(validateLinkItem('file.md').valid).toBe(true);
		});

		it('accepts a vault-relative path', () => {
			expect(validateLinkItem('notes/doc.pdf').valid).toBe(true);
		});

		it('accepts a nested path', () => {
			expect(validateLinkItem('folder/sub/file.md').valid).toBe(true);
		});

		it('accepts a path with leading ./', () => {
			expect(validateLinkItem('./relative.md').valid).toBe(true);
		});
	});

	describe('valid external URIs', () => {
		it('accepts https://', () => {
			expect(validateLinkItem('https://example.com').valid).toBe(true);
		});

		it('accepts https:// with path and query', () => {
			expect(validateLinkItem('https://example.com/path?q=1').valid).toBe(true);
		});

		it('accepts http://', () => {
			expect(validateLinkItem('http://localhost:3000').valid).toBe(true);
		});

		it('accepts ftp://', () => {
			expect(validateLinkItem('ftp://files.example.com/doc.pdf').valid).toBe(true);
		});

		it('accepts a simple mailto', () => {
			expect(validateLinkItem('mailto:user@example.com').valid).toBe(true);
		});

		it('accepts a complex mailto', () => {
			expect(validateLinkItem('mailto:user.name+tag@sub.example.co.uk').valid).toBe(true);
		});
	});

	describe('rejected: absolute paths', () => {
		it('rejects Unix absolute path', () => {
			const r = validateLinkItem('/absolute/path');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('leading /');
		});

		it('rejects Windows absolute path with backslash', () => {
			const r = validateLinkItem('C:\\Windows\\file.txt');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('drive letter');
		});

		it('rejects Windows absolute path with forward slash', () => {
			const r = validateLinkItem('C:/Windows/file.txt');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('drive letter');
		});

		it('rejects home-relative path', () => {
			const r = validateLinkItem('~/home/path');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('~');
		});
	});

	describe('rejected: bad URIs', () => {
		it('rejects file:// protocol', () => {
			const r = validateLinkItem('file:///etc/passwd');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('https, http, or ftp');
		});

		it('rejects unknown protocol', () => {
			const r = validateLinkItem('ftp2://example.com');
			expect(r.valid).toBe(false);
		});

		it('rejects https:// with no host', () => {
			const r = validateLinkItem('https://');
			expect(r.valid).toBe(false);
		});

		it('rejects mailto without valid email', () => {
			const r = validateLinkItem('mailto:notanemail');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('email');
		});

		it('rejects mailto with no local part', () => {
			const r = validateLinkItem('mailto:@example.com');
			expect(r.valid).toBe(false);
		});
	});

	describe('rejected: empty', () => {
		it('rejects empty string', () => {
			const r = validateLinkItem('');
			expect(r.valid).toBe(false);
			expect(r.error).toContain('Enter');
		});

		it('rejects whitespace-only string', () => {
			const r = validateLinkItem('   ');
			expect(r.valid).toBe(false);
		});
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
