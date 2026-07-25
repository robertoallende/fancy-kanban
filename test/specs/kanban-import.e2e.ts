import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

const VAULT = './test/vaults/simple';
const SOURCE_FILE = 'kanban-import-source.md';
const OUTPUT_FILE = 'kanban-import-source-fk.md';
const OUTPUT_PATH = path.resolve(VAULT, OUTPUT_FILE);

async function openFile(fileName: string): Promise<void> {
    await browser.reloadObsidian({ vault: VAULT });
    await browser.executeObsidian(async ({ app }, name) => {
        const file = app.vault.getAbstractFileByPath(name as string);
        if (file) await app.workspace.getLeaf().openFile(file as any);
    }, fileName);
    await browser.pause(1000);
}

async function runImportCommand(): Promise<void> {
    await browser.executeObsidian(async ({ app }) => {
        await (app as any).commands.executeCommandById('fancy-kanban:import-from-obsidian-kanban');
    });
    await browser.pause(1500);
}

async function readOutputFile(): Promise<string> {
    return browser.executeObsidian(async ({ app }, name) => {
        const file = app.vault.getAbstractFileByPath(name as string);
        if (!file) return '';
        return await app.vault.read(file as any);
    }, OUTPUT_FILE);
}

describe('Import from Obsidian Kanban', function () {
    beforeEach(async function () {
        if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
        await openFile(SOURCE_FILE);
        await runImportCommand();
    });

    afterEach(function () {
        if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
    });

    it('creates a new -fk.md file', async function () {
        const exists = await browser.executeObsidian(async ({ app }, name) => {
            return app.vault.getAbstractFileByPath(name as string) !== null;
        }, OUTPUT_FILE);
        expect(exists).toBe(true);
    });

    it('the generated file contains a fancy-kanban block', async function () {
        const content = await readOutputFile();
        expect(content).toContain('```fancy-kanban');
    });

    it('lanes become status column options: backlog, in-progress, done', async function () {
        const content = await readOutputFile();
        expect(content).toContain('options: backlog|in-progress|done');
    });

    it('cards from all non-archive lanes are imported', async function () {
        const content = await readOutputFile();
        // 2 backlog + 1 in-progress + 2 done = 5 cards
        const rows = content.match(/^\| [a-z0-9]{8} \|/mg) ?? [];
        expect(rows.length).toBe(5);
    });

    it('card titles have metadata stripped', async function () {
        const content = await readOutputFile();
        expect(content).not.toContain('@{2026-01-20}');
        expect(content).not.toContain('#research');
        expect(content).not.toContain('[[Design Brief]]');
        expect(content).not.toContain('^block-id-1');
    });

    it('card titles preserve meaningful text', async function () {
        const content = await readOutputFile();
        expect(content).toContain('Research competitors');
        expect(content).toContain('Project kickoff');
    });

    it('archive cards are not imported', async function () {
        const content = await readOutputFile();
        expect(content).not.toContain('Old archived task');
    });

    it('card body maps to description field', async function () {
        const content = await readOutputFile();
        expect(content).toContain('Additional notes on the bug');
    });
});
