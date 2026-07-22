import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'rename-column-board.md');
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

async function openSettingsModal(): Promise<void> {
    await browser.execute(() => {
        (document.querySelector('.fk-board__settings') as HTMLElement)?.click();
    });
    await browser.pause(500);
}

async function readBoardFile(): Promise<string> {
    return browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getAbstractFileByPath('rename-column-board.md');
        if (!file) return '';
        return await app.vault.read(file as any);
    });
}

async function renameColumn(from: string, to: string): Promise<void> {
    await browser.execute((fromVal, toVal) => {
        const rows = Array.from(document.querySelectorAll('.fk-modal-field-row'));
        const statusRow = rows.find(row => {
            const label = row.querySelector('.fk-col-label') as HTMLInputElement;
            return label?.value === 'Status';
        });
        const optionsInp = statusRow?.querySelector('.fk-col-options') as HTMLInputElement;
        if (optionsInp) {
            optionsInp.value = optionsInp.value.replace(fromVal, toVal);
            optionsInp.dispatchEvent(new Event('input'));
        }
    }, from, to);

    await browser.execute(() => {
        (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
    });
    await browser.pause(1000);
}

describe('Rename column', function () {
    beforeEach(async function () {
        fs.writeFileSync(BOARD_FILE, ORIGINAL_CONTENT, 'utf8');
        await openInPreview('rename-column-board.md');
    });

    it('renders all three columns on initial load', async function () {
        const titles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-column__title')).map(el => el.textContent)
        );
        expect(titles).toContain('Todo');
        expect(titles).toContain('Doing');
        expect(titles).toContain('Done');
    });

    it('cards are distributed across columns on initial load', async function () {
        const counts = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-column__count')).map(el => el.textContent)
        );
        expect(counts).toContain('2'); // todo: 2 cards
        expect(counts).toContain('1'); // doing: 1 card
        expect(counts).toContain('1'); // done: 1 card
    });

    it('renaming a column updates the board header', async function () {
        await openSettingsModal();
        await renameColumn('todo', 'backlog');

        const titles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-column__title')).map(el => el.textContent)
        );
        expect(titles).toContain('Backlog');
        expect(titles).not.toContain('Todo');
        expect(titles).toContain('Doing');
        expect(titles).toContain('Done');
    });

    it('cards in the renamed column are preserved after rename', async function () {
        await openSettingsModal();
        await renameColumn('todo', 'backlog');

        const backlogCount = await browser.execute(() => {
            const columns = Array.from(document.querySelectorAll('.fk-column'));
            const backlog = columns.find(col =>
                col.querySelector('.fk-column__title')?.textContent === 'Backlog'
            );
            return backlog?.querySelectorAll('.fk-card').length ?? 0;
        });
        expect(backlogCount).toBe(2);
    });

    it('card values are migrated to the new option name in the file', async function () {
        await openSettingsModal();
        await renameColumn('todo', 'backlog');

        const content = await readBoardFile();
        expect(content).toContain('backlog');
        expect(content).not.toMatch(/\| todo \|/);
    });

    it('renaming a column persists the new option to the file', async function () {
        await openSettingsModal();
        await renameColumn('todo', 'backlog');

        const content = await readBoardFile();
        expect(content).toContain('options: backlog|doing|done');
        expect(content).not.toContain('options: todo|doing|done');
    });
});
