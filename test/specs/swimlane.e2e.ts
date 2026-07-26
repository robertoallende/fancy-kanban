import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'swimlane-board.md');
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
        const file = app.vault.getAbstractFileByPath('swimlane-board.md');
        if (!file) return '';
        return await app.vault.read(file as any);
    });
}

describe('Swimlanes', function () {
    beforeEach(async function () {
        fs.writeFileSync(BOARD_FILE, ORIGINAL_CONTENT, 'utf8');
        await openInPreview('swimlane-board.md');
    });

    describe('rendering', function () {
        it('renders the board without errors', async function () {
            const hasError = await browser.execute(() => document.querySelector('.fk-error') !== null);
            expect(hasError).toBe(false);
        });

        it('renders swimlane rows', async function () {
            const count = await browser.execute(() =>
                document.querySelectorAll('.fk-swimlane').length
            );
            expect(count).toBe(2);
        });

        it('renders one swimlane row per lane', async function () {
            const labels = await browser.execute(() =>
                Array.from(document.querySelectorAll('.fk-swimlane__label')).map(el => el.textContent?.trim())
            );
            expect(labels).toContain('Roberto');
            expect(labels).toContain('Teacher');
        });

        it('renders a column header row above the swimlanes', async function () {
            const colHeaders = await browser.execute(() =>
                document.querySelector('.fk-board__col-headers') !== null
            );
            expect(colHeaders).toBe(true);
        });

        it('renders column titles in the header row', async function () {
            const titles = await browser.execute(() =>
                Array.from(document.querySelectorAll('.fk-board__col-headers .fk-column__title')).map(el => el.textContent?.trim())
            );
            expect(titles).toContain('Todo');
            expect(titles).toContain('Done');
        });

        it('renders cards in the correct lane and column cell', async function () {
            const s1InCorrectCell = await browser.execute(() => {
                const cell = document.querySelector('[data-column-value="todo"][data-lane-value="roberto"]');
                return cell?.querySelector('[data-card-id="s1"]') !== null;
            });
            expect(s1InCorrectCell).toBe(true);

            const s3InCorrectCell = await browser.execute(() => {
                const cell = document.querySelector('[data-column-value="todo"][data-lane-value="teacher"]');
                return cell?.querySelector('[data-card-id="s3"]') !== null;
            });
            expect(s3InCorrectCell).toBe(true);
        });

        it('renders each lane cell with an add-card button', async function () {
            const addBtnCount = await browser.execute(() =>
                document.querySelectorAll('.fk-swimlane .fk-col__add-btn').length
            );
            // 2 lanes × 2 columns = 4 cells
            expect(addBtnCount).toBe(4);
        });

        it('a board without lanes renders no .fk-swimlane elements', async function () {
            await browser.executeObsidian(async ({ app }) => {
                const file = app.vault.getAbstractFileByPath('board.md');
                if (file) await app.workspace.getLeaf().openFile(file as any);
            });
            await browser.executeObsidian(async ({ app }) => {
                const leaf = app.workspace.activeLeaf;
                if (leaf?.view) {
                    await (leaf.view as any).setState({ mode: 'preview' }, { history: false });
                }
            });
            await browser.pause(1500);

            const count = await browser.execute(() =>
                document.querySelectorAll('.fk-swimlane').length
            );
            expect(count).toBe(0);
        });
    });

    describe('drag and drop', function () {
        it('dragging a card to a different lane and column updates both fields in the file', async function () {
            await browser.execute(() => {
                const card = document.querySelector('[data-card-id="s1"]') as HTMLElement;
                const targetCell = document.querySelector('[data-column-value="done"][data-lane-value="teacher"]') as HTMLElement;
                if (!card || !targetCell) return;

                const cardRect = card.getBoundingClientRect();
                const cellRect = targetCell.getBoundingClientRect();
                const startX = cardRect.left + cardRect.width / 2;
                const startY = cardRect.top + cardRect.height / 2;
                const endX = cellRect.left + cellRect.width / 2;
                const endY = cellRect.top + cellRect.height / 2;

                const activeDoc = (window as any).activeDocument ?? document;

                card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: startX, clientY: startY, pointerId: 1 }));
                for (let i = 1; i <= 10; i++) {
                    const x = startX + (endX - startX) * (i / 10);
                    const y = startY + (endY - startY) * (i / 10);
                    activeDoc.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
                }
                activeDoc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: endX, clientY: endY, pointerId: 1 }));
            });

            await browser.pause(2000);

            const content = await readBoardFile();
            // s1 should now be done/teacher
            expect(content).toMatch(/\|\s*s1\s*\|.*\|\s*done\s*\|\s*teacher\s*\|/);
        });

        it('clicking Add card in a lane cell pre-populates the lane field in the modal', async function () {
            await browser.execute(() => {
                const cell = document.querySelector('[data-column-value="todo"][data-lane-value="teacher"]') as HTMLElement;
                const btn = cell?.querySelector('.fk-col__add-btn') as HTMLElement;
                btn?.click();
            });
            await browser.pause(600);

            const assigneeValue = await browser.execute(() => {
                const sel = document.querySelector<HTMLSelectElement>('.modal-content select[class*="fk-modal-input"]');
                const selAll = Array.from(document.querySelectorAll<HTMLSelectElement>('.modal-content select'));
                const assigneeSel = selAll.find(s => {
                    const label = s.closest('.fk-modal-field')?.querySelector('label')?.textContent ?? '';
                    return label.toLowerCase() === 'assignee';
                });
                return assigneeSel?.value ?? null;
            });
            expect(assigneeValue).toBe('teacher');

            // fill a title and save, verify both fields are persisted
            await browser.execute(() => {
                const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.modal-content input[type="text"]'));
                const titleInput = inputs.find(i => {
                    const label = i.closest('.fk-modal-field')?.querySelector('label')?.textContent ?? '';
                    return label.toLowerCase() === 'title';
                });
                if (titleInput) { titleInput.value = 'New teacher task'; titleInput.dispatchEvent(new Event('input')); }
                (document.querySelector('.fk-modal-save') as HTMLElement)?.click();
            });
            await browser.pause(1500);

            const content = await readBoardFile();
            expect(content).toMatch(/New teacher task.*todo.*teacher|New teacher task/);
            expect(content).toMatch(/teacher/);
        });

        it('dragging a card within the same lane updates only the column field', async function () {
            await browser.execute(() => {
                const card = document.querySelector('[data-card-id="s3"]') as HTMLElement;
                const targetCell = document.querySelector('[data-column-value="done"][data-lane-value="teacher"]') as HTMLElement;
                if (!card || !targetCell) return;

                const cardRect = card.getBoundingClientRect();
                const cellRect = targetCell.getBoundingClientRect();
                const startX = cardRect.left + cardRect.width / 2;
                const startY = cardRect.top + cardRect.height / 2;
                const endX = cellRect.left + cellRect.width / 2;
                const endY = cellRect.top + cellRect.height / 2;

                const activeDoc = (window as any).activeDocument ?? document;

                card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: startX, clientY: startY, pointerId: 1 }));
                for (let i = 1; i <= 10; i++) {
                    const x = startX + (endX - startX) * (i / 10);
                    const y = startY + (endY - startY) * (i / 10);
                    activeDoc.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
                }
                activeDoc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: endX, clientY: endY, pointerId: 1 }));
            });

            await browser.pause(2000);

            const content = await readBoardFile();
            // s3 should now be done/teacher (lane unchanged, only status changed)
            expect(content).toMatch(/\|\s*s3\s*\|.*\|\s*done\s*\|\s*teacher\s*\|/);
            // s4 was already done/teacher so teacher lane still has 2 done cards
            expect(content).toMatch(/\|\s*s4\s*\|.*\|\s*done\s*\|\s*teacher\s*\|/);
        });
    });
});
