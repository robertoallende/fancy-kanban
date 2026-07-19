# Fancy Kanban — Deprecations

This file tracks field types, config keys, and format features that have been deprecated. Deprecated items are still accepted by the parser (which emits a recoverable warning) but will stop working at the version listed in **Removes in**.

## How Deprecations Work

When the parser encounters a deprecated item it:

1. Coerces the value to its replacement automatically — the board loads and functions normally
2. Emits a `W_FIELD_TYPE_DEPRECATED` warning, which appears as a dismissible banner in the board view
3. Includes a hint pointing to the exact change needed in the raw config

No data is lost. Boards continue to work until the removal version.

## Field Type Deprecations

| Deprecated type | Replacement | Deprecated in | Removes in | Migration |
|-----------------|-------------|---------------|------------|-----------|
| `File` | `Link` | 0.3.0 | 0.5.0 | Replace `type: File` with `type: Link` in your board config |

## Migrating a Board

To silence the deprecation warning, open the raw markdown and update the field definition:

```diff
- - name: docs, type: File, label: Docs
+ - name: docs, type: Link, label: Docs
```

The board data (table rows) is unaffected — only the config line changes.

## Future Planned Deprecations

None currently scheduled.
