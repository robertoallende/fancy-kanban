export const W_FIELD_TYPE_DEPRECATED = 'W_FIELD_TYPE_DEPRECATED';

export interface DeprecatedEntry {
	replacement: string;
	removeAt: string;
}

export const DEPRECATED_FIELD_TYPES: Record<string, DeprecatedEntry> = {
	File: { replacement: 'Link', removeAt: '0.5.0' },
};
