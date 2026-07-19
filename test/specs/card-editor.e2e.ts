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

function getStatusSelectValue(): Promise<string | null> {
    return browser.execute(() => {
        const fields = Array.from(document.querySelectorAll('.fk-modal-field'));
        const statusField = fields.find(f => f.querySelector('label')?.textContent === 'Status');
        const sel = statusField?.querySelector('select') as HTMLSelectElement | null;
        return sel?.value ?? null;
    });
}

describe('Card editor modal — status field', function () {
    beforeEach(async function () {
        await openInPreview('board.md');
    });

    it('shows status as a select dropdown when editing an existing card', async function () {
        await browser.execute(() => {
            (document.querySelector('[data-card-id="c1"]') as HTMLElement)?.click();
        });
        await browser.pause(500);

        const board = await $('.fk-board');
        await board.waitForExist({ timeout: 5000 });

        const hasStatusSelect = await browser.execute(() => {
            const fields = Array.from(document.querySelectorAll('.fk-modal-field'));
            const statusField = fields.find(f => f.querySelector('label')?.textContent === 'Status');
            return statusField?.querySelector('select') !== null;
        });
        expect(hasStatusSelect).toBe(true);
    });

    it('pre-selects status to the card current value when editing', async function () {
        await browser.execute(() => {
            (document.querySelector('[data-card-id="c1"]') as HTMLElement)?.click();
        });
        await browser.pause(500);

        const value = await getStatusSelectValue();
        expect(value).toBe('todo');
    });

    it('pre-selects status to the column value when adding a new card', async function () {
        await browser.execute(() => {
            const columns = Array.from(document.querySelectorAll('.fk-column'));
            const doneCol = columns.find(
                col => (col as HTMLElement).dataset.columnValue === 'done'
            );
            (doneCol?.querySelector('.fk-col__add-btn') as HTMLButtonElement)?.click();
        });
        await browser.pause(500);

        const value = await getStatusSelectValue();
        expect(value).toBe('done');
    });
});
