export function splitLinks(value: string): string[] {
	if (!value) return [];
	return value.split('\n').filter(s => s.length > 0);
}

export function joinLinks(items: string[]): string {
	return items.join('\n');
}
