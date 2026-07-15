import * as fs from 'fs';
import * as path from 'path';
import { parseObsidianVersions } from 'wdio-obsidian-service';
import { env } from 'process';

const cacheDir = path.resolve('.obsidian-cache');

const versions = await parseObsidianVersions(
    env.OBSIDIAN_VERSIONS ?? 'latest/earliest',
    { cacheDir },
);

if (env.CI) {
    console.log('obsidian-cache-key:', JSON.stringify(versions));
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',
    specs: ['./test/specs/**/*.e2e.ts'],
    maxInstances: Number(env.WDIO_MAX_INSTANCES ?? 1),

    capabilities: versions.map(([appVersion, installerVersion]) => ({
        browserName: 'obsidian',
        'wdio:obsidianOptions': {
            appVersion,
            installerVersion,
            plugins: ['.'],
            vault: 'test/vaults/simple',
        },
    })),

    services: ['obsidian'],
    reporters: ['obsidian'],

    cacheDir,
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },
    logLevel: 'warn',

    afterTest: async function () {
        const coverage = await browser.execute(
            () => (window as any).__coverage__ ?? null
        );
        if (!coverage) return;
        const outDir = path.resolve('.nyc_output');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
            path.join(outDir, `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.json`),
            JSON.stringify(coverage)
        );
    },
};
