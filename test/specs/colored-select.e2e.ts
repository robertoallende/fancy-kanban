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

describe('Colored Select chips', function () {
    beforeEach(async function () {
        await openInPreview('colored-select-board.md');
    });

    it('renders the board without errors', async function () {
        const board = await $('.fk-board');
        await board.waitForExist({ timeout: 5000 });
        expect(await board.isExisting()).toBe(true);
        const errorPanel = await $('.fk-error-panel');
        expect(await errorPanel.isExisting()).toBe(false);
    });

    it('High priority card renders a chip with fk-card__field-chip class', async function () {
        const hasChip = await browser.execute(() => {
            const card = document.querySelector('[data-card-id="chip0001"]');
            return card?.querySelector('.fk-card__field-chip') !== null;
        });
        expect(hasChip).toBe(true);
    });

    it('High priority chip has the correct background color', async function () {
        const bgColor = await browser.execute(() => {
            const card = document.querySelector('[data-card-id="chip0001"]');
            const chip = card?.querySelector<HTMLElement>('.fk-card__field-chip');
            return chip ? window.getComputedStyle(chip).backgroundColor : null;
        });
        expect(bgColor).toBe('rgb(231, 76, 60)');
    });

    it('Medium priority card renders a chip', async function () {
        const hasChip = await browser.execute(() => {
            const card = document.querySelector('[data-card-id="chip0002"]');
            return card?.querySelector('.fk-card__field-chip') !== null;
        });
        expect(hasChip).toBe(true);
    });

    it('card with no priority value renders no chip', async function () {
        const hasChip = await browser.execute(() => {
            const card = document.querySelector('[data-card-id="chip0003"]');
            return card?.querySelector('.fk-card__field-chip') !== null;
        });
        expect(hasChip).toBe(false);
    });
});
