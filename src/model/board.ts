export type FieldType = 'Text' | 'Textarea' | 'Date' | 'Number' | 'Select' | 'File';

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
}

export interface Card {
	id: string;
	values: Record<string, string>;
}

export interface BoardSchema {
	title: string;
	fields: FieldDefinition[];
	viewConfig: ViewConfig;
	rawWorkflow: string;
}

export interface Board extends BoardSchema {
	cards: Card[];
}
