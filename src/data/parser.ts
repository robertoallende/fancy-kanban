// Parses raw fancy-kanban block text into a Board model.
// Input: the string content between the opening/closing fences.
// Output: a Board object (defined in src/model/board.ts).
// Responsibilities:
//   - Extract the schema comment (fields, workflow, view config)
//   - Parse the markdown table rows into Card objects
//   - Assign or preserve stable hidden IDs per row
//   - Handle multi-line cell content (encoded as <br>)
//   - Handle escaped pipe characters in cell values
//   - Backfill missing fields with their declared defaults
