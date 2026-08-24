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

describe('Card limit', function () {
    beforeEach(async function () {
        await openInPreview('card-limit-board.md');
    });

    it('renders the board without errors', async function () {
        const board = await $('.fk-board');
        await board.waitForExist({ timeout: 5000 });
        expect(await board.isExisting()).toBe(true);
        const errorPanel = await $('.fk-error-panel');
        expect(await errorPanel.isExisting()).toBe(false);
    });

    it('shows only the first 3 cards in the done column', async function () {
        const visibleCount = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            const cards = Array.from(doneCol?.querySelectorAll('.fk-card') ?? []);
            return cards.filter(c => !c.classList.contains('fk-hidden')).length;
        });
        expect(visibleCount).toBe(3);
    });

    it('hides the remaining 2 cards with fk-hidden', async function () {
        const hiddenCount = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            const cards = doneCol?.querySelectorAll('.fk-card.fk-hidden') ?? [];
            return cards.length;
        });
        expect(hiddenCount).toBe(2);
    });

    it('shows a show-more button in the done column', async function () {
        const hasButton = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            return doneCol?.querySelector('.fk-col__show-more') !== null;
        });
        expect(hasButton).toBe(true);
    });

    it('show-more button label includes the hidden count', async function () {
        const text = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            return doneCol?.querySelector('.fk-col__show-more')?.textContent ?? '';
        });
        expect(text).toContain('2');
    });

    it('clicking show-more reveals all cards', async function () {
        await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            (doneCol?.querySelector('.fk-col__show-more') as HTMLButtonElement)?.click();
        });
        await browser.pause(300);
        const visibleCount = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            const cards = Array.from(doneCol?.querySelectorAll('.fk-card') ?? []);
            return cards.filter(c => !c.classList.contains('fk-hidden')).length;
        });
        expect(visibleCount).toBe(5);
    });

    it('clicking show-more removes the button', async function () {
        await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            (doneCol?.querySelector('.fk-col__show-more') as HTMLButtonElement)?.click();
        });
        await browser.pause(300);
        const hasButton = await browser.execute(() => {
            const doneCol = document.querySelector('.fk-column[data-column-value="done"]');
            return doneCol?.querySelector('.fk-col__show-more') !== null;
        });
        expect(hasButton).toBe(false);
    });

    it('inbox column (below limit) shows no show-more button', async function () {
        const hasButton = await browser.execute(() => {
            const inboxCol = document.querySelector('.fk-column[data-column-value="inbox"]');
            return inboxCol?.querySelector('.fk-col__show-more') !== null;
        });
        expect(hasButton).toBe(false);
    });
});
