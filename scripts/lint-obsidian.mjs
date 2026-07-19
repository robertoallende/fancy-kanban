/**
 * Lightweight lint check for Obsidian plugin violations.
 * Catches the four categories flagged by the Obsidian plugin reviewer:
 *   1. prefer-create-el      — no document.createElement / activeDocument.createElement
 *   2. no-static-styles-assignment — no el.style.property = value
 *   3. prefer-active-doc     — no document.querySelector / document.body etc.
 *   4. no-unnecessary-type-assertion — no `foo as Bar` casts for App/Workspace/etc.
 *
 * Works with any TypeScript version by using plain text pattern matching.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

// ── Rules ─────────────────────────────────────────────────────────────────────

const RULES = [
	{
		id: 'prefer-create-el',
		pattern: /\bdocument\.createElement\b/,
		message: 'Use createEl() instead of document.createElement()',
	},
	{
		id: 'prefer-active-doc',
		// Match `document.` accesses that are NOT `activeDocument`
		pattern: /(?<![.\w])document\.(querySelector|querySelectorAll|getElementById|body|head|createElement)\b/,
		message: 'Use activeDocument instead of document',
	},
	{
		id: 'no-static-styles-assignment',
		// el.style.someProperty = ... (direct property assignment on .style)
		pattern: /\.style\.[a-zA-Z]+\s*=/,
		message: 'Avoid direct .style property assignment; use CSS classes instead',
	},
	{
		id: 'no-unnecessary-type-assertion',
		// Casts like `foo as App`, `this.app as SomeType` in non-type contexts
		// Narrowed: only flag `) as ` or `variable as ObsidianType`
		pattern: /\) as (App|Workspace|Vault|TFile|TFolder|Plugin)\b/,
		message: 'Avoid unnecessary type assertion; use proper typing instead',
	},
];

// ── File walker ───────────────────────────────────────────────────────────────

function walk(dir) {
	const result = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			result.push(...walk(full));
		} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			result.push(full);
		}
	}
	return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

let violations = 0;

for (const file of walk(SRC)) {
	const rel = relative(ROOT, file);
	const lines = readFileSync(file, 'utf8').split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Skip comment lines
		if (/^\s*\/\//.test(line)) continue;

		for (const rule of RULES) {
			if (rule.pattern.test(line)) {
				console.error(`${rel}:${i + 1}: [${rule.id}] ${rule.message}`);
				console.error(`  ${line.trim()}`);
				violations++;
			}
		}
	}
}

if (violations > 0) {
	console.error(`\n${violations} violation(s) found.`);
	process.exit(1);
} else {
	console.log('No Obsidian lint violations found.');
}
