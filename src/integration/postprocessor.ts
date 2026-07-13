// Registers the 'fancy-kanban' markdown code block processor.
// Wires together: parser → board-view → drag-drop → write-back.
// Called from main.ts: this.registerMarkdownCodeBlockProcessor('fancy-kanban', handler)
// The handler receives the raw block source, target element, and context
// (which carries the source file path needed for write-back).
