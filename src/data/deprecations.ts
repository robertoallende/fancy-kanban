export const W_FIELD_TYPE_DEPRECATED = 'W_FIELD_TYPE_DEPRECATED';

export interface DeprecatedEntry {
	replacement: string;
	removeAt: string;
}

export const DEPRECATED_FIELD_TYPES: Record<string, DeprecatedEntry> = {};

// Types that were once deprecated and are now fully removed.
export const REMOVED_FIELD_TYPES: Record<string, string> = {
	File: "Field type 'File' was removed in 0.5.0. Replace 'type: File' with 'type: Link' in your board config.",
};
