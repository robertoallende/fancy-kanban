// Pure rendering function: Board model → DOM.
// Shared by all entry points (postprocessor, CM6 widget, standalone view).
// Responsibilities:
//   - Build column containers from the column field's option values
//   - Group cards into columns (and swimlane rows if ViewConfig.lanes is set)
//   - Render each card using field-type handlers from the registry
//   - Attach drag handles and inline edit triggers (wired externally via callbacks)
//   - Must not import from integration/ — view-specific concerns live there
