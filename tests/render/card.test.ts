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

	describe('secondary fields', () => {
		it('does not render any .fk-card__field rows', () => {
			const el = renderCard(CARD, FIELDS);
			expect(el.querySelectorAll('.fk-card__field').length).toBe(0);
		});

		it('does not render _id in the output', () => {
			const fields: FieldDefinition[] = [
				{ name: '_id', type: 'Text', label: 'ID' },
				{ name: 'title', type: 'Text', label: 'Title' },
			];
			const card: Card = { id: 'x', values: { _id: 'x', title: 'Task' } };
			const el = renderCard(card, fields);
			expect(el.querySelector('.fk-card__title')!.textContent).toBe('Task');
		});
	});

	describe('delete button', () => {
		it('renders a .fk-card__delete button', () => {
			const el = renderCard(CARD, FIELDS);
			expect(el.querySelector('.fk-card__delete')).not.toBeNull();
		});
	});
});
