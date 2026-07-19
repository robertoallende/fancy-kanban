import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

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

async function dragCard(cardId: string, targetColumnValue: string): Promise<void> {
    await browser.execute((cId, colVal) => {
        const card = document.querySelector(`[data-card-id="${cId}"]`) as HTMLElement;
        const col = document.querySelector(`[data-column-value="${colVal}"]`) as HTMLElement;
        if (!card || !col) return;

        const cardRect = card.getBoundingClientRect();
        const colRect = col.getBoundingClientRect();
        const startX = cardRect.left + cardRect.width / 2;
        const startY = cardRect.top + cardRect.height / 2;
        const endX = colRect.left + colRect.width / 2;
        const endY = colRect.top + colRect.height / 2;

        const activeDoc = (window as any).activeDocument ?? document;
        card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: startX, clientY: startY, pointerId: 1 }));
        for (let i = 1; i <= 10; i++) {
            const x = startX + (endX - startX) * (i / 10);
            const y = startY + (endY - startY) * (i / 10);
            activeDoc.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
        }
        activeDoc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: endX, clientY: endY, pointerId: 1 }));
    }, cardId, targetColumnValue);
    await browser.pause(2000);
}

describe('Data roundtrip', function () {
    describe('-> workflow syntax', function () {
        beforeEach(async function () {
            await openInPreview('workflow-board.md');
        });

        it('allows a move in the permitted direction (todo -> done)', async function () {
            await dragCard('wf1', 'done');
            const inDone = await browser.execute(() =>
                !!document.querySelector('[data-column-value="done"] [data-card-id="wf1"]')
            );
            expect(inDone).toBe(true);
        });

        it('blocks a move in the restricted direction (done -> todo)', async function () {
            await dragCard('wf2', 'todo');
            const stillInDone = await browser.execute(() =>
                !!document.querySelector('[data-column-value="done"] [data-card-id="wf2"]')
            );
            expect(stillInDone).toBe(true);
        });

        it('shows a toast with the blocked transition when a move is rejected', async function () {
            await dragCard('wf2', 'todo');
            const toastText = await browser.execute(() =>
                document.querySelector('.fk-toast')?.textContent ?? null
            );
            expect(toastText).not.toBeNull();
            expect(toastText).toContain("'done'");
            expect(toastText).toContain("'todo'");
            expect(toastText).toContain('done → todo');
        });
    });

    describe('backslash value preservation', function () {
        const BACKSLASH_FILE = path.resolve(VAULT, 'backslash-board.md');
        const originalContent = fs.readFileSync(BACKSLASH_FILE, 'utf8');

        afterEach(async function () {
            fs.writeFileSync(BACKSLASH_FILE, originalContent);
        });

        beforeEach(async function () {
            fs.writeFileSync(BACKSLASH_FILE, originalContent);
            await openInPreview('backslash-board.md');
        });

        it('displays backslash value correctly on the card', async function () {
            const card = await browser.execute(() => {
                const el = document.querySelector('[data-card-id="bs1"]');
                return el?.textContent ?? '';
            });
            expect(card).toContain('path\\to\\file');
        });

        it('backslash value survives a write-back cycle without doubling', async function () {
            await dragCard('bs1', 'done');

            const vaultContent = await browser.executeObsidian(async ({ app }) => {
                const file = app.vault.getAbstractFileByPath('backslash-board.md');
                if (!file) return '';
                return await app.vault.read(file as any);
            });

            // The serialized form should have \\ (escaped) but not \\\\ (double-escaped)
            expect(vaultContent).toMatch(/path\\\\to\\\\file/);
            expect(vaultContent).not.toMatch(/path\\\\\\\\to\\\\\\\\file/);
        });
    });
});
