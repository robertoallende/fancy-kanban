import { browser, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const LINK_BOARD_FILE = path.resolve(VAULT, 'link-board.md');
const originalLinkBoard = fs.readFileSync(LINK_BOARD_FILE, 'utf8');

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

async function openCardModal(cardId: string): Promise<void> {
    await browser.execute((id) => {
        const card = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
        card?.click();
    }, cardId);
    await browser.pause(500);
}

describe('Link field', function () {
    afterEach(async function () {
        fs.writeFileSync(LINK_BOARD_FILE, originalLinkBoard);
    });

    describe('rendering', function () {
        beforeEach(async function () {
            await openInPreview('link-board.md');
        });

        it('renders the board with a Link field without errors', async function () {
            const board = await $('.fk-board');
            await board.waitForExist({ timeout: 5000 });
            expect(await board.isExisting()).toBe(true);
            const errorPanel = await $('.fk-error-panel');
            expect(await errorPanel.isExisting()).toBe(false);
        });
    });

    describe('card modal', function () {
        beforeEach(async function () {
            await openInPreview('link-board.md');
        });

        it('shows existing Link items in the card modal', async function () {
            await openCardModal('lk1');
            const items = await browser.execute(() =>
                Array.from(document.querySelectorAll('.fk-link-item .fk-link-item__value'))
                    .map(el => el.textContent)
            );
            expect(items).toContain('notes/target.md');
            expect(items).toContain('https://example.com');
        });

        it('removes an item and persists to file', async function () {
            await openCardModal('lk1');
            await browser.execute(() => {
                const removes = document.querySelectorAll('.fk-link-item__remove');
                (removes[0] as HTMLButtonElement).click();
            });
            await browser.pause(200);
            await browser.execute(() => {
                const saveBtn = document.querySelector('.fk-modal-save') as HTMLButtonElement;
                saveBtn?.click();
            });
            await browser.pause(1500);

            const content = await browser.executeObsidian(async ({ app }) => {
                const file = app.vault.getAbstractFileByPath('link-board.md');
                if (!file) return '';
                return await app.vault.read(file as any);
            });

            expect(content).toContain('https://example.com');
            expect(content).not.toContain('notes/file.md');
        });

        it('adds a URL and persists to file', async function () {
            await openCardModal('lk2');
            await browser.execute(() => {
                const addUrl = document.querySelector('.fk-link-add--url') as HTMLButtonElement;
                addUrl?.click();
            });
            await browser.pause(200);
            await browser.execute(() => {
                const input = document.querySelector('.fk-link-url-input input') as HTMLInputElement;
                if (input) input.value = 'https://obsidian.md';
                input?.dispatchEvent(new Event('input'));
                const confirm = document.querySelector('.fk-link-url-confirm') as HTMLButtonElement;
                confirm?.click();
            });
            await browser.pause(200);
            await browser.execute(() => {
                const saveBtn = document.querySelector('.fk-modal-save') as HTMLButtonElement;
                saveBtn?.click();
            });
            await browser.pause(1500);

            const content = await browser.executeObsidian(async ({ app }) => {
                const file = app.vault.getAbstractFileByPath('link-board.md');
                if (!file) return '';
                return await app.vault.read(file as any);
            });

            expect(content).toContain('https://obsidian.md');
        });
    });

    describe('click to open', function () {
        beforeEach(async function () {
            await openInPreview('link-board.md');
        });

        it('clicking a vault path link closes the modal and opens the file in a new tab', async function () {
            await openCardModal('lk1');
            const itemsBefore = await browser.execute(() =>
                document.querySelectorAll('.fk-link-item').length
            );
            expect(itemsBefore).toBe(2);

            // Click the first item (notes/target.md)
            await browser.execute(() => {
                const btn = document.querySelector<HTMLButtonElement>('.fk-link-item__value');
                btn?.click();
            });
            await browser.pause(1000);

            // Modal should be gone
            const modalGone = await browser.execute(() =>
                document.querySelectorAll('.fk-link-item').length === 0
            );
            expect(modalGone).toBe(true);

            // Active file in workspace should now be notes/target.md
            const activeFile = await browser.executeObsidian(async ({ app }) => {
                return app.workspace.getActiveFile()?.path ?? '';
            });
            expect(activeFile).toBe('notes/target.md');
        });

        it('vault path link opens in a new leaf (original board file is still open)', async function () {
            await openCardModal('lk1');
            await browser.execute(() => {
                const btn = document.querySelector<HTMLButtonElement>('.fk-link-item__value');
                btn?.click();
            });
            await browser.pause(1000);

            const leafCount = await browser.executeObsidian(async ({ app }) => {
                let count = 0;
                app.workspace.iterateAllLeaves(() => { count++; });
                return count;
            });
            expect(leafCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('deprecation warning', function () {
        beforeEach(async function () {
            await openInPreview('file-deprecated-board.md');
        });

        it('renders a warning banner for type: File', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            expect(await banner.isExisting()).toBe(true);
        });

        it('warning banner mentions File and Link', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            const text = await banner.getText();
            expect(text).toContain('File');
            expect(text).toContain('Link');
        });

        it('still renders the board despite the deprecation warning', async function () {
            const banner = await $('.fk-warning-banner');
            await banner.waitForExist({ timeout: 5000 });
            const board = await $('.fk-board');
            expect(await board.isExisting()).toBe(true);
        });
    });
});
