// ItemView subclass for whole-file kanban boards.
// Thin wrapper: delegates rendering to board-view.ts.
// Adds board-specific chrome: toolbar, add-lane button, view type header.
// Registered as the default view for files identified as standalone boards
// (heuristic: single fancy-kanban block, optionally with minimal frontmatter).
