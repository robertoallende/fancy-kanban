// Field type registry — maps a field type string to its handler.
// Each handler implements:
//   - render(value, el): render a read-only cell value into a DOM element
//   - edit(value, el, onChange): render an in-place editor into a DOM element
//   - serialize(value): convert the in-memory value to a table cell string
//   - validate(value): return an error string or null
// Built-in types registered here: Select, Text, Textarea, Date.
// Additional types (Number, Checkbox, MultiSelect, Relation) slot in
// by calling registerFieldType() without touching parser or board logic.
