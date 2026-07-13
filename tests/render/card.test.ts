// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderCard } from '../../src/render/card';
import type { Card, FieldDefinition } from '../../src/model/board';

const FIELDS: FieldDefinition[] = [
	{ name: 'title', type: 'Text', label: 'Title' },
	{ name: 'status', type: 'Select', label: 'Status', options: ['inbox', 'done'], default: 'inbox' },
	{ name: 'due', type: 'Date', label: 'Due date' },
];

const CARD: Card = {
	id: 'abc12345',
	values: { title: 'Buy milk', status: 'inbox', due: '2026-08-01' },
};

describe('renderCard', () => {
	describe('container', () => {
		it('returns an HTMLElement', () => {
			const el = renderCard(CARD, FIELDS);
			expect(el).toBeInstanceOf(HTMLElement);
		});

		it('container has class fk-card', () => {
			const el = renderCard(CARD, FIELDS);
			expect(el.classList.contains('fk-card')).toBe(true);
		});
	});

	describe('title field', () => {
		it('renders the first non-id field value as fk-card__title', () => {
			const el = renderCard(CARD, FIELDS);
			const title = el.querySelector('.fk-card__title');
			expect(title).not.toBeNull();
			expect(title!.textContent).toBe('Buy milk');
		});

		it('title element is present even when value is empty', () => {
			const card: Card = { id: 'x', values: { title: '', status: 'inbox' } };
			const el = renderCard(card, FIELDS);
			expect(el.querySelector('.fk-card__title')).not.toBeNull();
		});

		it('uses the first non-id field as title regardless of name', () => {
			const fields: FieldDefinition[] = [
				{ name: 'subject', type: 'Text', label: 'Subject' },
				{ name: 'status', type: 'Select', label: 'Status', options: ['open'], default: 'open' },
			];
			const card: Card = { id: 'x', values: { subject: 'My task', status: 'open' } };
			const el = renderCard(card, fields);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('My task');
		});
	});

	describe('_id field', () => {
		it('never renders _id in the output', () => {
			const fields: FieldDefinition[] = [
				{ name: '_id', type: 'Text', label: 'ID' },
				{ name: 'title', type: 'Text', label: 'Title' },
			];
			const card: Card = { id: 'x', values: { _id: 'x', title: 'Task' } };
			const el = renderCard(card, fields);
			expect(el.textContent).not.toContain('x');
			expect(el.querySelector('.fk-card__field-label')?.textContent).not.toBe('ID');
		});
	});

	describe('secondary fields', () => {
		it('renders secondary fields as fk-card__field rows', () => {
			const el = renderCard(CARD, FIELDS);
			const fields = el.querySelectorAll('.fk-card__field');
			expect(fields.length).toBeGreaterThan(0);
		});

		it('field row contains label and value spans', () => {
			const el = renderCard(CARD, FIELDS);
			const field = el.querySelector('.fk-card__field')!;
			expect(field.querySelector('.fk-card__field-label')).not.toBeNull();
			expect(field.querySelector('.fk-card__field-value')).not.toBeNull();
		});

		it('uses field.label not field.name for the label text', () => {
			const el = renderCard(CARD, FIELDS);
			const labels = Array.from(el.querySelectorAll('.fk-card__field-label')).map(n => n.textContent);
			expect(labels).toContain('Status');
			expect(labels).not.toContain('status');
		});

		it('shows the correct value next to each label', () => {
			const el = renderCard(CARD, FIELDS);
			const fieldEls = el.querySelectorAll('.fk-card__field');
			const statusField = Array.from(fieldEls).find(
				f => f.querySelector('.fk-card__field-label')?.textContent === 'Status',
			)!;
			expect(statusField.querySelector('.fk-card__field-value')!.textContent).toBe('inbox');
		});

		it('title field does not appear as a secondary field row', () => {
			const el = renderCard(CARD, FIELDS);
			const labels = Array.from(el.querySelectorAll('.fk-card__field-label')).map(n => n.textContent);
			expect(labels).not.toContain('Title');
		});
	});

	describe('empty values', () => {
		it('omits secondary field with empty string value', () => {
			const card: Card = { id: 'x', values: { title: 'Task', status: '', due: '2026-01-01' } };
			const el = renderCard(card, FIELDS);
			const labels = Array.from(el.querySelectorAll('.fk-card__field-label')).map(n => n.textContent);
			expect(labels).not.toContain('Status');
		});

		it('omits secondary field with undefined value', () => {
			const card: Card = { id: 'x', values: { title: 'Task', due: '2026-01-01' } };
			const el = renderCard(card, FIELDS);
			const labels = Array.from(el.querySelectorAll('.fk-card__field-label')).map(n => n.textContent);
			expect(labels).not.toContain('Status');
		});

		it('card with only title and empty secondaries renders just the title', () => {
			const card: Card = { id: 'x', values: { title: 'Task' } };
			const el = renderCard(card, FIELDS);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('Task');
		});
	});

	describe('edge cases', () => {
		it('card with a single field renders without any field rows', () => {
			const fields: FieldDefinition[] = [{ name: 'title', type: 'Text', label: 'Title' }];
			const card: Card = { id: 'x', values: { title: 'Solo' } };
			const el = renderCard(card, fields);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('multiple secondary fields all render', () => {
			const el = renderCard(CARD, FIELDS);
			const labels = Array.from(el.querySelectorAll('.fk-card__field-label')).map(n => n.textContent);
			expect(labels).toContain('Status');
			expect(labels).toContain('Due date');
		});
	});
});
