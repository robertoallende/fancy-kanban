var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FancyKanbanPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/integration/postprocessor.ts
var import_obsidian3 = require("obsidian");

// src/model/board.ts
var SUPPORTED_VERSION = 2;

// src/data/deprecations.ts
var W_FIELD_TYPE_DEPRECATED = "W_FIELD_TYPE_DEPRECATED";
var DEPRECATED_FIELD_TYPES = {
  File: { replacement: "Link", removeAt: "0.5.0" }
};

// src/data/schema.ts
function parseConfig(configText) {
  const lines = configText.split("\n");
  let title = "";
  let rawWorkflow = "";
  let lanes;
  let cardTitle;
  let cardFields;
  let cardLabels;
  let version = 1;
  const fields = [];
  const warnings = [];
  let inFields = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (inFields && trimmed.startsWith("- ")) {
      const { field, warning } = parseFieldLine(trimmed.slice(2));
      fields.push(field);
      if (warning) warnings.push(warning);
      continue;
    }
    inFields = false;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key === "title") title = value;
    else if (key === "version") version = parseInt(value, 10) || 1;
    else if (key === "workflow") rawWorkflow = value.replace(/^"(.*)"$/, "$1");
    else if (key === "lanes") lanes = value;
    else if (key === "card_title") cardTitle = value;
    else if (key === "card_fields") {
      const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length) cardFields = parts;
    } else if (key === "card_labels") {
      if (value === "false") cardLabels = false;
    } else if (key === "fields") inFields = true;
  }
  return {
    title,
    fields,
    rawWorkflow,
    version,
    viewConfig: { columns: "status", lanes, cardTitle, cardFields, cardLabels },
    warnings
  };
}
function parseFieldLine(line) {
  var _a;
  const kvs = {};
  const parts = splitFieldParts(line);
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim();
    const value = part.slice(colonIdx + 1).trim();
    if (key) kvs[key] = value;
  }
  if (!kvs["name"]) throw new Error(`Field definition missing 'name': ${line}`);
  if (!kvs["type"]) throw new Error(`Field definition missing 'type': ${line}`);
  const rawType = kvs["type"];
  const deprecation = DEPRECATED_FIELD_TYPES[rawType];
  const type = deprecation ? deprecation.replacement : rawType;
  const warning = deprecation ? {
    code: W_FIELD_TYPE_DEPRECATED,
    message: `Field type '${rawType}' is deprecated, use '${deprecation.replacement}' instead (will be removed in ${deprecation.removeAt})`,
    hint: `Replace 'type: ${rawType}' with 'type: ${deprecation.replacement}' in your board config`
  } : void 0;
  const field = {
    name: kvs["name"],
    type,
    label: (_a = kvs["label"]) != null ? _a : kvs["name"]
  };
  if (kvs["options"] !== void 0) field.options = kvs["options"].split("|");
  if (kvs["default"] !== void 0) field.default = kvs["default"];
  return { field, warning };
}
function splitFieldParts(line) {
  return line.split(",");
}
function reconcileCards(fields, cards) {
  return cards.map((card) => {
    var _a;
    const values = { ...card.values };
    for (const field of fields) {
      if (!(field.name in values)) {
        values[field.name] = (_a = field.default) != null ? _a : "";
      }
    }
    return { ...card, values };
  });
}
function migrateSelectRenames(oldFields, newFields, cards) {
  const renameMaps = {};
  for (const newField of newFields) {
    if (newField.type !== "Select") continue;
    const oldField = oldFields.find((f) => f.name === newField.name);
    if (!(oldField == null ? void 0 : oldField.options) || !newField.options) continue;
    if (oldField.options.length !== newField.options.length) continue;
    const map = {};
    for (let i = 0; i < oldField.options.length; i++) {
      if (oldField.options[i] !== newField.options[i]) {
        map[oldField.options[i]] = newField.options[i];
      }
    }
    if (Object.keys(map).length > 0) renameMaps[newField.name] = map;
  }
  if (Object.keys(renameMaps).length === 0) return cards;
  return cards.map((card) => {
    const values = { ...card.values };
    for (const [fieldName, map] of Object.entries(renameMaps)) {
      const current = values[fieldName];
      if (current !== void 0 && map[current] !== void 0) {
        values[fieldName] = map[current];
      }
    }
    return { ...card, values };
  });
}

// src/data/parser.ts
var E_NO_DELIMITERS = "E_NO_DELIMITERS";
var E_NO_TITLE = "E_NO_TITLE";
var E_NO_STATUS_FIELD = "E_NO_STATUS_FIELD";
var W_ROW_MALFORMED = "W_ROW_MALFORMED";
function splitRow(line) {
  const cells = [];
  let current = "";
  let i = 0;
  if (line[0] === "|") i = 1;
  while (i < line.length) {
    if (line[i] === "\\" && (line[i + 1] === "|" || line[i + 1] === "\\")) {
      current += line[i] + line[i + 1];
      i += 2;
    } else if (line[i] === "|") {
      cells.push(current);
      current = "";
      i++;
    } else {
      current += line[i];
      i++;
    }
  }
  if (current !== "") cells.push(current);
  return cells;
}
function unescapeCell(cell) {
  return cell.trim().replace(/<br\/?>/gi, "\n").replace(/\\[|]/g, "|").replace(/\\\\/g, "\\");
}
function parseTable(tableText, fields) {
  var _a, _b, _c;
  const lines = tableText.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return { cards: [], warnings: [] };
  const headerCells = splitRow(lines[0]).map((c) => unescapeCell(c).toLowerCase());
  const dataLines = lines.slice(2);
  const labelToField = /* @__PURE__ */ new Map();
  for (const field of fields) {
    labelToField.set(field.label.toLowerCase(), field.name);
  }
  const cards = [];
  const warnings = [];
  for (let rowIdx = 0; rowIdx < dataLines.length; rowIdx++) {
    const line = dataLines[rowIdx];
    const cells = splitRow(line).map(unescapeCell);
    if (cells.length === 0) {
      warnings.push({
        code: W_ROW_MALFORMED,
        message: `Row ${rowIdx + 1} could not be parsed and was skipped`,
        line: rowIdx + 1
      });
      continue;
    }
    const id = headerCells[0] === "_id" ? (_a = cells[0]) != null ? _a : "" : "";
    const startIdx = headerCells[0] === "_id" ? 1 : 0;
    const values = {};
    for (let i = startIdx; i < headerCells.length; i++) {
      const label = headerCells[i];
      const fieldName = (_b = labelToField.get(label)) != null ? _b : label;
      values[fieldName] = (_c = cells[i]) != null ? _c : "";
    }
    cards.push({ id, values });
  }
  return { cards, warnings };
}
function parseBlock(blockText) {
  try {
    const parts = blockText.split(/^---$/m);
    if (parts.length < 3) {
      return {
        ok: false,
        errors: [{ code: E_NO_DELIMITERS, message: "Block must contain two --- delimiters separating config from table" }],
        warnings: []
      };
    }
    const configText = parts[1].trim();
    const tableText = parts.slice(2).join("---");
    const { warnings: configWarnings, ...schema } = parseConfig(configText);
    if (!schema.title) {
      return {
        ok: false,
        errors: [{ code: E_NO_TITLE, message: "Board config is missing required field: title" }],
        warnings: []
      };
    }
    const columnsField = schema.fields.find((f) => f.name === schema.viewConfig.columns);
    if (!columnsField) {
      return {
        ok: false,
        errors: [{
          code: E_NO_STATUS_FIELD,
          message: `Columns field "${schema.viewConfig.columns}" is not defined in fields`,
          hint: "Add a field with that name, or update the columns setting to match an existing field"
        }],
        warnings: []
      };
    }
    const { cards: rawCards, warnings: tableWarnings } = parseTable(tableText, schema.fields);
    const warnings = [...configWarnings, ...tableWarnings];
    const cards = reconcileCards(schema.fields, rawCards);
    const board = { ...schema, cards };
    if (schema.version > SUPPORTED_VERSION) {
      return {
        ok: true,
        board,
        readonly: true,
        readonlyReason: `This board was created with version ${schema.version} of the Fancy Kanban format. Update the plugin to edit it.`,
        warnings
      };
    }
    return { ok: true, board, readonly: false, warnings };
  } catch (err) {
    return {
      ok: false,
      errors: [{ code: "E_UNEXPECTED", message: err instanceof Error ? err.message : String(err) }],
      warnings: []
    };
  }
}

// src/data/link.ts
function splitLinks(value) {
  if (!value) return [];
  return value.split("\n").filter((s) => s.length > 0);
}
function joinLinks(items) {
  return items.join("\n");
}
var URI_PATTERN = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//;
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["https:", "http:", "ftp:"]);
var MAILTO_PATTERN = /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/;
function validateLinkItem(raw) {
  const value = raw.trim();
  if (!value) return { valid: false, error: "Enter a path or URI" };
  if (value.startsWith("mailto:")) {
    return MAILTO_PATTERN.test(value) ? { valid: true } : { valid: false, error: "Enter a valid email address (mailto:user@example.com)" };
  }
  if (URI_PATTERN.test(value)) {
    try {
      const url = new URL(value);
      if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        return { valid: false, error: "URI must use https, http, or ftp" };
      }
      if (!url.hostname) {
        return { valid: false, error: "URI is missing a host" };
      }
    } catch (e) {
      return { valid: false, error: "URI is not valid" };
    }
    return { valid: true };
  }
  if (value.startsWith("/")) {
    return { valid: false, error: "Path must be relative to the vault root (remove the leading /)" };
  }
  if (/^[A-Za-z]:[/\\]/.test(value)) {
    return { valid: false, error: "Path must be relative to the vault root (remove the drive letter)" };
  }
  if (value.startsWith("~")) {
    return { valid: false, error: "Path must be relative to the vault root (~ is not supported)" };
  }
  return { valid: true };
}

// src/render/card.ts
function effectiveCardTitle(board) {
  var _a;
  if (board.viewConfig.cardTitle !== void 0) {
    const name = board.viewConfig.cardTitle;
    if (!name) return null;
    return board.fields.some((f) => f.name === name) ? name : null;
  }
  const first = board.fields.find(
    (f) => f.name !== "_id" && f.name !== board.viewConfig.columns
  );
  return (_a = first == null ? void 0 : first.name) != null ? _a : null;
}
function effectiveCardFields(board) {
  var _a;
  const titleField = effectiveCardTitle(board);
  return ((_a = board.viewConfig.cardFields) != null ? _a : []).filter(
    (name) => name !== titleField && board.fields.some((f) => f.name === name)
  );
}
function renderCard(parent, card, board) {
  var _a, _b;
  const container = parent.createDiv({ cls: ["fk-card", "fk-card--draggable"] });
  container.dataset.cardId = card.id;
  const titleFieldName = effectiveCardTitle(board);
  if (titleFieldName !== null) {
    container.createDiv({ cls: "fk-card__title", text: (_a = card.values[titleFieldName]) != null ? _a : "" });
  }
  const secondaryFields = effectiveCardFields(board).map((name) => board.fields.find((f) => f.name === name)).filter((f) => f !== void 0);
  if (secondaryFields.length) {
    const fieldsEl = container.createDiv({ cls: "fk-card__fields" });
    const showLabels = board.viewConfig.cardLabels !== false;
    for (const field of secondaryFields) {
      const value = (_b = card.values[field.name]) != null ? _b : "";
      if (!value) continue;
      const row = fieldsEl.createDiv({ cls: "fk-card__field" });
      if (showLabels) {
        row.createSpan({ cls: "fk-card__field-label", text: field.label });
      }
      if (field.type === "Link") {
        const linksEl = row.createSpan({ cls: "fk-card__field-links" });
        for (const item of splitLinks(value)) {
          const span = linksEl.createSpan({ cls: "fk-card__field-link", text: item });
          span.dataset.href = item;
        }
      } else {
        row.createSpan({ cls: "fk-card__field-value", text: value });
      }
    }
    if (!fieldsEl.childElementCount) fieldsEl.remove();
  }
  return container;
}

// src/render/column.ts
function renderColumn(parent, name, label, cards, board) {
  const container = parent.createDiv({ cls: "fk-column" });
  container.dataset.columnValue = name;
  const header = container.createDiv({ cls: "fk-column__header" });
  header.createSpan({ cls: "fk-column__title", text: label });
  header.createSpan({ cls: "fk-column__count", text: String(cards.length) });
  const cardsContainer = container.createDiv({ cls: "fk-column__cards" });
  for (const card of cards) {
    renderCard(cardsContainer, card, board);
  }
  container.createEl("button", { cls: "fk-col__add-btn", text: "+ Add card" });
  return container;
}

// src/render/board.ts
function capitalise(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
function renderBoard(parent, board) {
  const wrapper = parent.createDiv({ cls: "fk-board" });
  const header = wrapper.createDiv({ cls: "fk-board__header" });
  const settingsBtn = header.createEl("button", { cls: "fk-board__settings", text: "\u2699" });
  settingsBtn.title = "Board settings";
  header.createSpan({ cls: "fk-board__title", text: board.title });
  const columnsContainer = wrapper.createDiv({ cls: "fk-board__columns" });
  const columnField = board.fields.find((f) => f.name === board.viewConfig.columns);
  if (columnField == null ? void 0 : columnField.options) {
    for (const option of columnField.options) {
      const cards = board.cards.filter((c) => c.values[columnField.name] === option);
      renderColumn(columnsContainer, option, capitalise(option), cards, board);
    }
  }
  return wrapper;
}

// src/data/serializer.ts
function escapeCell(value) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}
function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
function serializeBoard(board) {
  const config = serializeConfig(board);
  const table = serializeTable(board);
  return `---
${config}
---

${table}`;
}
function serializeBoardBlock(board) {
  return `\`\`\`fancy-kanban
${serializeBoard(board)}
\`\`\`
`;
}
function serializeConfig(board) {
  var _a;
  const lines = [];
  lines.push(`version: 2`);
  lines.push(`title: ${board.title}`);
  lines.push("fields:");
  for (const field of board.fields) {
    let line = `  - name: ${field.name}, type: ${field.type}, label: ${field.label}`;
    if (field.options !== void 0) line += `, options: ${field.options.join("|")}`;
    if (field.default !== void 0) line += `, default: ${field.default}`;
    lines.push(line);
  }
  if (board.viewConfig.lanes) lines.push(`lanes: ${board.viewConfig.lanes}`);
  if (board.viewConfig.cardTitle !== void 0) lines.push(`card_title: ${board.viewConfig.cardTitle}`);
  if ((_a = board.viewConfig.cardFields) == null ? void 0 : _a.length) lines.push(`card_fields: ${board.viewConfig.cardFields.join(", ")}`);
  if (board.viewConfig.cardLabels === false) lines.push(`card_labels: false`);
  if (board.rawWorkflow) lines.push(`workflow: ${board.rawWorkflow}`);
  return lines.join("\n");
}
function serializeTable(board) {
  const schemaFieldNames = new Set(board.fields.map((f) => f.name));
  const orphanedKeys = /* @__PURE__ */ new Set();
  for (const card of board.cards) {
    for (const key of Object.keys(card.values)) {
      if (!schemaFieldNames.has(key)) orphanedKeys.add(key);
    }
  }
  const schemaLabels = board.fields.map((f) => f.label);
  const allLabels = ["_id", ...schemaLabels, ...orphanedKeys];
  const header = `| ${allLabels.join(" | ")} |`;
  const separator = `| ${allLabels.map(() => "---").join(" | ")} |`;
  const seenIds = /* @__PURE__ */ new Set();
  const rows = board.cards.map((card) => serializeRow(card, board, orphanedKeys, seenIds));
  return [header, separator, ...rows].join("\n");
}
function serializeRow(card, board, orphanedKeys, seenIds) {
  let id = card.id || generateId();
  if (seenIds.has(id)) id = generateId();
  seenIds.add(id);
  const schemaCells = board.fields.map((f) => {
    var _a;
    return escapeCell((_a = card.values[f.name]) != null ? _a : "");
  });
  const orphanCells = [...orphanedKeys].map((key) => {
    var _a;
    return escapeCell((_a = card.values[key]) != null ? _a : "");
  });
  const cells = [id, ...schemaCells, ...orphanCells];
  return `| ${cells.join(" | ")} |`;
}

// src/model/mutations.ts
function deleteCard(board, cardId) {
  return { ...board, cards: board.cards.filter((card) => card.id !== cardId) };
}
function reorderCard(board, cardId, toColumnValue, insertBeforeId) {
  const columnField = board.viewConfig.columns;
  const dragged = board.cards.find((c) => c.id === cardId);
  if (!dragged) return board;
  const updatedCard = { ...dragged, values: { ...dragged.values, [columnField]: toColumnValue } };
  const remaining = board.cards.filter((c) => c.id !== cardId);
  if (insertBeforeId === null) {
    return { ...board, cards: [...remaining, updatedCard] };
  }
  const targetIdx = remaining.findIndex((c) => c.id === insertBeforeId);
  if (targetIdx === -1) {
    return { ...board, cards: [...remaining, updatedCard] };
  }
  const newCards = [...remaining];
  newCards.splice(targetIdx, 0, updatedCard);
  return { ...board, cards: newCards };
}
function createCard(board, columnValue, values) {
  var _a, _b;
  const columnField = board.viewConfig.columns;
  const cardValues = {};
  for (const field of board.fields) {
    if (field.name === columnField) {
      cardValues[field.name] = columnValue;
    } else {
      cardValues[field.name] = (_b = (_a = values[field.name]) != null ? _a : field.default) != null ? _b : "";
    }
  }
  const newCard = { id: generateId(), values: cardValues };
  return { ...board, cards: [...board.cards, newCard] };
}
function updateCard(board, cardId, values) {
  return {
    ...board,
    cards: board.cards.map(
      (card) => card.id === cardId ? { ...card, values: { ...card.values, ...values } } : card
    )
  };
}

// src/data/workflow.ts
function parseWorkflow(workflowString, statusOptions) {
  const map = /* @__PURE__ */ new Map();
  if (!workflowString || !workflowString.trim()) {
    for (const from of statusOptions) {
      map.set(from, new Set(statusOptions.filter((s) => s !== from)));
    }
    return map;
  }
  for (const pair of workflowString.split(",")) {
    const [from, to] = pair.split(/->|→/).map((s) => s.trim());
    if (!from || !to) continue;
    if (!map.has(from)) map.set(from, /* @__PURE__ */ new Set());
    map.get(from).add(to);
  }
  return map;
}
function isTransitionAllowed(map, from, to) {
  var _a, _b;
  if (from === to) return false;
  return (_b = (_a = map.get(from)) == null ? void 0 : _a.has(to)) != null ? _b : false;
}

// src/render/card-modal.ts
var import_obsidian = require("obsidian");
var LinkFilePicker = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onSelect) {
    super(app);
    this.onSelect = onSelect;
  }
  getItems() {
    return this.app.vault.getFiles();
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onSelect(file.path);
  }
};
var CardModal = class extends import_obsidian.Modal {
  constructor(app, board, card, columnValue, onConfirm, onDelete, sourcePath = "") {
    super(app);
    this.board = board;
    this.card = card;
    this.columnValue = columnValue;
    this.onConfirm = onConfirm;
    this.onDelete = onDelete;
    this.sourcePath = sourcePath;
    this.values = {};
  }
  onOpen() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.textContent = this.card ? "Edit card" : "Add card";
    const columnField = this.board.viewConfig.columns;
    const editableFields = this.board.fields.filter((f) => f.name !== "_id");
    for (const field of editableFields) {
      this.renderField(contentEl, field, field.name === columnField && !this.card ? this.columnValue : void 0);
    }
    const footer = contentEl.createDiv({ cls: "fk-modal-footer" });
    const saveBtn = footer.createEl("button", { cls: "fk-modal-save", text: "Save" });
    saveBtn.addEventListener("click", () => {
      var _a2;
      const values = { ...this.values };
      this.close();
      (_a2 = this.containerEl) == null ? void 0 : _a2.remove();
      this.onConfirm(values);
    });
    if (this.onDelete) {
      const deleteBtn = footer.createEl("button", { cls: "fk-modal-delete", text: "Delete" });
      deleteBtn.addEventListener("click", () => {
        this.onDelete();
        this.close();
      });
    }
    (_a = contentEl.querySelector("input, textarea, select")) == null ? void 0 : _a.focus();
  }
  renderField(container, field, initialOverride) {
    var _a, _b;
    const initialValue = initialOverride != null ? initialOverride : this.card ? (_a = this.card.values[field.name]) != null ? _a : "" : (_b = field.default) != null ? _b : "";
    this.values[field.name] = initialValue;
    const wrapper = container.createDiv({ cls: "fk-modal-field" });
    wrapper.createEl("label", { text: field.label });
    const onChange = (value) => {
      this.values[field.name] = value;
    };
    if (field.type === "Link") {
      this.renderLinkField(wrapper, field, initialValue, onChange);
    } else if (field.type === "Select" && field.options) {
      const sel = wrapper.createEl("select", { cls: "fk-modal-input" });
      for (const opt of field.options) {
        const o = sel.createEl("option", { text: opt });
        o.value = opt;
        if (opt === initialValue) o.selected = true;
      }
      sel.addEventListener("change", () => onChange(sel.value));
    } else if (field.type === "Textarea") {
      const ta = wrapper.createEl("textarea", { cls: "fk-modal-input" });
      ta.value = initialValue;
      ta.rows = 4;
      ta.addEventListener("input", () => onChange(ta.value));
    } else {
      const inp = wrapper.createEl("input", { cls: "fk-modal-input" });
      inp.type = field.type === "Date" ? "date" : field.type === "Number" ? "number" : "text";
      inp.value = initialValue;
      inp.addEventListener("input", () => onChange(inp.value));
      inp.addEventListener("keydown", (e) => {
        var _a2;
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const values = { ...this.values };
          this.close();
          (_a2 = this.containerEl) == null ? void 0 : _a2.remove();
          this.onConfirm(values);
        }
      });
    }
  }
  renderLinkField(container, _field, initialValue, onChange) {
    const items = splitLinks(initialValue);
    const field = container.createDiv({ cls: "fk-link-field" });
    const itemList = field.createDiv();
    const openLink = (item) => {
      this.close();
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(item)) {
        window.open(item, "_blank");
      } else {
        void this.app.workspace.openLinkText(item, this.sourcePath, "tab");
      }
    };
    const renderItems = () => {
      while (itemList.firstChild) itemList.removeChild(itemList.firstChild);
      for (const item of items) {
        const row = itemList.createDiv({ cls: "fk-link-item" });
        const remove = row.createSpan({ cls: "fk-link-item__remove" });
        remove.setAttribute("role", "button");
        remove.setAttribute("tabindex", "0");
        remove.setAttribute("aria-label", "Remove");
        remove.textContent = "\xD7";
        const doRemove = (e) => {
          e.stopPropagation();
          const idx = items.indexOf(item);
          if (idx > -1) items.splice(idx, 1);
          onChange(joinLinks(items));
          renderItems();
        };
        remove.addEventListener("click", doRemove);
        remove.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") doRemove(e);
        });
        const val = row.createSpan({ cls: "fk-link-item__value" });
        val.setAttribute("role", "button");
        val.setAttribute("tabindex", "0");
        val.textContent = item;
        val.addEventListener("click", () => openLink(item));
        val.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") openLink(item);
        });
      }
    };
    renderItems();
    const controls = field.createDiv({ cls: "fk-link-controls" });
    const addFileBtn = controls.createEl("button", { cls: "fk-link-add--file", text: "+ Add file" });
    addFileBtn.addEventListener("click", () => {
      new LinkFilePicker(this.app, (path) => {
        items.push(path);
        onChange(joinLinks(items));
        renderItems();
      }).open();
    });
    const addUrlBtn = controls.createEl("button", { cls: "fk-link-add--url", text: "+ Add URL" });
    const urlInputArea = controls.createDiv({ cls: ["fk-link-url-input", "fk-hidden"] });
    const urlInput = urlInputArea.createEl("input", { type: "text" });
    urlInput.placeholder = "https://\u2026";
    const urlError = urlInputArea.createSpan({ cls: "fk-link-error" });
    const urlConfirm = urlInputArea.createEl("button", { cls: "fk-link-url-confirm", text: "Add" });
    urlConfirm.addEventListener("click", () => {
      var _a;
      const value = urlInput.value.trim();
      const result = validateLinkItem(value);
      if (!result.valid) {
        urlError.textContent = (_a = result.error) != null ? _a : "";
        return;
      }
      urlError.textContent = "";
      items.push(value);
      onChange(joinLinks(items));
      urlInput.value = "";
      urlInputArea.classList.add("fk-hidden");
      renderItems();
    });
    addUrlBtn.addEventListener("click", () => {
      const hidden = urlInputArea.classList.contains("fk-hidden");
      urlInputArea.classList.toggle("fk-hidden");
      if (hidden) urlInput.focus();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/render/board-config-modal.ts
var import_obsidian2 = require("obsidian");
function deriveFieldName(label) {
  return label.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
}
var FIELD_TYPES = ["Text", "Textarea", "Date", "Number", "Select", "Link"];
var DEFAULT_SCHEMA = {
  title: "New Board",
  fields: [
    { name: "title", type: "Text", label: "Title" },
    { name: "status", type: "Select", label: "Status", options: ["todo", "doing", "done"], default: "todo" }
  ],
  viewConfig: { columns: "status" },
  rawWorkflow: "",
  version: 1
};
var BoardConfigModal = class extends import_obsidian2.Modal {
  constructor(app, initial, onConfirm) {
    super(app);
    this.onConfirm = onConfirm;
    this.errorEl = null;
    this.fieldListEl = null;
    this.cardFieldListEl = null;
    this.schema = initial ? { ...initial, fields: initial.fields.map((f) => ({ ...f })) } : { ...DEFAULT_SCHEMA, fields: DEFAULT_SCHEMA.fields.map((f) => ({ ...f })) };
  }
  onOpen() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.textContent = this.schema.title === "New Board" && !this.schema.fields.length ? "New board" : "Board settings";
    this.renderTitleInput(contentEl);
    this.renderFieldsSection(contentEl);
    this.renderViewConfig(contentEl);
    this.renderCardDisplay(contentEl);
    this.renderWorkflow(contentEl);
    this.errorEl = contentEl.createEl("p", { cls: "fk-modal-error" });
    const saveBtn = contentEl.createEl("button", { cls: "fk-modal-save", text: "Save" });
    saveBtn.addEventListener("click", () => this.submit());
    (_a = contentEl.querySelector("input")) == null ? void 0 : _a.focus();
  }
  renderTitleInput(container) {
    const wrap = this.field(container, "Board title");
    const inp = wrap.createEl("input", { type: "text", cls: "fk-modal-input" });
    inp.value = this.schema.title;
    inp.addEventListener("input", () => {
      this.schema.title = inp.value;
    });
  }
  renderFieldsSection(container) {
    const section = container.createDiv({ cls: "fk-modal-section" });
    section.createEl("p", { cls: "fk-modal-section-label", text: "Fields" });
    this.fieldListEl = section.createDiv({ cls: "fk-modal-field-list" });
    this.rerenderFieldList();
    const addBtn = section.createEl("button", { cls: "fk-modal-add-field", text: "+ Add field" });
    addBtn.addEventListener("click", () => {
      this.schema.fields.push({ name: "", type: "Text", label: "" });
      this.rerenderFieldList();
      this.refreshViewConfig();
    });
  }
  rerenderFieldList() {
    if (!this.fieldListEl) return;
    this.fieldListEl.innerHTML = "";
    this.schema.fields.forEach((f, idx) => {
      this.renderFieldRow(this.fieldListEl, f, idx);
    });
  }
  renderFieldRow(parent, field, idx) {
    var _a, _b;
    const total = this.schema.fields.length;
    const row = parent.createDiv({ cls: "fk-modal-field-row" });
    const isNew = field.name === "";
    const labelInp = this.fixedInput(row, "Label", field.label, "fk-col-label");
    if (!isNew) labelInp.title = `id: ${field.name}`;
    labelInp.addEventListener("input", () => {
      field.label = labelInp.value;
      if (isNew) {
        field.name = deriveFieldName(labelInp.value);
        labelInp.title = field.name ? `id: ${field.name}` : "";
        this.refreshViewConfig();
      }
    });
    const typeSelect = row.createEl("select", { cls: ["fk-modal-input-sm", "fk-col-type"] });
    for (const t of FIELD_TYPES) {
      const o = typeSelect.createEl("option", { text: t });
      o.value = t;
      if (t === field.type) o.selected = true;
    }
    const isSelect = field.type === "Select";
    const optionsInp = this.fixedInput(row, "a | b | c", ((_a = field.options) != null ? _a : []).join(", "), "fk-col-options");
    optionsInp.disabled = !isSelect;
    optionsInp.addEventListener("input", () => {
      field.options = optionsInp.value.split(",").map((s) => s.trim()).filter(Boolean);
    });
    const defaultInp = this.fixedInput(row, "Default", (_b = field.default) != null ? _b : "", "fk-col-default");
    defaultInp.disabled = !isSelect;
    defaultInp.addEventListener("input", () => {
      field.default = defaultInp.value || void 0;
    });
    typeSelect.addEventListener("change", () => {
      field.type = typeSelect.value;
      const nowSelect = field.type === "Select";
      optionsInp.disabled = !nowSelect;
      defaultInp.disabled = !nowSelect;
      if (!nowSelect) {
        field.options = void 0;
        field.default = void 0;
        optionsInp.value = "";
        defaultInp.value = "";
      }
    });
    const controls = row.createDiv({ cls: "fk-modal-row-controls" });
    const upBtn = this.iconBtn(controls, "\u2191", idx === 0);
    upBtn.addEventListener("click", () => {
      [this.schema.fields[idx - 1], this.schema.fields[idx]] = [this.schema.fields[idx], this.schema.fields[idx - 1]];
      this.rerenderFieldList();
    });
    const downBtn = this.iconBtn(controls, "\u2193", idx === total - 1);
    downBtn.addEventListener("click", () => {
      [this.schema.fields[idx], this.schema.fields[idx + 1]] = [this.schema.fields[idx + 1], this.schema.fields[idx]];
      this.rerenderFieldList();
    });
    const removeBtn = this.iconBtn(controls, "\xD7", total <= 1);
    removeBtn.addEventListener("click", () => {
      this.schema.fields.splice(idx, 1);
      this.rerenderFieldList();
      this.refreshViewConfig();
    });
    return row;
  }
  renderViewConfig(container) {
    const section = container.createDiv({ cls: "fk-modal-section" });
    const colWrap = this.field(section, "Columns field");
    const colSelect = colWrap.createEl("select", { cls: "fk-modal-input" });
    colSelect.dataset.role = "columns";
    this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
    colSelect.addEventListener("change", () => {
      this.schema.viewConfig.columns = colSelect.value;
    });
  }
  renderCardDisplay(container) {
    var _a;
    const section = container.createDiv({ cls: "fk-modal-section" });
    section.createEl("p", { cls: "fk-modal-section-label", text: "Card display" });
    const titleWrap = this.field(section, "Card title");
    const titleSelect = titleWrap.createEl("select", { cls: "fk-modal-input" });
    titleSelect.dataset.role = "card-title-select";
    const autoOpt = titleSelect.createEl("option", { text: "(auto)" });
    autoOpt.value = "__auto__";
    const noneOpt = titleSelect.createEl("option", { text: "(none)" });
    noneOpt.value = "";
    this.populateCardTitleSelect(titleSelect);
    titleSelect.value = (_a = this.schema.viewConfig.cardTitle) != null ? _a : "__auto__";
    titleSelect.addEventListener("change", () => {
      const v = titleSelect.value;
      this.schema.viewConfig.cardTitle = v === "__auto__" ? void 0 : v;
    });
    const labelsWrap = this.field(section, "Show labels");
    const labelsCheck = labelsWrap.createEl("input", { type: "checkbox" });
    labelsCheck.checked = this.schema.viewConfig.cardLabels !== false;
    labelsCheck.addEventListener("change", () => {
      this.schema.viewConfig.cardLabels = labelsCheck.checked ? void 0 : false;
    });
    this.cardFieldListEl = section.createDiv({ cls: "fk-modal-field-list" });
    this.rerenderCardFieldList();
    const addRow = section.createDiv();
    addRow.dataset.role = "card-display-add";
    const addSelect = addRow.createEl("select", { cls: "fk-modal-input-sm" });
    addSelect.dataset.role = "card-display-select";
    const addBtn = addRow.createEl("button", { cls: "fk-modal-add-field", text: "+ Add field" });
    addBtn.addEventListener("click", () => {
      var _a2;
      const name = addSelect.value;
      if (!name) return;
      const current = (_a2 = this.schema.viewConfig.cardFields) != null ? _a2 : [];
      if (!current.includes(name)) {
        this.schema.viewConfig.cardFields = [...current, name];
        this.rerenderCardFieldList();
        this.refreshCardDisplaySelect();
      }
    });
    this.refreshCardDisplaySelect();
  }
  rerenderCardFieldList() {
    var _a;
    if (!this.cardFieldListEl) return;
    this.cardFieldListEl.innerHTML = "";
    const cardFields = (_a = this.schema.viewConfig.cardFields) != null ? _a : [];
    cardFields.forEach((name, idx) => {
      var _a2;
      const field = this.schema.fields.find((f) => f.name === name);
      const row = this.cardFieldListEl.createDiv({ cls: "fk-modal-field-row" });
      row.createSpan({ cls: "fk-flex-1", text: (_a2 = field == null ? void 0 : field.label) != null ? _a2 : name });
      const controls = row.createDiv({ cls: "fk-modal-row-controls" });
      const upBtn = this.iconBtn(controls, "\u2191", idx === 0);
      upBtn.addEventListener("click", () => {
        var _a3;
        const cf = [...(_a3 = this.schema.viewConfig.cardFields) != null ? _a3 : []];
        [cf[idx - 1], cf[idx]] = [cf[idx], cf[idx - 1]];
        this.schema.viewConfig.cardFields = cf;
        this.rerenderCardFieldList();
      });
      const downBtn = this.iconBtn(controls, "\u2193", idx === cardFields.length - 1);
      downBtn.addEventListener("click", () => {
        var _a3;
        const cf = [...(_a3 = this.schema.viewConfig.cardFields) != null ? _a3 : []];
        [cf[idx], cf[idx + 1]] = [cf[idx + 1], cf[idx]];
        this.schema.viewConfig.cardFields = cf;
        this.rerenderCardFieldList();
      });
      const removeBtn = this.iconBtn(controls, "\xD7", false);
      removeBtn.addEventListener("click", () => {
        var _a3;
        const cf = ((_a3 = this.schema.viewConfig.cardFields) != null ? _a3 : []).filter((_, i) => i !== idx);
        this.schema.viewConfig.cardFields = cf.length ? cf : void 0;
        this.rerenderCardFieldList();
        this.refreshCardDisplaySelect();
      });
    });
  }
  populateCardTitleSelect(select) {
    const existing = Array.from(select.options).map((o) => o.value);
    for (const f of this.schema.fields.filter((f2) => f2.name !== "_id")) {
      if (!existing.includes(f.name)) {
        const o = select.createEl("option", { text: f.label || f.name });
        o.value = f.name;
      }
    }
  }
  refreshCardTitleSelect() {
    var _a;
    const select = this.contentEl.querySelector('[data-role="card-title-select"]');
    if (!select) return;
    const current = select.value;
    while (select.options.length > 2) select.remove(2);
    this.populateCardTitleSelect(select);
    select.value = current in Array.from(select.options).map((o) => o.value) ? current : (_a = this.schema.viewConfig.cardTitle) != null ? _a : "__auto__";
  }
  refreshCardDisplaySelect() {
    var _a;
    const select = this.contentEl.querySelector('[data-role="card-display-select"]');
    if (!select) return;
    select.innerHTML = "";
    const current = (_a = this.schema.viewConfig.cardFields) != null ? _a : [];
    const available = this.schema.fields.filter((f) => f.name !== "_id" && !current.includes(f.name));
    for (const f of available) {
      const o = select.createEl("option", { text: f.label || f.name });
      o.value = f.name;
    }
  }
  renderWorkflow(container) {
    var _a;
    const wrap = this.field(container, "Workflow (optional)");
    const inp = wrap.createEl("input", { type: "text", cls: "fk-modal-input" });
    inp.placeholder = "todo\u2192doing, doing\u2192done";
    inp.value = (_a = this.schema.rawWorkflow) != null ? _a : "";
    inp.addEventListener("input", () => {
      this.schema.rawWorkflow = inp.value;
    });
  }
  refreshViewConfig() {
    const colSelect = this.contentEl.querySelector('[data-role="columns"]');
    if (colSelect) this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
    this.refreshCardTitleSelect();
    this.rerenderCardFieldList();
    this.refreshCardDisplaySelect();
  }
  populateFieldSelect(select, current) {
    const existing = Array.from(select.options).map((o) => o.value).filter((v) => v);
    const names = this.schema.fields.map((f) => f.name).filter((n) => n);
    for (const name of names) {
      if (!existing.includes(name)) {
        const o = select.createEl("option", { text: name });
        o.value = name;
      }
    }
    if (current) select.value = current;
  }
  submit() {
    const error = this.validate();
    if (error) {
      if (this.errorEl) this.errorEl.textContent = error;
      return;
    }
    this.onConfirm(this.schema);
    this.close();
  }
  validate() {
    if (!this.schema.title.trim()) return "Board title is required.";
    if (this.schema.fields.length === 0) return "At least one field is required.";
    const names = this.schema.fields.map((f) => f.name.trim());
    if (names.some((n) => !n)) return "All field names must be non-empty.";
    if (new Set(names).size !== names.length) return "Field names must be unique.";
    for (const f of this.schema.fields) {
      if (f.type === "Select" && (!f.options || f.options.length === 0)) {
        return `Select field "${f.name}" must have at least one option.`;
      }
    }
    if (!this.schema.fields.some((f) => f.name === this.schema.viewConfig.columns)) {
      return "Columns field must match an existing field name.";
    }
    return null;
  }
  field(container, label) {
    const wrap = container.createDiv({ cls: "fk-modal-field" });
    wrap.createEl("label", { text: label });
    return wrap;
  }
  smallInput(container, placeholder, value) {
    const inp = container.createEl("input", { type: "text", cls: "fk-modal-input-sm" });
    inp.placeholder = placeholder;
    inp.value = value;
    return inp;
  }
  fixedInput(container, placeholder, value, cls) {
    const inp = container.createEl("input", { type: "text", cls: ["fk-modal-input-sm", cls] });
    inp.placeholder = placeholder;
    inp.value = value;
    return inp;
  }
  iconBtn(container, label, disabled) {
    const btn = container.createEl("button", { cls: "fk-modal-icon-btn", text: label });
    btn.disabled = disabled;
    return btn;
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/render/mount.ts
function mountBoard(el, board, save, app, sourcePath = "") {
  while (el.firstChild) el.removeChild(el.firstChild);
  const dispatch = (newBoard) => {
    void save(newBoard).then(() => mountBoard(el, newBoard, save, app, sourcePath));
  };
  const boardEl = renderBoard(el, board);
  attachDragDrop(boardEl, board, dispatch);
  attachCardActions(boardEl, board, dispatch, app, sourcePath);
}
function attachCardActions(boardEl, board, dispatch, app, sourcePath = "") {
  boardEl.addEventListener("click", (e) => {
    var _a, _b, _c, _d, _e, _f;
    const target = e.target;
    const linkEl = target.closest(".fk-card__field-link");
    if (linkEl) {
      e.stopPropagation();
      const href = (_a = linkEl.dataset.href) != null ? _a : "";
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(href)) {
        window.open(href, "_blank");
      } else if (app) {
        void app.workspace.openLinkText(href, sourcePath, "tab");
      }
      return;
    }
    const settingsBtn = target.closest(".fk-board__settings");
    if (settingsBtn && app) {
      new BoardConfigModal(app, board, (schema) => {
        const migrated = migrateSelectRenames(board.fields, schema.fields, board.cards);
        const reconciledCards = reconcileCards(schema.fields, migrated);
        dispatch({ ...schema, cards: reconciledCards });
      }).open();
      return;
    }
    const addBtn = target.closest(".fk-col__add-btn");
    if (addBtn) {
      const col = addBtn.closest(".fk-column");
      const columnValue = (_b = col == null ? void 0 : col.dataset.columnValue) != null ? _b : "";
      if (app) {
        new CardModal(app, board, null, columnValue, (values) => {
          dispatch(createCard(board, columnValue, values));
        }, void 0, sourcePath).open();
      } else {
        dispatch(createCard(board, columnValue, {}));
      }
      return;
    }
    const cardEl = target.closest(".fk-card");
    if (cardEl) {
      const cardId = (_c = cardEl.dataset.cardId) != null ? _c : "";
      const card = (_d = board.cards.find((c) => c.id === cardId)) != null ? _d : null;
      const columnValue = (_f = (_e = cardEl.closest(".fk-column")) == null ? void 0 : _e.dataset.columnValue) != null ? _f : "";
      if (app && card) {
        new CardModal(app, board, card, columnValue, (values) => {
          dispatch(updateCard(board, cardId, values));
        }, () => {
          dispatch(deleteCard(board, cardId));
        }, sourcePath).open();
      }
    }
  });
}
function getInsertBeforeId(clientY, col) {
  var _a;
  const cards = Array.from(col.querySelectorAll(".fk-card:not(.fk-card--dragging)"));
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return (_a = card.dataset.cardId) != null ? _a : null;
  }
  return null;
}
function updateDropIndicator(col, insertBeforeId) {
  col.querySelectorAll(".fk-drop-indicator").forEach((el) => el.remove());
  const cardsEl = col.querySelector(".fk-column__cards");
  if (!cardsEl) return;
  const indicator = cardsEl.createDiv({ cls: "fk-drop-indicator" });
  if (insertBeforeId !== null) {
    const target = cardsEl.querySelector(`[data-card-id="${insertBeforeId}"]`);
    if (target) cardsEl.insertBefore(indicator, target);
  }
}
function clearDropState(boardEl) {
  boardEl.querySelectorAll(".fk-card--dragging").forEach((c) => c.classList.remove("fk-card--dragging"));
  boardEl.querySelectorAll(".fk-column--drag-over").forEach((c) => c.classList.remove("fk-column--drag-over"));
  boardEl.querySelectorAll(".fk-drop-indicator").forEach((el) => el.remove());
}
function showTransitionBlockedToast(from, to) {
  const existing = activeDocument.querySelector(".fk-toast");
  if (existing) existing.remove();
  const toast = activeDocument.body.createDiv({ cls: "fk-toast", text: `Cannot move from '${from}' to '${to}'. To allow this transition, add '${from} \u2192 ${to}' to the workflow.` });
  window.setTimeout(() => {
    toast.classList.add("fk-toast--hiding");
    window.setTimeout(() => toast.remove(), 400);
  }, 3e3);
}
function attachDragDrop(boardEl, board, dispatch) {
  var _a;
  const columnField = board.fields.find((f) => f.name === board.viewConfig.columns);
  const statusOptions = (_a = columnField == null ? void 0 : columnField.options) != null ? _a : [];
  const workflowMap = parseWorkflow(board.rawWorkflow || void 0, statusOptions);
  let draggingCardId = null;
  let currentCol = null;
  let insertBeforeId = null;
  boardEl.addEventListener("pointerdown", (e) => {
    const target = e.target;
    if (target.closest("button")) return;
    const card = target.closest(".fk-card");
    if (!card) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragStarted = false;
    const onMove = (ev) => {
      var _a2, _b;
      if (!dragStarted) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dx * dx + dy * dy < 25) return;
        dragStarted = true;
        draggingCardId = (_a2 = card.dataset.cardId) != null ? _a2 : null;
        card.classList.add("fk-card--dragging");
      }
      ev.preventDefault();
      const below = activeDocument.elementFromPoint(ev.clientX, ev.clientY);
      const col = (_b = below == null ? void 0 : below.closest(".fk-column")) != null ? _b : null;
      if (col !== currentCol) {
        currentCol == null ? void 0 : currentCol.classList.remove("fk-column--drag-over");
        currentCol == null ? void 0 : currentCol.querySelectorAll(".fk-drop-indicator").forEach((el) => el.remove());
        currentCol = col;
        col == null ? void 0 : col.classList.add("fk-column--drag-over");
      }
      if (col) {
        insertBeforeId = getInsertBeforeId(ev.clientY, col);
        updateDropIndicator(col, insertBeforeId);
      }
    };
    const onUp = () => {
      var _a2, _b;
      activeDocument.removeEventListener("pointermove", onMove);
      activeDocument.removeEventListener("pointerup", onUp);
      if (!dragStarted) return;
      const col = currentCol;
      clearDropState(boardEl);
      if (col && draggingCardId) {
        const toValue = (_a2 = col.dataset.columnValue) != null ? _a2 : "";
        const draggedCard = board.cards.find((c) => c.id === draggingCardId);
        const fromValue = (_b = draggedCard == null ? void 0 : draggedCard.values[board.viewConfig.columns]) != null ? _b : "";
        if (fromValue === toValue || isTransitionAllowed(workflowMap, fromValue, toValue)) {
          dispatch(reorderCard(board, draggingCardId, toValue, insertBeforeId));
        } else if (fromValue !== toValue) {
          showTransitionBlockedToast(fromValue, toValue);
        }
      }
      draggingCardId = null;
      currentCol = null;
      insertBeforeId = null;
    };
    activeDocument.addEventListener("pointermove", onMove);
    activeDocument.addEventListener("pointerup", onUp);
  });
}

// src/integration/write-back.ts
function locateBlock(fileContent, blockIndex) {
  const regex = /^```fancy-kanban$[\s\S]*?^```$/gm;
  let match;
  let count = 0;
  while ((match = regex.exec(fileContent)) !== null) {
    if (count === blockIndex) {
      return { start: match.index, end: match.index + match[0].length };
    }
    count++;
  }
  return null;
}
function patchBlock(fileContent, start, end, newBlockText) {
  return fileContent.slice(0, start) + newBlockText + fileContent.slice(end);
}
async function writeBack(vault, file, blockIndex, board) {
  const newBlockText = "```fancy-kanban\n" + serializeBoard(board) + "\n```";
  await vault.process(file, (content) => {
    const location = locateBlock(content, blockIndex);
    if (!location) return content;
    return patchBlock(content, location.start, location.end, newBlockText);
  });
}

// src/integration/postprocessor.ts
function blockIndexFromContext(ctx, el) {
  const info = ctx.getSectionInfo(el);
  if (!info) return 0;
  const lines = info.text.split("\n");
  let count = 0;
  for (let i = 0; i < info.lineStart; i++) {
    if (lines[i].trimEnd() === "```fancy-kanban") count++;
  }
  return count;
}
function renderErrorPanel(container, errors, source, onGoToSource) {
  const panel = container.createDiv({ cls: "fk-error-panel" });
  for (const err of errors) {
    const msg = panel.createEl("p", { cls: "fk-error", text: err.message });
    if (err.hint) {
      msg.createSpan({ cls: "fk-error-panel__hint", text: ` \u2014 ${err.hint}` });
    }
  }
  panel.createEl("pre", { cls: "fk-error-panel__source", text: source });
  const btn = panel.createEl("button", { cls: "fk-error-panel__goto", text: "Go to source" });
  btn.addEventListener("click", onGoToSource);
}
function renderWarningBanner(container, warnings) {
  const banner = container.createDiv({ cls: "fk-warning-banner" });
  const body = banner.createDiv({ cls: "fk-warning-banner__body" });
  for (const w of warnings) {
    body.createEl("p", { cls: "fk-warning-banner__item", text: w.message });
  }
  const dismiss = banner.createEl("button", { cls: "fk-warning-banner__dismiss", text: "\xD7" });
  dismiss.setAttribute("aria-label", "Dismiss warnings");
  dismiss.addEventListener("click", () => banner.remove());
}
function registerPostProcessor(plugin) {
  plugin.registerMarkdownCodeBlockProcessor("fancy-kanban", (source, el, ctx) => {
    var _a;
    const result = parseBlock(source);
    if (!result.ok) {
      renderErrorPanel(el, result.errors, source, () => {
        void plugin.app.workspace.openLinkText(ctx.sourcePath, "", false);
      });
      return;
    }
    const abstract = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    const file = abstract instanceof import_obsidian3.TFile ? abstract : null;
    if (!file) {
      if (result.warnings.length > 0) renderWarningBanner(el, result.warnings);
      const boardWrapper2 = el.createDiv();
      mountBoard(boardWrapper2, result.board, () => Promise.resolve(), plugin.app, ctx.sourcePath);
      return;
    }
    if (result.readonly) {
      el.createEl("p", { cls: ["fk-banner", "fk-banner--warning"], text: (_a = result.readonlyReason) != null ? _a : "" });
    }
    if (result.warnings.length > 0) renderWarningBanner(el, result.warnings);
    const boardWrapper = el.createDiv();
    const blockIndex = blockIndexFromContext(ctx, el);
    const save = result.readonly ? () => Promise.resolve() : (b) => writeBack(plugin.app.vault, file, blockIndex, b);
    mountBoard(boardWrapper, result.board, save, plugin.app, ctx.sourcePath);
  });
}

// src/integration/standalone-view.ts
var import_obsidian4 = require("obsidian");
var VIEW_TYPE_FANCY_KANBAN = "fancy-kanban-view";
var FancyKanbanView = class extends import_obsidian4.ItemView {
  constructor(leaf) {
    super(leaf);
    this.boardTitle = "Fancy Kanban";
    this.filePath = "";
  }
  getViewType() {
    return VIEW_TYPE_FANCY_KANBAN;
  }
  getDisplayText() {
    return this.boardTitle;
  }
  getIcon() {
    return "layout-kanban";
  }
  getState() {
    return { filePath: this.filePath };
  }
  async setState(state, result) {
    if (typeof state.filePath === "string") this.filePath = state.filePath;
    await super.setState(state, result);
  }
  async onOpen() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    const path = this.filePath || ((_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) || "";
    const abstract = path ? this.app.vault.getAbstractFileByPath(path) : null;
    const file = abstract instanceof import_obsidian4.TFile ? abstract : null;
    if (!file) {
      contentEl.createEl("p", { cls: "fk-error", text: "No file is open." });
      return;
    }
    this.filePath = file.path;
    const content = await this.app.vault.read(file);
    const location = locateBlock(content, 0);
    if (!location) {
      contentEl.createEl("p", { cls: "fk-error", text: "No fancy-kanban block found in this file." });
      return;
    }
    const blockText = content.slice(location.start, location.end);
    const inner = blockText.replace(/^```fancy-kanban\n/, "").replace(/\n```$/, "");
    const result = parseBlock(inner);
    if (!result.ok) {
      contentEl.createEl("p", { cls: "fk-error", text: result.errors.map((e) => e.message).join("; ") });
      return;
    }
    this.boardTitle = result.board.title;
    const save = (board) => writeBack(this.app.vault, file, 0, board);
    mountBoard(contentEl, result.board, save, this.app);
  }
  async onClose() {
    this.contentEl.empty();
  }
};

// main.ts
var FANCY_KANBAN_ICON = "fancy-kanban-icon";
function registerIcon() {
  (0, import_obsidian5.addIcon)(FANCY_KANBAN_ICON, `<g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round">
<path d="M8.2 11H5.8C5.35817 11 5 11.2985 5 11.6667V22.3333C5 22.7015 5.35817 23 5.8 23H8.2C8.64183 23 9 22.7015 9 22.3333V11.6667C9 11.2985 8.64183 11 8.2 11Z"/>
<path d="M13.2 11H10.8C10.3582 11 10 11.2985 10 11.6667V18.3333C10 18.7015 10.3582 19 10.8 19H13.2C13.6418 19 14 18.7015 14 18.3333V11.6667C14 11.2985 13.6418 11 13.2 11Z"/>
<path d="M18.2 11H15.8C15.3582 11 15 11.2686 15 11.6V19.4C15 19.7314 15.3582 20 15.8 20H18.2C18.6418 20 19 19.7314 19 19.4V11.6C19 11.2686 18.6418 11 18.2 11Z"/>
<path d="M18.3001 8.2006L16.4011 2.20929C16.3179 1.97002 16.1853 1.75098 16.0117 1.56651C15.8381 1.38203 15.6275 1.23627 15.3938 1.13875C15.16 1.04123 14.9082 0.994145 14.655 1.00058C14.4018 1.00702 14.1528 1.06682 13.9243 1.17609L12.7759 1.72509C12.5336 1.84071 12.2685 1.90068 12.0001 1.90059H8.85007C8.45798 1.90052 8.07659 2.02846 7.76387 2.26499C7.45115 2.50152 7.22422 2.83369 7.11757 3.21099L5.70007 8.2006"/>
<path d="M3 8.20044H21"/>
</g>`);
}
var FancyKanbanPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    registerIcon();
    this.registerView(VIEW_TYPE_FANCY_KANBAN, (leaf) => new FancyKanbanView(leaf));
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.getLeavesOfType(VIEW_TYPE_FANCY_KANBAN).forEach((leaf) => {
        void leaf.loadIfDeferred();
      });
    });
    registerPostProcessor(this);
    this.addRibbonIcon(FANCY_KANBAN_ICON, "New Fancy Kanban board", () => {
      this.newBoard();
    });
    this.addCommand({
      id: "new-board",
      name: "New board",
      callback: () => this.newBoard()
    });
    this.addCommand({
      id: "insert-board",
      name: "Insert board",
      editorCallback: (editor) => {
        const template = serializeBoardBlock({
          title: "New Board",
          fields: [
            { name: "title", type: "Text", label: "Title" },
            { name: "status", type: "Select", label: "Status", options: ["todo", "doing", "done"], default: "todo" }
          ],
          viewConfig: { columns: "status" },
          rawWorkflow: "",
          version: 1,
          cards: []
        });
        editor.replaceRange(template, editor.getCursor());
      }
    });
  }
  onunload() {
  }
  newBoard() {
    new BoardConfigModal(this.app, null, (schema) => {
      const baseName = schema.title.trim() || "New Board";
      let fileName = `${baseName}.md`;
      let counter = 2;
      while (this.app.vault.getAbstractFileByPath(fileName)) {
        fileName = `${baseName} ${counter}.md`;
        counter++;
      }
      const content = serializeBoardBlock({ ...schema, cards: [] });
      void this.app.vault.create(fileName, content).then((file) => {
        if (file instanceof import_obsidian5.TFile) {
          void this.app.workspace.getLeaf(true).openFile(file);
        }
      });
    }).open();
  }
};
