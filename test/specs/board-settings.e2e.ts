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

async function clickTab(label: string): Promise<void> {
    await browser.execute((tabLabel) => {
        const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.fk-tab'));
        const tab = tabs.find(b => b.textContent === tabLabel);
        tab?.click();
    }, label);
    await browser.pause(200);
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

    it('renders three tabs: Fields, Layout, Card display', async function () {
        await openSettingsModal();

        const tabLabels = await browser.execute(() =>
            Array.from(document.querySelectorAll<HTMLButtonElement>('.fk-tab'))
                .map(b => b.textContent)
        );
        expect(tabLabels).toEqual(['Fields', 'Layout', 'Card display']);
    });

    it('Fields tab is active by default', async function () {
        await openSettingsModal();

        const isActive = await browser.execute(() => {
            const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.fk-tab'));
            return tabs.find(b => b.textContent === 'Fields')?.classList.contains('fk-tab--active');
        });
        expect(isActive).toBe(true);
    });

    it('shows the current board title in the title input on the Fields tab', async function () {
        await openSettingsModal();

        const titleValue = await browser.execute(() => {
            const fields = Array.from(document.querySelectorAll('.fk-modal-field'));
            const titleField = fields.find(f => f.querySelector('label')?.textContent === 'Board title');
            return (titleField?.querySelector('input') as HTMLInputElement)?.value ?? null;
        });
        expect(titleValue).toBe('Settings Test Board');
    });

    it('shows existing fields in the field list on the Fields tab', async function () {
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

    it('clicking the Layout tab shows the Columns field select', async function () {
        await openSettingsModal();
        await clickTab('Layout');

        const hasColumnsSelect = await browser.execute(() =>
            document.querySelector('[data-role="columns"]') !== null
        );
        expect(hasColumnsSelect).toBe(true);
    });

    it('clicking the Card display tab shows the card title select', async function () {
        await openSettingsModal();
        await clickTab('Card display');

        const hasCardTitleSelect = await browser.execute(() =>
            document.querySelector('[data-role="card-title-select"]') !== null
        );
        expect(hasCardTitleSelect).toBe(true);
    });

    it('switching tabs does not lose unsaved field changes', async function () {
        await openSettingsModal();

        // Add a new field on Fields tab
        await browser.execute(() => {
            (document.querySelector('.fk-modal-add-field') as HTMLButtonElement)?.click();
        });
        await browser.pause(200);

        await browser.execute(() => {
            const rows = Array.from(document.querySelectorAll('.fk-modal-field-row'));
            const lastRow = rows[rows.length - 1];
            const inp = lastRow?.querySelector('.fk-col-label') as HTMLInputElement;
            if (inp) { inp.value = 'Notes'; inp.dispatchEvent(new Event('input')); }
        });

        const countBefore = await browser.execute(() =>
            document.querySelectorAll('.fk-modal-field-row').length
        );

        // Switch to Layout and back to Fields
        await clickTab('Layout');
        await clickTab('Fields');

        const countAfter = await browser.execute(() =>
            document.querySelectorAll('.fk-modal-field-row').length
        );

        expect(countAfter).toBe(countBefore);
    });

    it('adding a card face field on Card display tab and saving persists it to the file', async function () {
        await openSettingsModal();
        await clickTab('Card display');

        await browser.execute(() => {
            const addBtn = document.querySelector('.fk-modal-add-field') as HTMLButtonElement;
            addBtn?.click();
        });
        await browser.pause(200);

        await browser.execute(() => {
            (document.querySelector('.fk-modal-save') as HTMLButtonElement)?.click();
        });
        await browser.pause(1000);

        const content = await readBoardFile();
        expect(content).toContain('card_fields:');
    });
});
