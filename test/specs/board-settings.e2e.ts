import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'settings-board.md');
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
        const file = app.vault.getAbstractFileByPath('settings-board.md');
        if (!file) return '';
        return await app.vault.read(file as any);
    });
}

describe('Board settings modal', function () {
    beforeEach(async function () {
        fs.writeFileSync(BOARD_FILE, ORIGINAL_CONTENT, 'utf8');
        await openInPreview('settings-board.md');
    });

    it('opens the settings modal when the settings button is clicked', async function () {
        await openSettingsModal();

        const hasModal = await browser.execute(() =>
            document.querySelector('.modal-container') !== null
        );
        expect(hasModal).toBe(true);
    });

    it('shows the current board title in the title input', async function () {
        await openSettingsModal();

        const titleValue = await browser.execute(() => {
            const fields = Array.from(document.querySelectorAll('.fk-modal-field'));
            const titleField = fields.find(f => f.querySelector('label')?.textContent === 'Board title');
            return (titleField?.querySelector('input') as HTMLInputElement)?.value ?? null;
        });
        expect(titleValue).toBe('Settings Test Board');
    });

    it('shows existing fields in the field list', async function () {
        await openSettingsModal();

        const fieldLabels = await browser.execute(() => {
            return Array.from(document.querySelectorAll('.fk-modal-field-row .fk-col-label'))
                .map(el => (el as HTMLInputElement).value);
        });
        expect(fieldLabels).toContain('Title');
        expect(fieldLabels).toContain('Status');
    });

    it('renaming the board title and saving updates the file', async function () {
        await openSettingsModal();

        await browser.execute(() => {
            const fields = Array.from(document.querySelectorAll('.fk-modal-field'));
            const titleField = fields.find(f => f.querySelector('label')?.textContent === 'Board title');
            const inp = titleField?.querySelector('input') as HTMLInputElement;
            if (inp) {
                inp.value = 'Renamed Board';
                inp.dispatchEvent(new Event('input'));
            }
        });

        await browser.execute(() => {
            (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
        });
        await browser.pause(1000);

        const content = await readBoardFile();
        expect(content).toContain('title: Renamed Board');
    });

    it('adding a new field and saving persists it to the file', async function () {
        await openSettingsModal();

        // Click the first "+ Add field" button (fields section, not card display section)
        await browser.execute(() => {
            (document.querySelector('.fk-modal-add-field') as HTMLButtonElement)?.click();
        });
        await browser.pause(200);

        await browser.execute(() => {
            const rows = Array.from(document.querySelectorAll('.fk-modal-field-row'));
            const lastRow = rows[rows.length - 1];
            const inp = lastRow?.querySelector('.fk-col-label') as HTMLInputElement;
            if (inp) {
                inp.value = 'Priority';
                inp.dispatchEvent(new Event('input'));
            }
        });

        await browser.execute(() => {
            (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
        });
        await browser.pause(1000);

        const content = await readBoardFile();
        expect(content).toContain('name: priority');
        expect(content).toContain('label: Priority');
    });
});
