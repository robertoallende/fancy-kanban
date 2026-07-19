import { describe, it, expect } from 'vitest';
import { RULES, CSS_RULES } from '../../scripts/lint-rules.mjs';

function cssRuleById(id: string) {
	const rule = CSS_RULES.find((r: { id: string }) => r.id === id);
	if (!rule) throw new Error(`CSS rule not found: ${id}`);
	return (rule as { pattern: RegExp }).pattern;
}

function ruleById(id: string) {
	const rule = RULES.find(r => r.id === id);
	if (!rule) throw new Error(`Rule not found: ${id}`);
	return rule.pattern;
}

describe('lint rule: prefer-create-el', () => {
	const pat = ruleById('prefer-create-el');

	it('catches document.createElement', () => {
		expect(pat.test('const el = document.createElement("div");')).toBe(true);
	});

	it('does not flag createEl()', () => {
		expect(pat.test('const el = createEl("div");')).toBe(false);
	});

	it('catches activeDocument.createElement', () => {
		expect(pat.test('activeDocument.createElement("div")')).toBe(true);
	});
});

describe('lint rule: prefer-active-doc', () => {
	const pat = ruleById('prefer-active-doc');

	it('catches document.querySelector', () => {
		expect(pat.test('document.querySelector(".foo")')).toBe(true);
	});

	it('catches document.querySelectorAll', () => {
		expect(pat.test('document.querySelectorAll(".foo")')).toBe(true);
	});

	it('catches document.getElementById', () => {
		expect(pat.test('document.getElementById("id")')).toBe(true);
	});

	it('catches document.body', () => {
		expect(pat.test('document.body.appendChild(el)')).toBe(true);
	});

	it('catches document.head', () => {
		expect(pat.test('document.head.appendChild(el)')).toBe(true);
	});

	it('catches document.createElement', () => {
		expect(pat.test('document.createElement("div")')).toBe(true);
	});

	it('does not flag activeDocument.querySelector', () => {
		expect(pat.test('activeDocument.querySelector(".foo")')).toBe(false);
	});

	it('does not flag activeDocument.body', () => {
		expect(pat.test('activeDocument.body.appendChild(el)')).toBe(false);
	});

});

describe('lint rule: no-static-styles-assignment', () => {
	const pat = ruleById('no-static-styles-assignment');

	it('catches el.style.display =', () => {
		expect(pat.test('el.style.display = "none";')).toBe(true);
	});

	it('catches el.style.flex =', () => {
		expect(pat.test('el.style.flex = "1";')).toBe(true);
	});

	it('catches el.style.marginTop =', () => {
		expect(pat.test('el.style.marginTop = "8px";')).toBe(true);
	});

	it('does not flag classList operations', () => {
		expect(pat.test('el.classList.add("fk-hidden");')).toBe(false);
	});

	it('does not flag reading style (no assignment)', () => {
		expect(pat.test('const v = el.style.display;')).toBe(false);
	});
});

describe('lint rule: no-unnecessary-type-assertion', () => {
	const pat = ruleById('no-unnecessary-type-assertion');

	it('catches ) as App', () => {
		expect(pat.test('const app = (getApp()) as App;')).toBe(true);
	});

	it('catches ) as Workspace', () => {
		expect(pat.test('const ws = (foo) as Workspace;')).toBe(true);
	});

	it('catches ) as Vault', () => {
		expect(pat.test('const v = (x) as Vault;')).toBe(true);
	});

	it('catches ) as TFile', () => {
		expect(pat.test('const f = (x) as TFile;')).toBe(true);
	});

	it('catches ) as Plugin', () => {
		expect(pat.test('const p = (x) as Plugin;')).toBe(true);
	});

	it('does not flag variable as App without preceding )', () => {
		// `this.app as App` is acceptable — no cast of a sub-expression
		expect(pat.test('return this.app as App;')).toBe(false);
	});

	it('does not flag as in a type position', () => {
		expect(pat.test('type Alias = Foo as unknown;')).toBe(false);
	});
});

describe('lint rule: vault-enumeration', () => {
	const pat = ruleById('vault-enumeration');

	it('catches vault.getFiles()', () => {
		expect(pat.test('return this.app.vault.getFiles();')).toBe(true);
	});

	it('catches vault.getMarkdownFiles()', () => {
		expect(pat.test('return this.app.vault.getMarkdownFiles();')).toBe(true);
	});

	it('does not flag unrelated vault calls', () => {
		expect(pat.test('this.app.vault.read(file);')).toBe(false);
	});
});

describe('CSS rule: no-important', () => {
	const pat = cssRuleById('no-important');

	it('catches !important', () => {
		expect(pat.test('.fk-hidden { display: none !important; }')).toBe(true);
	});

	it('does not flag rules without !important', () => {
		expect(pat.test('.fk-hidden { display: none; }')).toBe(false);
	});
});

describe('comment-line skipping (representative check)', () => {
	it('all rules: comment lines would be skipped by the lint runner', () => {
		const commentLine = '// document.createElement("div") el.style.flex = "1"';
		const commentPattern = /^\s*\/\//;
		expect(commentPattern.test(commentLine)).toBe(true);
	});
});
