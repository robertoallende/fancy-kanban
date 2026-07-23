import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'checklist-board.md');
const ORIGINAL_CONTENT = fs.readFileSync(BOARD_FILE, 'utf8');

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

async function readBoardFile(): Promise<string> {
    return browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getAbstractFileByPath('checklist-board.md');
        if (!file) return '';
        return await app.vault.read(file as any);
    });
}

describe('Checklist', function () {
    beforeEach(async function () {
        fs.writeFileSync(BOARD_FILE, ORIGINAL_CONTENT, 'utf8');
        await openInPreview('checklist-board.md');
    });

    describe('rendering', function () {
        it('renders the board without errors', async function () {
            const hasError = await browser.execute(() => document.querySelector('.fk-error') !== null);
            expect(hasError).toBe(false);
        });

        it('renders .fk-card__checklist on the card with checkbox content', async function () {
            const exists = await browser.execute(() => document.querySelector('.fk-card__checklist') !== null);
            expect(exists).toBe(true);
        });

        it('renders unchecked checkboxes for - [ ] lines', async function () {
            const uncheckedCount = await browser.execute(() =>
                document.querySelectorAll('.fk-card__checkbox:not(:checked)').length
            );
            expect(uncheckedCount).toBe(2);
        });

        it('renders a checked checkbox for - [x] lines', async function () {
            const checkedCount = await browser.execute(() =>
                document.querySelectorAll('.fk-card__checkbox:checked').length
            );
            expect(checkedCount).toBe(1);
        });

        it('renders plain-text lines as .fk-card__checklist-text', async function () {
            const textEl = await browser.execute(() =>
                document.querySelector('.fk-card__checklist-text')?.textContent
            );
            expect(textEl).toBe('Some plain text');
        });

        it('does not render a checklist on a card with plain Textarea content', async function () {
            const checklists = await browser.execute(() =>
                document.querySelectorAll('.fk-card__checklist').length
            );
            expect(checklists).toBe(1);
        });
    });

    describe('interactivity', function () {
        it('checking an unchecked box persists - [x] to the file', async function () {
            await browser.execute(() => {
                const unchecked = document.querySelector<HTMLInputElement>('.fk-card__checkbox:not(:checked)');
                unchecked?.click();
            });
            await browser.pause(800);

            const content = await readBoardFile();
            const checkboxLines = content.match(/- \[x\]/g) ?? [];
            expect(checkboxLines.length).toBe(2);
        });

        it('unchecking a checked box persists - [ ] to the file', async function () {
            await browser.execute(() => {
                const checked = document.querySelector<HTMLInputElement>('.fk-card__checkbox:checked');
                checked?.click();
            });
            await browser.pause(800);

            const content = await readBoardFile();
            const checkedLines = content.match(/- \[x\]/g) ?? [];
            expect(checkedLines.length).toBe(0);
        });

        it('after toggling the board re-renders with updated checkbox state', async function () {
            await browser.execute(() => {
                const checked = document.querySelector<HTMLInputElement>('.fk-card__checkbox:checked');
                checked?.click();
            });
            await browser.pause(800);

            const checkedCount = await browser.execute(() =>
                document.querySelectorAll('.fk-card__checkbox:checked').length
            );
            expect(checkedCount).toBe(0);
        });
    });
});
