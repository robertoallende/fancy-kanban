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

describe('Error UI', function () {
    describe('fatal error panel', function () {
        beforeEach(async function () {
            await openInPreview('error-board.md');
        });

        it('renders .fk-error-panel for an unparseable block', async function () {
            const panel = await $('.fk-error-panel');
            await panel.waitForExist({ timeout: 5000 });
            expect(await panel.isExisting()).toBe(true);
        });

        it('error panel contains the raw block source text', async function () {
            const source = await $('.fk-error-panel__source');
            await source.waitForExist({ timeout: 5000 });
            const text = await source.getText();
            expect(text.length).toBeGreaterThan(0);
            expect(text).toContain('title: Broken Board');
        });

        it('error panel contains a "Go to source" button', async function () {
            const btn = await $('.fk-error-panel__goto');
            await btn.waitForExist({ timeout: 5000 });
            expect(await btn.getText()).toBe('Go to source');
        });

        it('does not render .fk-board for an unparseable block', async function () {
            const panel = await $('.fk-error-panel');
            await panel.waitForExist({ timeout: 5000 });
            const board = await $('.fk-board');
            expect(await board.isExisting()).toBe(false);
        });
    });

    describe('warning banner', function () {
        beforeEach(async function () {
            await openInPreview('warning-board.md');
        });

        it('renders .fk-warning-banner when block has recoverable parse warnings', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            expect(await banner.isExisting()).toBe(true);
        });

        it('still renders .fk-board alongside the warning banner', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            const board = await $('.fk-board');
            expect(await board.isExisting()).toBe(true);
        });

        it('renders the valid card from the board', async function () {
            const card = await $('[data-card-id="w1"]');
            await card.waitForExist({ timeout: 5000 });
            expect(await card.isExisting()).toBe(true);
        });

        it('clicking dismiss removes the warning banner', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            const dismiss = await $('.fk-warning-banner__dismiss');
            await dismiss.click();
            await browser.pause(300);
            expect(await banner.isExisting()).toBe(false);
        });

        it('board remains after banner is dismissed', async function () {
            const dismiss = await $('.fk-warning-banner__dismiss');
            await dismiss.waitForExist({ timeout: 5000 });
            await dismiss.click();
            await browser.pause(300);
            const board = await $('.fk-board');
            expect(await board.isExisting()).toBe(true);
        });
    });

    describe('readonly banner', function () {
        beforeEach(async function () {
            await openInPreview('readonly-board.md');
        });

        it('renders .fk-banner--warning for a version 3 board', async function () {
            const banner = await $('.fk-banner--warning');
            await banner.waitForExist({ timeout: 5000 });
            expect(await banner.isExisting()).toBe(true);
        });

        it('readonly banner contains a non-empty message', async function () {
            const banner = await $('.fk-banner--warning');
            await banner.waitForExist({ timeout: 5000 });
            const text = await banner.getText();
            expect(text.length).toBeGreaterThan(0);
        });

        it('still renders .fk-board for a readonly board', async function () {
            const banner = await $('.fk-banner--warning');
            await banner.waitForExist({ timeout: 5000 });
            const board = await $('.fk-board');
            expect(await board.isExisting()).toBe(true);
        });
    });
});
