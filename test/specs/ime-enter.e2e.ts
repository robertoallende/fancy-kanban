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
    await browser.pause(3000);
}

function pressEnterInFirstTextInput(init: KeyboardEventInit & { keyCode?: number }): Promise<void> {
    return browser.execute((eventInit) => {
        const input = document.querySelector('.modal-container input[type="text"], .modal-container input:not([type])') as HTMLInputElement;
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...eventInit }));
    }, init);
}

function modalIsOpen(): Promise<boolean> {
    return browser.execute(() => document.querySelector('.modal-container') !== null);
}

describe('Card modal — IME composition', function () {
    beforeEach(async function () {
        await openInPreview('board.md');
        const card = await $('[data-card-id="c1"]');
        await card.click();
        await browser.pause(500);
    });

    it('does not save or close when Enter confirms an IME composition (isComposing)', async function () {
        expect(await modalIsOpen()).toBe(true);
        await pressEnterInFirstTextInput({ key: 'Enter', isComposing: true });
        await browser.pause(500);
        expect(await modalIsOpen()).toBe(true);
    });

    it('does not save or close on the WebKit composition Enter (keyCode 229)', async function () {
        await pressEnterInFirstTextInput({ key: 'Enter', keyCode: 229 });
        await browser.pause(500);
        expect(await modalIsOpen()).toBe(true);
    });

    it('still saves and closes on a normal Enter', async function () {
        await pressEnterInFirstTextInput({ key: 'Enter' });
        await browser.pause(500);
        expect(await modalIsOpen()).toBe(false);
    });
});
