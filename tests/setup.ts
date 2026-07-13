// Mirror Obsidian's activeDocument global so render code works in jsdom
if (typeof document !== 'undefined') {
	Object.assign(globalThis, { activeDocument: document });
}
