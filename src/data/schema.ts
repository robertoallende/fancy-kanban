// Defines field declarations and handles schema reconciliation.
// Responsibilities:
//   - Types for FieldDefinition (name, type, label, options, default)
//   - Parse the schema section of a block into a list of FieldDefinitions
//   - Reconcile a parsed schema against existing row data:
//       - Fields added after data exists: backfill rows with the field's default
//       - Fields removed after data exists: preserve values as orphaned hidden data
//       - Fields renamed: treated as remove + add (no automatic migration)
