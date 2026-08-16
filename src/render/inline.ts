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
			container.createEl('strong', { text: match[2] });
		} else if (match[3] !== undefined) {
			container.createEl('em', { text: match[3] });
		} else if (match[4] !== undefined) {
			container.createEl('del', { text: match[4] });
		} else if (match[5] !== undefined) {
			container.createEl('code', { text: match[5] });
		}

		last = match.index + match[0].length;
	}

	if (last < text.length) {
		container.appendChild(document.createTextNode(text.slice(last)));
	}
}
