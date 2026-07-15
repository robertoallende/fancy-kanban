import { browser } from '@wdio/globals';

describe('Fancy Kanban', function () {
    before(async function () {
        await browser.reloadObsidian({ vault: './test/vaults/simple' });
    });

    it('plugin is active', async function () {
        const plugins = await browser.executeObsidian(({ app }) =>
            Object.keys((app as any).plugins.plugins)
        );
        expect(plugins).toContain('fancy-kanban');
    });
});
