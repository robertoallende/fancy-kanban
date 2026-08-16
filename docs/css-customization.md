# CSS Customization

Fancy Kanban exposes structured data attributes on card elements so you can target cards by field value using CSS snippets in Obsidian (Settings → Appearance → CSS snippets).

## Data attributes on cards

Every rendered card carries the following attributes:

| Attribute | Where | Value |
|---|---|---|
| `data-card-id` | card root | internal card ID |
| `data-column` | card root | current column (status) value |
| `data-lane` | card root | current lane value (only when `lanes:` is configured) |
| `data-key` | field value span | field name |
| `data-value` | field value span | rendered field value |

Link fields are excluded from `data-key` / `data-value` — each link item already carries `data-href`.

### Example DOM

```html
<div class="fk-card" data-card-id="abc12345" data-column="doing" data-lane="alice">
  <div class="fk-card__title">Buy milk</div>
  <div class="fk-card__fields">
    <div class="fk-card__field">
      <span class="fk-card__field-label">Priority</span>
      <span class="fk-card__field-value" data-key="priority" data-value="High">High</span>
    </div>
  </div>
</div>
```

## Colored chips (built-in)

Select fields support a built-in `colors` config key that maps option names to hex colors. When a color is defined for a value, it renders automatically as a colored pill — no CSS required.

Configure colors in the board setup modal (Fields tab → options editor) or directly in the config block:

```
- name: priority, type: Select, options: High|Medium|Low,
  colors: High=#e74c3c|Medium=#f39c12|Low=#27ae60, label: Priority
```

The pill uses white text on all background colors. You can override this with CSS using the `data-value` attribute that is still present on chip spans:

```css
/* Soften shipped chips in the done column */
.fk-card[data-column="done"] .fk-card__field-chip[data-value="Shipped"] {
    opacity: 0.6;
}
```

See `samples/colored-select.md` for a working example.

## Recipes

### Color a card by column

```css
.fk-card[data-column="inbox"] {
    border-left: 4px solid steelblue;
}

.fk-card[data-column="blocked"] {
    border-left: 3px solid crimson;
    opacity: 0.7;
}
```

### Color a card by a field value

```css
/* Red background when priority is High */
.fk-card:has(.fk-card__field-value[data-key="priority"][data-value="High"]) {
    background-color: #ffcccc;
}

/* Muted when effort is 0 */
.fk-card:has(.fk-card__field-value[data-key="effort"][data-value="0"]) {
    opacity: 0.5;
}
```

### Combining both in one file

Multiple rules work together in a single snippet file:

```css
.fk-card[data-column="inbox"] {
    border-left: 4px solid steelblue;
}

.fk-card:has(.fk-card__field-value[data-key="priority"][data-value="High"]) {
    background-color: #ffcccc;
}
```

### Combine column and field value

```css
/* Highlight overdue cards only in the "doing" column */
.fk-card[data-column="doing"]:has(.fk-card__field-value[data-key="due"][data-value="2026-08-01"]) {
    outline: 2px solid orange;
}
```

### Color by lane

```css
.fk-card[data-lane="alice"] {
    border-top: 2px solid teal;
}

.fk-card[data-lane="bob"] {
    border-top: 2px solid goldenrod;
}
```

## How to apply a snippet

1. Create a `.css` file with any name in your vault's `.obsidian/snippets/` folder (create the folder if it does not exist).
2. Paste your CSS rules into the file.
3. Open Obsidian Settings → Appearance → CSS snippets and enable the file.

Changes to the file take effect immediately — no reload required.

## Notes

- `data-key` matches the field's `name` as defined in the board config, not its `label`. If a rule is not matching, use the devtools element picker to check the exact string in `data-key` on the span.
- `data-value` reflects the stored value, not a display-transformed one. Date values are ISO strings (`2026-08-17`); Select values match the option name exactly as defined in the board config.
- `:has()` is supported in all modern browsers and in the Electron build of Obsidian that ships the desktop app.
- Textarea and checklist fields do not receive `data-key` / `data-value` because their content renders as structured sub-elements rather than a single value span.
