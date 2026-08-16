// Mirror Obsidian's activeDocument global for popout window compatibility
Object.assign(globalThis, { activeDocument: document });

export class WorkspaceLeaf {}

type ElOpts = { cls?: string | string[]; text?: string; type?: string; value?: string; placeholder?: string; attr?: Record<string, string> };

function applyOpts(el: HTMLElement, opts?: ElOpts): void {
	if (opts?.cls) {
		const classes = Array.isArray(opts.cls) ? opts.cls : [opts.cls];
		el.classList.add(...classes);
	}
	if (opts?.text !== undefined) el.textContent = opts.text;
	if (opts?.type !== undefined) (el as HTMLInputElement).type = opts.type;
	if (opts?.value !== undefined) (el as HTMLInputElement).value = opts.value;
	if (opts?.placeholder !== undefined) (el as HTMLInputElement).placeholder = opts.placeholder;
	if (opts?.attr) {
		for (const [k, v] of Object.entries(opts.attr)) el.setAttribute(k, v);
	}
}

function enhanceEl<T extends HTMLElement>(el: T, parent: HTMLElement): T {
	(el as unknown as ObsidianHTMLElement & T).empty = function() { this.innerHTML = ''; };
	(el as unknown as ObsidianHTMLElement & T).createEl = function<K extends keyof HTMLElementTagNameMap>(tag: K, o?: ElOpts) {
		const child = document.createElement(tag);
		applyOpts(child, o);
		this.appendChild(child);
		return enhanceEl(child, this);
	};
	(el as unknown as ObsidianHTMLElement & T).createDiv = function(o?: ElOpts) { return this.createEl('div', o) as unknown as HTMLDivElement; };
	(el as unknown as ObsidianHTMLElement & T).createSpan = function(o?: ElOpts) { return this.createEl('span', o) as unknown as HTMLSpanElement; };
	parent.appendChild(el);
	return el;
}

class ObsidianHTMLElement extends HTMLElement {
	empty(): void { this.innerHTML = ''; }
	createEl<K extends keyof HTMLElementTagNameMap>(tag: K, opts?: ElOpts): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		applyOpts(el, opts);
		this.appendChild(el);
		return enhanceEl(el, this);
	}
	createDiv(opts?: ElOpts): HTMLDivElement { return this.createEl('div', opts); }
	createSpan(opts?: ElOpts): HTMLSpanElement { return this.createEl('span', opts); }
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

export class MarkdownRenderChild {
	constructor(public containerEl: HTMLElement) {}
	onload(): void {}
	onunload(): void {}
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
