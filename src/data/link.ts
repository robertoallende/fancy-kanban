export function splitLinks(value: string): string[] {
	if (!value) return [];
	return value.split('\n').filter(s => s.length > 0);
}

export function joinLinks(items: string[]): string {
	return items.join('\n');
}

export interface LinkValidationResult {
	valid: boolean;
	error?: string;
}

const URI_PATTERN = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//;
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'ftp:']);
const MAILTO_PATTERN = /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateLinkItem(raw: string): LinkValidationResult {
	const value = raw.trim();
	if (!value) return { valid: false, error: 'Enter a path or URI' };

	if (value.startsWith('mailto:')) {
		return MAILTO_PATTERN.test(value)
			? { valid: true }
			: { valid: false, error: 'Enter a valid email address (mailto:user@example.com)' };
	}

	if (URI_PATTERN.test(value)) {
		try {
			const url = new URL(value);
			if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
				return { valid: false, error: 'URI must use https, http, or ftp' };
			}
			if (!url.hostname) {
				return { valid: false, error: 'URI is missing a host' };
			}
		} catch {
			return { valid: false, error: 'URI is not valid' };
		}
		return { valid: true };
	}

	if (value.startsWith('/')) {
		return { valid: false, error: 'Path must be relative to the vault root (remove the leading /)' };
	}
	if (/^[A-Za-z]:[/\\]/.test(value)) {
		return { valid: false, error: 'Path must be relative to the vault root (remove the drive letter)' };
	}
	if (value.startsWith('~')) {
		return { valid: false, error: 'Path must be relative to the vault root (~ is not supported)' };
	}

	return { valid: true };
}
