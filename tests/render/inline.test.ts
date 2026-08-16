// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderInline } from '../../src/render/inline';

function render(text: string): HTMLSpanElement {
	const el = document.createElement('span');
	renderInline(text, el);
	return el;
}

describe('renderInline — bold', () => {
	it('wraps **text** in <strong>', () => {
		const el = render('**bold**');
		expect(el.querySelector('strong')?.textContent).toBe('bold');
	});

	it('leaves surrounding text as text nodes', () => {
		const el = render('before **bold** after');
		expect(el.childNodes[0].textContent).toBe('before ');
		expect(el.querySelector('strong')?.textContent).toBe('bold');
		expect(el.childNodes[2].textContent).toBe(' after');
	});

	it('unmatched ** renders as literal text', () => {
		const el = render('not **closed');
		expect(el.querySelector('strong')).toBeNull();
		expect(el.textContent).toBe('not **closed');
	});
});

describe('renderInline — italic', () => {
	it('wraps *text* in <em>', () => {
		const el = render('*italic*');
		expect(el.querySelector('em')?.textContent).toBe('italic');
	});

	it('unmatched * renders as literal text', () => {
		const el = render('not *closed');
		expect(el.querySelector('em')).toBeNull();
		expect(el.textContent).toBe('not *closed');
	});
});

describe('renderInline — strikethrough', () => {
	it('wraps ~~text~~ in <del>', () => {
		const el = render('~~strike~~');
		expect(el.querySelector('del')?.textContent).toBe('strike');
	});
});

describe('renderInline — code', () => {
	it('wraps `text` in <code>', () => {
		const el = render('`code`');
		expect(el.querySelector('code')?.textContent).toBe('code');
	});
});

describe('renderInline — mixed tokens', () => {
	it('handles bold followed by italic', () => {
		const el = render('**bold** and *italic*');
		expect(el.querySelector('strong')?.textContent).toBe('bold');
		expect(el.querySelector('em')?.textContent).toBe('italic');
	});

	it('handles adjacent tokens without gap', () => {
		const el = render('**a**`b`');
		expect(el.querySelector('strong')?.textContent).toBe('a');
		expect(el.querySelector('code')?.textContent).toBe('b');
	});

	it('handles all four token types in one string', () => {
		const el = render('**b** *i* ~~s~~ `c`');
		expect(el.querySelector('strong')?.textContent).toBe('b');
		expect(el.querySelector('em')?.textContent).toBe('i');
		expect(el.querySelector('del')?.textContent).toBe('s');
		expect(el.querySelector('code')?.textContent).toBe('c');
	});
});

describe('renderInline — edge cases', () => {
	it('empty string appends nothing', () => {
		const el = render('');
		expect(el.childNodes.length).toBe(0);
	});

	it('plain text produces a single text node', () => {
		const el = render('just text');
		expect(el.childNodes.length).toBe(1);
		expect(el.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
		expect(el.textContent).toBe('just text');
	});

	it('renders the same input correctly on repeated calls (no regex state leak)', () => {
		const a = render('**bold**');
		const b = render('**bold**');
		expect(a.querySelector('strong')?.textContent).toBe('bold');
		expect(b.querySelector('strong')?.textContent).toBe('bold');
	});
});
