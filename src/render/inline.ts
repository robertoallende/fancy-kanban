const INLINE_TOKEN = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`([^`]+)`)/g;

export function renderInline(text: string, container: HTMLElement): void {
	let last = 0;
	let match: RegExpExecArray | null;

	INLINE_TOKEN.lastIndex = 0;

	while ((match = INLINE_TOKEN.exec(text)) !== null) {
		if (match.index > last) {
			container.appendChild(document.createTextNode(text.slice(last, match.index)));
		}

		if (match[2] !== undefined) {
			const el = document.createElement('strong');
			el.textContent = match[2];
			container.appendChild(el);
		} else if (match[3] !== undefined) {
			const el = document.createElement('em');
			el.textContent = match[3];
			container.appendChild(el);
		} else if (match[4] !== undefined) {
			const el = document.createElement('del');
			el.textContent = match[4];
			container.appendChild(el);
		} else if (match[5] !== undefined) {
			const el = document.createElement('code');
			el.textContent = match[5];
			container.appendChild(el);
		}

		last = match.index + match[0].length;
	}

	if (last < text.length) {
		container.appendChild(document.createTextNode(text.slice(last)));
	}
}
