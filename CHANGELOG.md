# Changelog

## 0.3.0 - TBD

- Link field: attach files and URLs to cards, with add/remove list UI and click-to-open navigation
- Card face fields: configure which fields appear on each card using `card_fields` in the board config; fields render in order with label and value; Link fields render as clickable inline links

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