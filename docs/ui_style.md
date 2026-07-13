# UI Style System

Reference document for the visual design language used across Fancy Lens. Covers color, spacing, borders, typography, and component patterns.

---

## Color System

The app uses Material 3 with a **fully custom `ColorScheme`** — no dynamic color, no seed-generated palette. Both light and dark schemes are defined in `lib/app.dart`.

### Light Scheme

| Role | Hex | Usage |
|------|-----|-------|
| `primary` | `#3a7fd4` | Active icons, accent controls, filled buttons |
| `onPrimary` | `#FFFFFF` | Text on primary-filled surfaces |
| `primaryContainer` | `#E6F0FE` | File link chips background, drag-hover column tint |
| `onPrimaryContainer` | `#1a5faa` | Text on primary container |
| `surface` | `#FFFFFF` | Card backgrounds, sheet backgrounds |
| `onSurface` | `#333333` | Primary text color |
| `surfaceContainerLow` | `#f8f8f8` | Editor background (content area) |
| `surfaceContainerHigh` | `#f3f4f4` | Column backgrounds, toolbar/bar backgrounds, hover state |
| `outline` | `#E2E2E2` | Card borders, toolbar borders, dividers |
| `outlineVariant` | `#dfe2e5` | Lighter separators |
| `error` | `#C8601A` | Delete buttons, error states |
| `onError` | `#FFFFFF` | Text on error surfaces |

### Dark Scheme

| Role | Hex | Usage |
|------|-----|-------|
| `primary` | `#7ab4ff` | Active icons, accent controls |
| `onPrimary` | `#003060` | Text on primary-filled surfaces |
| `primaryContainer` | `#2a4a6a` | File link chips, drag-hover tint |
| `onPrimaryContainer` | `#bdd6ff` | Text on primary container |
| `surface` | `#242424` | Card backgrounds |
| `onSurface` | `#D6D5D4` | Primary text color |
| `surfaceContainerLow` | `#2e2e2e` | Editor background |
| `surfaceContainerHigh` | `#171717` | Column backgrounds, toolbar backgrounds, hover |
| `outline` | `#3A3A3A` | Card borders, toolbar borders |
| `outlineVariant` | `#70717d` | Lighter separators |
| `error` | `#E07040` | Delete buttons, error states |

### Design Principle

- **No colored backgrounds for status** — columns use neutral `surfaceContainerHigh`, not per-status colors
- **Borders define structure** — cards use `outline` border, not drop shadow
- **Muted secondary content** — alpha values on `onSurface` for hierarchy:
  - `1.0` — primary text (titles, values)
  - `0.75` — secondary text (field values on cards)
  - `0.6` — labels, icons
  - `0.5` — column headers, muted actions, section labels
  - `0.45` — tertiary metadata (vault paths, field labels on cards)
  - `0.4` — item counts, inactive view icons
  - `0.35` — version string, placeholders
  - `0.2` — drag handle icon
  - `0.12` — active filter/sort icon background tint (`primary` at 12%)

---

## Typography

### Font

- **macOS / iOS**: `.AppleSystemUIFont` (system font)
- **Other platforms**: Flutter default (Roboto on Android, Segoe on Windows)
- **App title / screen titles**: `fontFamily: 'ScienceGothic'` (custom)

### Text Styles (Material 3 defaults)

| Context | Style | Modifications |
|---------|-------|---------------|
| Card title | `bodyMedium` | `maxLines: 2, overflow: ellipsis` |
| Card secondary label | `labelSmall` | `alpha: 0.45` on `onSurface` |
| Card secondary value | `labelSmall` | `alpha: 0.75` on `onSurface` |
| Column header | `labelSmall` | `fontWeight: w700, letterSpacing: 1.4px` (10% of 14), `alpha: 0.5` |
| Item count (column) | `labelSmall` | `alpha: 0.4` |
| File list entry | `bodyMedium` | — |
| Section label (settings) | `labelMedium` | `fontWeight: w600, letterSpacing: 0.8` |
| Sheet title | `titleMedium` | `fontWeight: w600` |
| Form field label | `labelMedium` | `alpha: 0.6` |
| Version string | `bodySmall` | `alpha: 0.35` |

### Column Header Style

```
INBOX        3
```

- Uppercase text
- 700 weight, wide letter spacing (10% of font size)
- Muted at 50% alpha
- Count right-aligned, even more muted (40%)

---

## Layout Constants

### Content Width

| Context | Max Width |
|---------|-----------|
| Kanban board | `960 px` |
| File list | `960 px` |
| Settings content | `560 px` |
| Item sheet (dialog) | `480 px` |
| Editor content | `960 px` |

All content areas are `Center > ConstrainedBox(maxWidth: ...)`.

### Spacing

| Context | Value |
|---------|-------|
| Board outer padding | `12 px` all sides |
| Column inner padding | `16 px` all sides |
| Column spacing (horizontal) | `12 px` |
| Column spacing (vertical, stacked mode) | `12 px` |
| Column header bottom margin | `12 px` |
| Card bottom margin | `6 px` |
| Card internal padding | `12 px horizontal, 10 px vertical` |
| Secondary field row spacing | `2 px` top |
| Secondary field label-to-value gap | `6 px` |
| File chip wrap spacing | `4 px` |
| File list outer padding | `24 px` all sides |
| List tile padding | `12 px horizontal, 10 px vertical` |
| List tile bottom margin | `2 px` |
| Settings padding | `24 px` all sides |
| Sheet content padding | `16 px` all sides |
| Sheet header/footer padding | `16 px horizontal, 12 px vertical` |

### Kanban Column Width

```dart
const maxWidth = 960.0;
const padding = 24.0;    // board padding (12 per side × 2 effectively used as available)
const spacing = 12.0;
const minColWidth = 200.0;
```

- If all columns fit: `colWidth = (available - spacing * (count - 1)) / count`
- If not all fit: switch to vertical stacking (columns as full-width rows)

---

## Border Radius

| Component | Radius |
|-----------|--------|
| Kanban card | `6 px` |
| Kanban column | `8 px` |
| File list tile (hover) | `8 px` |
| Vault tile (hover) | `8 px` |
| Filter/sort bar container | `6 px` |
| Filter/sort icon (active bg) | `7 px` |
| Theme switcher container | `6 px` |
| Theme switcher button | `4 px` |
| File chip | `4 px` |
| Bottom sheet top | `16 px` (vertical only) |
| Drag drop indicator bar | `2 px` |

### Design Principle

- Small interactive components: `4–6 px`
- Container/group elements: `6–8 px`
- Large surfaces (sheets): `16 px`
- No pill shapes (no `borderRadius: 999`) anywhere

---

## Cards (Kanban)

### Default State

```dart
Container(
  decoration: BoxDecoration(
    color: surface,
    border: Border.all(color: outline),
    borderRadius: BorderRadius.circular(6),
  ),
)
```

- **Solid background** (`surface`) — white in light, dark gray in dark
- **1px border** using `outline` — no shadow, no elevation
- **No hover effect** on the card itself (hover is handled at the list tile level elsewhere)

### Done State

- Title: `lineThrough` decoration + 50% alpha on `onSurface`
- Secondary fields: no strikethrough, shown normally
- Entire card: `Opacity(opacity: 0.4)` when used as `childWhenDragging`

### Drag Feedback

```dart
Material(
  elevation: 4,
  borderRadius: BorderRadius.circular(6),
  child: SizedBox(width: 240, child: cardContent()),
)
```

- Lifted with elevation 4 shadow
- Fixed width 240 px
- Same card content, not dimmed

### Drag Handle

- `Icons.drag_indicator`, size `14`
- 20% alpha on `onSurface` — very subtle
- 8 px horizontal padding
- Right side of the card in a `Row`
- `ReorderableDragStartListener` wraps the icon

---

## Columns (Kanban)

### Default State

```dart
Container(
  decoration: BoxDecoration(
    color: surfaceContainerHigh,
    borderRadius: BorderRadius.circular(8),
  ),
)
```

- **Solid fill** — no border on columns by default
- Color: slightly tinted neutral (`surfaceContainerHigh`)

### Drag Hover State (DragTarget accepts)

```dart
Container(
  decoration: BoxDecoration(
    color: primaryContainer.withValues(alpha: 0.5),
    borderRadius: BorderRadius.circular(8),
    border: Border.all(color: primary),
  ),
)
```

- Background shifts to tinted `primaryContainer` at 50% alpha
- Gains a `primary` color border
- A `2 px` accent bar appears at the bottom (primary color, 2 px radius)

### Add Item Button

```dart
TextButton.icon(
  icon: Icon(Icons.add, size: 16),
  label: Text('Add item'),
  foregroundColor: onSurface.withValues(alpha: 0.5),
)
```

- Muted text button, not outlined or filled
- Always visible at column bottom

---

## File List (Browser)

### Tile Pattern

```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
  margin: EdgeInsets.only(bottom: 2),
  decoration: BoxDecoration(
    color: _hovered ? surfaceContainerHigh : Colors.transparent,
    borderRadius: BorderRadius.circular(8),
  ),
)
```

- **No border** — tiles are borderless
- **Hover only**: background fills with `surfaceContainerHigh` on mouse enter
- **Transparent by default** — list items blend into the page background
- Cursor changes to `SystemMouseCursors.click` on hover

### Tile Content

- Leading icon: `size: 20`, `alpha: 0.6` on `onSurface`
- 12 px gap between icon and text
- Text: `bodyMedium`, ellipsis overflow
- Icons:
  - Folder: `Icons.folder_outlined`
  - Kanban: `Icons.view_kanban_outlined`
  - Markdown: `Icons.description_outlined`

### Empty State

```dart
Text('Empty folder.', style: bodySmall, color: onSurface @ 0.4)
```

Centered in the viewport.

---

## Filter & Sort Bars

### Container

```dart
Container(
  height: 32,
  decoration: BoxDecoration(
    color: surfaceContainerHigh,
    border: Border.all(color: outline),
    borderRadius: BorderRadius.circular(6),
  ),
)
```

- Fixed 32 px height
- Solid background + border (not floating/shadow)
- Lives in the app bar `leading` area

### Icon Buttons (inside bar)

```dart
Container(
  width: 30,
  height: 32,
  decoration: BoxDecoration(
    color: active ? primary.withValues(alpha: 0.12) : Colors.transparent,
    borderRadius: BorderRadius.circular(7),
  ),
  child: Icon(icon, size: 16, color: active ? primary : onSurface @ 0.5),
)
```

- Active: subtle primary tint background (12% alpha) + primary icon color
- Inactive: transparent background + muted icon (50% alpha)
- No borders between icons — they rely on background fill to show state

---

## Theme Switcher

Same pattern as filter bar but smaller:

- Container: `surfaceContainerHigh` fill + `outline` border, `6 px` radius, `2 px` internal padding
- Buttons: `28 × 24 px`, `4 px` radius
- Active: solid `primary` background with `onPrimary` icon
- Inactive: transparent with muted icon
- Icon size: `14`

---

## Dialogs & Sheets

### Platform Adaptive

- **Desktop** (macOS, Windows, Linux, web): `showDialog` with `Dialog > ConstrainedBox(maxWidth: 480)`
- **Mobile** (iOS, Android): `showModalBottomSheet` with `isScrollControlled: true`, safe area, rounded top corners (16 px)

### Sheet/Dialog Structure

```
┌─ Header ─────────────────────────────────┐
│  [Title]                          [✕]    │  16px horiz, 12px vert padding
├──────────────────────────────────────────┤
│  [Scrollable form fields]                │  16px all-sides padding
├──────────────────────────────────────────┤
│  [Delete]                    [Save]      │  16px horiz, 12px vert padding
└──────────────────────────────────────────┘
```

- No visible dividers between sections
- Title: `titleMedium` weight 600, single line ellipsis
- Close button: `Icons.close` IconButton
- Delete button: `OutlinedButton` with `error` color foreground + border
- Save button: `FilledButton` (primary)

### Form Fields

- Labels above inputs, `labelMedium` at 60% alpha
- 6 px gap between label and input
- 16 px bottom margin between fields
- Input decoration: `OutlineInputBorder`, `isDense: true`, `12px horiz / 10px vert` content padding
- Select fields: `DropdownButtonFormField`
- Date fields: read-only text field with calendar icon suffix → `showDatePicker`

---

## File Link Chips

### On kanban card

```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
  decoration: BoxDecoration(
    color: primaryContainer,
    borderRadius: BorderRadius.circular(4),
  ),
  child: Text(filename, style: labelSmall + onPrimaryContainer),
)
```

- Small pill-like chips with `primaryContainer` background
- Text shows filename without `.md` extension
- Tappable — opens file in editor

### In item sheet

- `InputChip` (Material) with delete icon
- `ActionChip` for "+ Add file"
- Wrap layout with 6 px spacing

---

## Navigation

### App Bar

- `centerTitle: true` on all screens
- Title font: `ScienceGothic` (custom)
- Back button: `Icons.arrow_back` IconButton (manual, not `automaticallyImplyLeading`)
- Actions: icon buttons for settings (`Icons.settings_outlined`), refresh (`Icons.refresh`), add (`Icons.add`)

### View Picker (in app bar actions)

- Row of `IconButton`s, one per available view
- Active: `primary` color
- Inactive: `onSurface` at 40% alpha
- Optional "Edit fields" button: `Icons.tune` at 40% alpha

---

## Transitions

| Navigation | Animation |
|------------|-----------|
| List → Board | Scale 0.9→1.0 + fade in |
| Board → List | Reverse (scale 1.0→0.9 + fade out) |
| Board → Board (nav bar) | Horizontal slide |
| Any → Settings | No transition or simple fade |

---

## General Principles

1. **Borders over shadows** — Cards use 1px borders, not elevation/shadow (except drag feedback)
2. **Solid fills over translucent overlays** — Columns and toolbars have opaque `surfaceContainerHigh` backgrounds
3. **Subtle hover, no active/pressed states** — Hover fills background; no ripple/splash effects on custom components
4. **Color restraint** — Primary color appears only for active state indicators and accent actions; everything else is neutral
5. **Consistent radius progression** — 4→6→8→16 px, no arbitrary values
6. **Dense but readable** — Small padding values (6–12 px), `isDense: true` inputs, `labelSmall` for metadata
7. **No dividers** — Sections separated by spacing alone; no `Divider` widgets in sheets/settings/lists
8. **Uppercase sparingly** — Only column headers use uppercase; all other text is natural case
