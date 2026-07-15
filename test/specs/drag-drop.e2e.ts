import { browser, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const BOARD_FILE = path.resolve(VAULT, 'board.md');

describe('Drag and drop', function () {
    beforeEach(async function () {
        await browser.reloadObsidian({ vault: VAULT });
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
    });

    it('moves a card to another column and persists to file', async function () {
        const card = await $('[data-card-id="c1"]');
        const targetCol = await $('[data-column-value="done"]');

        await card.waitForExist({ timeout: 5000 });
        await targetCol.waitForExist({ timeout: 5000 });

        const beforeDrag = await browser.execute(() =>
            document.querySelector('[data-column-value="done"] [data-card-id="c1"]') ? 'c1 in done' : 'c1 not in done'
        );
        console.log('BEFORE DRAG:', beforeDrag);

        const dragResult = await browser.execute(() => {
            const card = document.querySelector('[data-card-id="c1"]') as HTMLElement;
            const col = document.querySelector('[data-column-value="done"]') as HTMLElement;
            if (!card || !col) return 'ELEMENTS NOT FOUND';

            const cardRect = card.getBoundingClientRect();
            const colRect = col.getBoundingClientRect();
            const startX = cardRect.left + cardRect.width / 2;
            const startY = cardRect.top + cardRect.height / 2;
            const endX = colRect.left + colRect.width / 2;
            const endY = colRect.top + colRect.height / 2;

            let boardGotPointerDown = false;
            let boardBubbleGotPD = false;
            let moveFires = 0;
            let upFires = 0;
            const board = document.querySelector('.fk-board');
            board?.addEventListener('pointerdown', () => { boardGotPointerDown = true; }, { once: true, capture: true });
            board?.addEventListener('pointerdown', () => { boardBubbleGotPD = true; }, { once: true });

            const activeDoc = (window as any).activeDocument ?? document;
            activeDoc.addEventListener('pointermove', () => moveFires++);
            activeDoc.addEventListener('pointerup', () => upFires++);

            card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: startX, clientY: startY, pointerId: 1 }));

            const colAtEnd = activeDoc.elementFromPoint(endX, endY);
            const colCheck = colAtEnd?.closest('[data-column-value]')?.getAttribute('data-column-value') ?? 'NULL';

            for (let i = 1; i <= 10; i++) {
                const x = startX + (endX - startX) * (i / 10);
                const y = startY + (endY - startY) * (i / 10);
                activeDoc.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
            }

            // Check drag state BEFORE pointerup (clearDropState runs in onUp)
            const isDraggingMid = card.classList.contains('fk-card--dragging');
            const dragOverColsMid = Array.from(document.querySelectorAll('.fk-column--drag-over'))
                .map(el => (el as HTMLElement).dataset.columnValue);

            activeDoc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: endX, clientY: endY, pointerId: 1 }));

            const dx1 = (endX - startX) * 0.1;
            const dy1 = (endY - startY) * 0.1;
            const dist1sq = dx1 * dx1 + dy1 * dy1;

            return [
                `boardGotPD:${boardGotPointerDown}`,
                `boardBubblePD:${boardBubbleGotPD}`,
                `moves:${moveFires}`,
                `ups:${upFires}`,
                `start:(${Math.round(startX)},${Math.round(startY)})`,
                `end:(${Math.round(endX)},${Math.round(endY)})`,
                `dist1sq:${Math.round(dist1sq)}`,
                `colCheck:${colCheck}`,
                `draggingMid:${isDraggingMid}`,
                `dragOverMid:${JSON.stringify(dragOverColsMid)}`,
            ].join(' ');
        });
        console.log('DRAG RESULT:', dragResult);

        await browser.pause(2000);

        const afterDrag = await browser.execute(() =>
            document.querySelector('[data-column-value="done"] [data-card-id="c1"]') ? 'c1 in done' : 'c1 not in done'
        );
        console.log('AFTER DRAG:', afterDrag);

        const vaultContent = await browser.executeObsidian(async ({ app }) => {
            const file = app.vault.getAbstractFileByPath('board.md');
            if (!file) return 'FILE NOT FOUND';
            return await app.vault.read(file as any);
        });
        console.log('VAULT CONTENT:', vaultContent.slice(vaultContent.indexOf('| _id'), vaultContent.indexOf('```', vaultContent.indexOf('| _id'))));
        expect(vaultContent).toMatch(/\|\s*c1\s*\|.*\|\s*done\s*\|/);
    });

    it('fails if card status is wrong', async function () {
        const content = fs.readFileSync(BOARD_FILE, 'utf8');
        expect(content).not.toMatch(/\|\s*c1\s*\|.*\|\s*done\s*\|/);
    });
});
