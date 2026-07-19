// Mirror Obsidian's activeDocument global for popout window compatibility
Object.assign(globalThis, { activeDocument: document });

export class WorkspaceLeaf {}

class ObsidianHTMLElement extends HTMLElement {
	empty(): void { this.innerHTML = ''; }
	createEl<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		attrs?: { cls?: string; text?: string },
	): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		if (attrs?.cls) el.className = attrs.cls;
		if (attrs?.text) el.textContent = attrs.text;
		this.appendChild(el);
		return el;
	}
}

customElements.define('obsidian-content-el', ObsidianHTMLElement);

export class ItemView {
	contentEl: ObsidianHTMLElement = new ObsidianHTMLElement();
	app: unknown = {};
	leaf: unknown;
	constructor(leaf: unknown) { this.leaf = leaf; }
	registerEvent(_e: unknown): void {}
}

export class Modal {
	contentEl: ObsidianHTMLElement = new ObsidianHTMLElement();
	titleEl: HTMLElement = document.createElement('div');
	app: unknown;
	constructor(app: unknown) { this.app = app; }
	open(): void { this.onOpen(); }
	close(): void { this.onClose(); }
	onOpen(): void {}
	onClose(): void {}
}

export class Plugin {}
export class TFile { path = ''; }
export class Notice { constructor(_msg: string) {} }

export class FuzzySuggestModal<T> {
	app: unknown;
	constructor(app: unknown) { this.app = app; }
	open(): void {}
	close(): void {}
	getItems(): T[] { return []; }
	getItemText(_item: T): string { return ''; }
	onChooseItem(_item: T): void {}
}
