// Serializes a Board model back to raw fancy-kanban block text.
// Input: a Board object (defined in src/model/board.ts).
// Output: the string that replaces the block's content in the source file.
// Responsibilities:
//   - Rebuild the schema comment from the current field/workflow/view config
//   - Rebuild the markdown table preserving column order
//   - Encode multi-line content and escape pipe characters
//   - Preserve orphaned/hidden fields for columns removed after data existed
//   - Round-trip guarantee: parse(serialize(board)) must equal board
