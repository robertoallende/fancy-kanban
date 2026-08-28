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
    await browser.pause(3000);
}

describe('Card click opens editor', function () {
    beforeEach(async function () {
        await openInPreview('board.md');
    });

    it('clicking a card opens the card editor modal', async function () {
        // Use WebDriver native click — goes through real pointer events (pointerdown → pointerup → click)
        // A synthetic JS .click() skips pointer events and would bypass the bug
        const card = await $('[data-card-id="c1"]');
        await card.click();
        await browser.pause(500);

        const hasModal = await browser.execute(() =>
            document.querySelector('.modal-container') !== null
        );
        expect(hasModal).toBe(true);
    });
});
