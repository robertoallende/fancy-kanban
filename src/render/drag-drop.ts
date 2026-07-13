// Drag-and-drop logic for moving cards between columns and swimlane rows.
// Responsibilities:
//   - Attach drag event listeners to the board DOM produced by board-view.ts
//   - On drop: call workflow.isTransitionAllowed() to validate the move
//   - On valid drop: call the board model's moveCard() mutation
//   - On invalid drop: show a visual rejection cue (no state change)
//   - Invoke a write-back callback (provided by the integration layer) after
//     each successful mutation so the source file is updated
