// In-memory types for a parsed kanban board and mutation operations.
// Types:
//   - Board: top-level container (schema, viewConfig, cards)
//   - Card: one row of data (id, field values as a map)
//   - ViewConfig: which field drives columns, which drives lanes
// Mutation helpers (pure functions returning a new Board):
//   - moveCard(board, cardId, newColumnValue, newLaneValue?)
//   - updateCardField(board, cardId, fieldName, value)
//   - addCard(board, initialValues)
//   - deleteCard(board, cardId)
