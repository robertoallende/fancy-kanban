# Changelog

## 0.11.1 - 29/08/2026

- Fixed clicking a card doing nothing after the 0.11.0 drag-highlight change — the pressed state now uses a separate class without `pointer-events: none`, so clicks reach the card and open the editor as expected #19

## 0.11.0 - 27/08/2026

- Added `SKILL.md` — install Fancy Kanban as an agent skill with `npx skills add robertoallende/fancy-kanban` to give your AI coding assistant the full board schema; works with Claude Code, Kiro, Codex, Pi, and [75+ other agents](https://skills.sh)
- Fixed the Columns field in the Layout settings tab not persisting across reloads — the selected field was never written to the config block, so the board always reverted to the first Select field on restart #15
- Fixed drag-and-drop visual feedback: the card highlight now appears immediately on press rather than only after the pointer has moved #16

## 0.10.0 - 19/08/2026

- Fixed a bug where Select fields with a configured default did not store that default when a new card was saved without the user touching the field; the default is now always applied on save
- Added `card_limit` config key to cap the number of visible cards per column; cards beyond the limit are hidden, with a "Show more" button at the bottom of the column to reveal them all at once — useful for keeping a long Done column from scrolling endlessly
- Restyled the board setup modal tab bar: unselected tabs now render as individual bordered buttons with transparent background; the active tab gets a solid fill — matching the segmented button style used in Fancy Charts

## 0.9.0 - 17/08/2026

- Board setup modal is now organised into three tabs — Fields, Layout, and Card display — making it easier to navigate as boards grow more complex; switching tabs preserves all unsaved changes
- Card face now renders inline markdown: `**bold**`, `*italic*`, `~~strikethrough~~`, and `` `code` `` are formatted in all text fields including the card title; Textarea fields also support unordered and ordered lists, and mixed prose-and-list content renders in document order
- Select fields now support per-option colors: assign a hex color to each option via the board setup Fields tab (each option has its own name input and color swatch); matching values render as colored pill chips on the card face; the `colors` config key is also available for hand-editing; see `samples/colored-select.md` for an example
- Cards now expose data attributes (`data-column`, `data-lane`, `data-key`, `data-value`) on their DOM elements, enabling CSS color-coding via Obsidian snippets; see `docs/css-customization.md` for examples #14

## 0.8.2 - 30/07/2026

- Fixed long link URLs overflowing the card face: link labels now truncate with an ellipsis and the full URL is shown on hover #11
- Fixed the Type and Default dropdowns in the board setup fields table clipping their longest values ("Textarea" and "yesterday") due to Obsidian's native select chevron occupying space not accounted for in the fixed column widths #12
- Added relative date defaults for Date fields: board setup now offers yesterday / today / tomorrow as default options; the card modal resolves the keyword to the actual date when a new card is created #13

## 0.8.1 - 30/07/2026

- Re-release to resolve a manifest scanning issue with the Obsidian community plugin directory; no code changes

## 0.8.0 - 29/07/2026

- Fixed intermittent blank rendering when a board block is at the top of a note or the cursor is positioned inside it: the post-processor now wraps board mounting in `MarkdownRenderChild.onload()` so Obsidian controls render timing ([#10](https://github.com/robertoallende/fancy-kanban/issues/10))

## 0.7.1 - 27/07/2026

- Improved test coverage for the render layer: the swimlane grid, lane-aware card modal, and column rendering are now covered by unit tests (578 tests across 27 files, up from 557); a `codecov.yml` policy sets appropriate thresholds per layer so the render layer's e2e-tested paths do not cause false failures
- Added a support button to the plugin manifest — a heart icon now appears next to Fancy Kanban in Obsidian's Installed Plugins screen, linking to GitHub Sponsors for anyone who wants to help sustain development

## 0.7.0 - 26/07/2026

- Added swimlane support: set `lanes: <field>` in the board config to group cards by a second Select field; the board renders as a grid with column headers across the top and lane labels on the left; dragging a card to a different lane row updates both the column and lane field values; the board settings modal includes a swimlane field picker

## 0.6.0 - 25/07/2026

- Added "Import from Obsidian Kanban" command: open any board created by the Obsidian Kanban plugin and run the command to generate a new `<filename>-fk.md` file in the same folder with the equivalent Fancy Kanban board — lanes become status columns, card titles are preserved (inline metadata such as dates, tags, and block IDs are stripped), and multi-line card bodies map to a `description` Textarea field

## 0.5.1 - 24/07/2026

- Fixed checklist checkboxes not rendering in real vaults: build output (`main.js`, `styles.css`) is now automatically copied to `.obsidian/plugins/fancy-kanban/` after every production build
- Fixed card editor modal opening when clicking a checklist checkbox
- Fixed checklist checkbox vertical alignment with label text

## 0.5.0 - 23/07/2026

- Removed the `File` field type — boards using `type: File` now fail to parse with an explicit error message; migrate to `Link` fields which have supported file attachments since 0.3.0
- Added checklist support for `Textarea` fields: lines beginning with `- [ ]` or `- [x]` render as interactive checkboxes directly on the card face; toggling a checkbox persists the updated state to the board file; plain-text lines within the same field render as non-interactive text; clicking a checkbox no longer opens the card editor modal

## 0.4.3 - 22/07/2026

- Fixed non-Latin field labels (Cyrillic, CJK, Hangul, Arabic, etc.) collapsing to an empty name when added via the board settings modal — `deriveFieldName` now uses Unicode property escapes (`\p{L}\p{N}`) instead of the ASCII-only `[a-z0-9]` character class
- Added multilingual sample board (`samples/multilingual.md`) with cards in Russian, Japanese, Chinese, and Korean

## 0.4.2 - 22/07/2026

- Fixed renaming a column (status option) via board settings causing all cards in that column to disappear — cards are now migrated to the new option name on save

## 0.4.1 - 21/07/2026

- Fixed promise-in-void-context warning: `loadIfDeferred()` return value is now explicitly discarded with `void` in the `forEach` callback

## 0.4.0 - 21/07/2026

- Swapped Save and Delete button positions in the card editor modal — Save is now on the left, Delete on the right
- Updated `docs/schema.md`: documented `version`, `card_title`, `card_labels` config keys; corrected `card_fields` description (secondary fields only); reordered all examples to list `title` before `status`; added field ordering convention
- Fixed standalone board view not rendering on Obsidian startup or tab restore: deferred leaves now materialize via `onLayoutReady`, and the view persists the open file path across sessions via `getState`/`setState`

## 0.3.4 - 20/07/2026

- Replaced `createEl('div', ...)` and `createEl('span', ...)` calls with the `createDiv()` and `createSpan()` shorthand helpers required by the Obsidian reviewer `prefer-create-el` rule

## 0.3.3 - 20/07/2026

- Migrated all standalone `createEl()` calls to the method form `parentEl.createEl()` across all render and integration files, satisfying the Obsidian reviewer `prefer-create-el` rule and ensuring correct document context in popout windows
- Updated `renderBoard`, `renderColumn`, and `renderCard` signatures to accept a `parent: HTMLElement` first argument

## 0.3.2 - 20/07/2026

- Removed `!important` from `.fk-hidden` — specificity now handled via a combined selector, satisfying the Obsidian reviewer requirement
- Extended `scripts/lint-obsidian.mjs`: catches `!important` in CSS, warns on vault enumeration calls, and covers `activeDocument.createElement` in addition to `document.createElement`

## 0.3.1 - 20/07/2026

- Replaced DOM API calls with Obsidian helpers (`createEl`, `activeDocument`) to comply with plugin reviewer requirements
- Replaced inline style assignments with CSS utility classes (`fk-hidden`, `fk-flex-1`)
- Removed unnecessary type assertions flagged by the Obsidian linter
- Added workflow transition toast: blocked moves now show an actionable message explaining which transition to add to the workflow
- Added `scripts/lint-obsidian.mjs` to catch the above violations in CI before submission

## 0.3.0 - 20/07/2026

- Link field: attach files and URLs to cards, with add/remove list UI and click-to-open navigation
- Card face fields: configure which fields appear on each card using `card_fields` in the board config; fields render in order with label and value; Link fields render as clickable inline links
- Status dropdown in card editor: change a card's column directly from the editor without drag-and-drop
- Schema version bumped to 2: boards saved with this release require plugin version 0.3.0 or later to edit; older versions will open them in read-only mode

## 0.2.0 - 15/07/2026

- Board format reliability and keyboard usability ([#3](https://github.com/robertoallende/fancy-kanban/issues/3))

## 0.1.4 - 15/07/2026

- Close card modal automatically after saving a new card ([#2](https://github.com/robertoallende/fancy-kanban/issues/2))

## 0.1.3 - 15/07/2026

- Moved the delete card button from the card face into the card editor modal
- Fixed drag and drop on iPad — cards can now be dragged to other columns without triggering iOS text selection ([#1](https://github.com/robertoallende/fancy-kanban/issues/1))

## 0.1.2 - 14/07/2026

- CI/CD Improvement in Fancy-Kanban repository.

## 0.1.1 - 14/07/2026

- Fixes for warning triggered by Obisidian CI/CD

## 0.1.0 - 13/07/2026

- Boards embedded directly in notes — no separate view required, boards render inline alongside your other content
- Relational card data — define custom fields (text, long text, date, number, select, file) per board, not just a title and a list of tags
- Drag-and-drop — reorder cards within and across columns, with workflow validation
- Card editor — a dedicated modal for viewing and editing every field on a card
- Standalone board view — open a board in its own pane via the ribbon icon or command palette, in addition to inline embedding
- Board setup panel — create and edit fields, columns, and workflow through a dedicated UI, no hand-editing the config block required
- Human-readable format — boards are stored as a fenced code block containing a config section and a standard Markdown table, so the data is still readable (as a table) even without the plugin installed
