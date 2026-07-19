import { browser, $ } from '@wdio/globals';

const VAULT = './test/vaults/simple';

async function openInPreview(fileName: string): Promise<void> {
    await browser.reloadObsidian({ vault: VAULT });
    await browser.executeObsidian(async ({ app }, name) => {
        const file = app.vault.getAbstractFileByPath(name as string);
        if (file) await app.workspace.getLeaf().openFile(file as any);
    }, fileName);
    await browser.executeObsidian(async ({ app }) => {
        const leaf = app.workspace.activeLeaf;
        if (leaf?.view) {
            await (leaf.view as any).setState({ mode: 'preview' }, { history: false });
        }
    });
    await browser.pause(1500);
}

describe('Card face fields', function () {
    describe('configured card_fields', function () {
        beforeEach(async function () {
            await openInPreview('card-face-board.md');
        });

        it('renders the board without errors', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            expect(await board.isExisting()).toBe(true);
            const errorPanel = await $('.fk-error-panel');
            expect(await errorPanel.isExisting()).toBe(false);
        });

        it('shows configured fields on the card face', async function () {
            const fields = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="cf1"]');
                const rows = Array.from(card?.querySelectorAll('.fk-card__field') ?? []);
                return rows.map(row => ({
                    label: row.querySelector('.fk-card__field-label')?.textContent,
                    value: row.querySelector('.fk-card__field-value')?.textContent,
                }));
            });
            expect(fields.some(f => f.label === 'Priority' && f.value === 'high')).toBe(true);
            expect(fields.some(f => f.label === 'Due' && f.value === '2026-08-01')).toBe(true);
        });

        it('does not show fields not in card_fields', async function () {
            const hasDocsField = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="cf1"]');
                const labels = Array.from(card?.querySelectorAll('.fk-card__field-label') ?? [])
                    .map(el => el.textContent);
                return labels.includes('Docs');
            });
            expect(hasDocsField).toBe(false);
        });

        it('skips secondary fields with empty values', async function () {
            const fieldCount = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="cf3"]');
                return card?.querySelectorAll('.fk-card__field').length ?? 0;
            });
            // cf3 has priority=low but due is empty, so only priority row shows
            expect(fieldCount).toBe(1);
        });
    });

    describe('default behaviour (no card_fields)', function () {
        beforeEach(async function () {
            await openInPreview('board.md');
        });

        it('shows only the title on cards (no .fk-card__fields element)', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            const hasSecondaryFields = await browser.execute(() =>
                document.querySelector('.fk-card__fields') !== null
            );
            expect(hasSecondaryFields).toBe(false);
        });
    });

    describe('card_title empty — no title element', function () {
        beforeEach(async function () {
            await openInPreview('card-face-no-title-board.md');
        });

        it('does not render .fk-card__title when card_title is empty', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            const hasTitleEl = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="nt1"]');
                return card?.querySelector('.fk-card__title') !== null;
            });
            expect(hasTitleEl).toBe(false);
        });

        it('still renders secondary fields when card_title is empty', async function () {
            const fieldCount = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="nt1"]');
                return card?.querySelectorAll('.fk-card__field').length ?? 0;
            });
            expect(fieldCount).toBe(1);
        });
    });

    describe('card_labels: false — secondary field labels hidden', function () {
        beforeEach(async function () {
            await openInPreview('card-face-no-labels-board.md');
        });

        it('renders the title element', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            const titleText = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="nl1"]');
                return card?.querySelector('.fk-card__title')?.textContent ?? null;
            });
            expect(titleText).toBe('Design');
        });

        it('has secondary field rows but no label elements', async function () {
            const result = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="nl1"]');
                return {
                    fields: card?.querySelectorAll('.fk-card__field').length ?? 0,
                    labels: card?.querySelectorAll('.fk-card__field-label').length ?? 0,
                    values: card?.querySelectorAll('.fk-card__field-value').length ?? 0,
                };
            });
            expect(result.fields).toBe(1);
            expect(result.labels).toBe(0);
            expect(result.values).toBe(1);
        });
    });

    describe('title field in card_fields is not duplicated', function () {
        beforeEach(async function () {
            await openInPreview('card-title-duplicate-board.md');
        });

        it('shows the title once (as .fk-card__title, not also as a secondary row)', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            const result = await browser.execute(() => {
                const card = document.querySelector('[data-card-id="td1"]');
                return {
                    titleText: card?.querySelector('.fk-card__title')?.textContent ?? null,
                    secondaryFieldCount: card?.querySelectorAll('.fk-card__field').length ?? 0,
                };
            });
            expect(result.titleText).toBe('Buy milk');
            expect(result.secondaryFieldCount).toBe(0);
        });
    });
});
