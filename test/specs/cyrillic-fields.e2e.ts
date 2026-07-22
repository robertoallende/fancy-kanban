import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'cyrillic-board.md');
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
        const file = app.vault.getAbstractFileByPath('cyrillic-board.md');
        if (!file) return '';
        return await app.vault.read(file as any);
    });
}

describe('Cyrillic field names', function () {
    beforeEach(async function () {
        fs.writeFileSync(BOARD_FILE, ORIGINAL_CONTENT, 'utf8');
        await openInPreview('cyrillic-board.md');
    });

    it('adding a field with a Cyrillic label produces a non-empty field name', async function () {
        await openSettingsModal();

        await browser.execute(() => {
            (document.querySelector('.fk-modal-add-field') as HTMLButtonElement)?.click();
        });
        await browser.pause(200);

        await browser.execute(() => {
            const rows = Array.from(document.querySelectorAll('.fk-modal-field-row'));
            const lastRow = rows[rows.length - 1];
            const inp = lastRow?.querySelector('.fk-col-label') as HTMLInputElement;
            if (inp) {
                inp.value = 'Приоритет';
                inp.dispatchEvent(new Event('input'));
            }
        });

        await browser.execute(() => {
            (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
        });
        await browser.pause(1000);

        const content = await readBoardFile();
        // The derived field name must not be empty or collapse to only underscores
        expect(content).not.toMatch(/name:\s*,/);
        expect(content).not.toMatch(/name:\s*_+\s*,/);
        expect(content).toContain('label: Приоритет');
    });

    it('adding a field with a Cyrillic label does not produce a duplicate or empty name collision', async function () {
        await openSettingsModal();

        // Add two fields with different Cyrillic labels
        for (const label of ['Приоритет', 'Ответственный']) {
            await browser.execute(() => {
                (document.querySelector('.fk-modal-add-field') as HTMLButtonElement)?.click();
            });
            await browser.pause(200);

            await browser.execute((lbl) => {
                const rows = Array.from(document.querySelectorAll('.fk-modal-field-row'));
                const lastRow = rows[rows.length - 1];
                const inp = lastRow?.querySelector('.fk-col-label') as HTMLInputElement;
                if (inp) {
                    inp.value = lbl as string;
                    inp.dispatchEvent(new Event('input'));
                }
            }, label);
        }

        await browser.execute(() => {
            (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
        });
        await browser.pause(1000);

        const content = await readBoardFile();
        // Both labels must appear
        expect(content).toContain('label: Приоритет');
        expect(content).toContain('label: Ответственный');
        // Their names must be distinct (no two `name: ,` or collapsed duplicates)
        const nameMatches = [...content.matchAll(/name:\s*([^,]+),/g)].map(m => m[1].trim());
        const uniqueNames = new Set(nameMatches);
        expect(uniqueNames.size).toBe(nameMatches.length);
    });
});
