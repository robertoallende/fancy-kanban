// Parses workflow declarations and validates status transitions.
// Input: a workflow string, e.g. "Todo→In Progress, In Progress→Done"
// Responsibilities:
//   - Parse arrow-separated transition pairs into an adjacency map
//   - Handle unicode arrow variants (→, ->, ➜, etc.)
//   - Expose isTransitionAllowed(from, to) for use by drag-drop logic
//   - When no workflow is declared, all transitions are allowed
