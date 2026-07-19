export type FieldType = 'Text' | 'Textarea' | 'Date' | 'Number' | 'Select' | 'Link';

export interface FieldDefinition {
	name: string;
	type: FieldType;
	label: string;
	options?: string[];
	default?: string;
}

export interface ViewConfig {
	columns: string;
	lanes?: string;
	cardFields?: string[];
}

export interface Card {
	id: string;
	values: Record<string, string>;
}

export const SUPPORTED_VERSION = 1;

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
