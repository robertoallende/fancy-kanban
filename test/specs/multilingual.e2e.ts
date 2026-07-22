import { browser } from '@wdio/globals';

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

describe('Multilingual board rendering', function () {
    before(async function () {
        await openInPreview('multilingual-board.md');
    });

    it('renders the board without errors', async function () {
        const hasError = await browser.execute(() => document.querySelector('.fk-error') !== null);
        expect(hasError).toBe(false);

        const hasBoard = await browser.execute(() => document.querySelector('.fk-board') !== null);
        expect(hasBoard).toBe(true);
    });

    it('renders all three columns', async function () {
        const titles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-column__title')).map(el => el.textContent)
        );
        expect(titles).toContain('Want-to-read');
        expect(titles).toContain('Reading');
        expect(titles).toContain('Done');
    });

    it('renders Russian (Cyrillic) card titles', async function () {
        const cardTitles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-card__title')).map(el => el.textContent)
        );
        expect(cardTitles).toContain('Мастер и Маргарита');
        expect(cardTitles).toContain('Преступление и наказание');
        expect(cardTitles).toContain('Война и мир');
    });

    it('renders Japanese card titles', async function () {
        const cardTitles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-card__title')).map(el => el.textContent)
        );
        expect(cardTitles).toContain('雪国');
        expect(cardTitles).toContain('ノルウェイの森');
        expect(cardTitles).toContain('斜陽');
    });

    it('renders Chinese card titles', async function () {
        const cardTitles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-card__title')).map(el => el.textContent)
        );
        expect(cardTitles).toContain('红楼梦');
        expect(cardTitles).toContain('三体');
        expect(cardTitles).toContain('活着');
    });

    it('renders Korean card titles', async function () {
        const cardTitles = await browser.execute(() =>
            Array.from(document.querySelectorAll('.fk-card__title')).map(el => el.textContent)
        );
        expect(cardTitles).toContain('채식주의자');
        expect(cardTitles).toContain('82년생 김지영');
        expect(cardTitles).toContain('아몬드');
    });

    it('renders all 12 cards across the three columns', async function () {
        const total = await browser.execute(() =>
            document.querySelectorAll('.fk-card').length
        );
        expect(total).toBe(12);
    });
});
