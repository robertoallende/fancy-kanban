export type FieldType = 'Text' | 'Textarea' | 'Date' | 'Number' | 'Select' | 'Link';

export interface FieldDefinition {
	name: string;
	type: FieldType;
	label: string;
	options?: string[];
	colors?: Record<string, string>;
	default?: string;
}

export interface ViewConfig {
	columns: string;
	lanes?: string;
	cardTitle?: string;     // field name; '' = no title; undefined = auto-detect
	cardFields?: string[];  // secondary fields only (title not included)
	cardLabels?: boolean;   // false = hide labels on secondary fields; default true
	cardLimit?: number;     // max cards shown per column before "Show more"; 0 or absent = no limit
}

export interface Card {
	id: string;
	values: Record<string, string>;
}

export const SUPPORTED_VERSION = 3;

export interface BoardSchema {
	title: string;
	fields: FieldDefinition[];
	viewConfig: ViewConfig;
	rawWorkflow: string;
	version: number;
}

export interface Board extends BoardSchema {
	cards: Card[];
}
