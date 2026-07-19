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
import { RULES } from './lint-rules.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

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
