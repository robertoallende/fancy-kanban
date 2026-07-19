// Mirror Obsidian's activeDocument global so render code works in jsdom
if (typeof document !== 'undefined') {
	Object.assign(globalThis, { activeDocument: document });
}

type CreateElOptions = {
	cls?: string | string[];
	text?: string;
	type?: string;
	value?: string;
	placeholder?: string;
	attr?: Record<string, string>;
};

function createElImpl<K extends keyof HTMLElementTagNameMap>(
	this: HTMLElement,
	tag: K,
	opts?: CreateElOptions,
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
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
	this.appendChild(el);
	return el;
}

function createDivImpl(this: HTMLElement, opts?: CreateElOptions): HTMLDivElement {
	return createElImpl.call(this, 'div', opts) as HTMLDivElement;
}

function createSpanImpl(this: HTMLElement, opts?: CreateElOptions): HTMLSpanElement {
	return createElImpl.call(this, 'span', opts) as HTMLSpanElement;
}

// Add Obsidian DOM helpers as methods on all HTMLElement instances
if (typeof HTMLElement !== 'undefined') {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(HTMLElement.prototype as any).createEl = createElImpl;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(HTMLElement.prototype as any).createDiv = createDivImpl;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(HTMLElement.prototype as any).createSpan = createSpanImpl;
}

// Mirror Obsidian's standalone createEl global (creates without appending)
Object.assign(globalThis, {
	createEl<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		opts?: CreateElOptions,
	): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
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
		return el;
	},
	createDiv(opts?: CreateElOptions): HTMLDivElement {
		const el = document.createElement('div');
		if (opts?.cls) {
			const classes = Array.isArray(opts.cls) ? opts.cls : [opts.cls];
			el.classList.add(...classes);
		}
		if (opts?.text !== undefined) el.textContent = opts.text;
		return el;
	},
	createSpan(opts?: CreateElOptions): HTMLSpanElement {
		const el = document.createElement('span');
		if (opts?.cls) {
			const classes = Array.isArray(opts.cls) ? opts.cls : [opts.cls];
			el.classList.add(...classes);
		}
		if (opts?.text !== undefined) el.textContent = opts.text;
		return el;
	},
});
