import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "module";
import { copyFileSync, existsSync } from "fs";

const prod = process.argv[2] === 'production';
const cov  = process.argv[2] === 'coverage';

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : cov ? true : "inline",
  treeShaking: true,
  outfile: "main.js",
});

const PLUGIN_DIR = ".obsidian/plugins/fancy-kanban";

function syncToVault() {
  if (!existsSync(PLUGIN_DIR)) return;
  copyFileSync("main.js", `${PLUGIN_DIR}/main.js`);
  copyFileSync("styles.css", `${PLUGIN_DIR}/styles.css`);
}

if (prod || cov) {
  await context.rebuild();
  syncToVault();
  process.exit(0);
} else {
  await context.watch();
}
