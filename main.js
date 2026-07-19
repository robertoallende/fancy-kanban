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
function renderCard(card, board) {
  var _a, _b;
  const container = activeDocument.createElement("div");
  container.classList.add("fk-card");
  container.classList.add("fk-card--draggable");
  container.dataset.cardId = card.id;
  const titleFieldName = effectiveCardTitle(board);
  if (titleFieldName !== null) {
    const title = activeDocument.createElement("div");
    title.classList.add("fk-card__title");
    title.textContent = (_a = card.values[titleFieldName]) != null ? _a : "";
    container.appendChild(title);
  }
  const secondaryFields = effectiveCardFields(board).map((name) => board.fields.find((f) => f.name === name)).filter((f) => f !== void 0);
  if (secondaryFields.length) {
    const fieldsEl = activeDocument.createElement("div");
    fieldsEl.classList.add("fk-card__fields");
    const showLabels = board.viewConfig.cardLabels !== false;
    for (const field of secondaryFields) {
      const value = (_b = card.values[field.name]) != null ? _b : "";
      if (!value) continue;
      const row = activeDocument.createElement("div");
      row.classList.add("fk-card__field");
      if (showLabels) {
        const labelEl = activeDocument.createElement("span");
        labelEl.classList.add("fk-card__field-label");
        labelEl.textContent = field.label;
        row.appendChild(labelEl);
      }
      if (field.type === "Link") {
        const linksEl = activeDocument.createElement("span");
        linksEl.classList.add("fk-card__field-links");
        for (const item of splitLinks(value)) {
          const span = activeDocument.createElement("span");
          span.classList.add("fk-card__field-link");
          span.dataset.href = item;
          span.textContent = item;
          linksEl.appendChild(span);
        }
        row.appendChild(linksEl);
      } else {
        const valueEl = activeDocument.createElement("span");
        valueEl.classList.add("fk-card__field-value");
        valueEl.textContent = value;
        row.appendChild(valueEl);
      }
      fieldsEl.appendChild(row);
    }
    if (fieldsEl.childElementCount) container.appendChild(fieldsEl);
  }
  return container;
}

// src/render/column.ts
function renderColumn(name, label, cards, board) {
  const container = activeDocument.createElement("div");
  container.classList.add("fk-column");
  container.dataset.columnValue = name;
  const header = activeDocument.createElement("div");
  header.classList.add("fk-column__header");
  const title = activeDocument.createElement("span");
  title.classList.add("fk-column__title");
  title.textContent = label;
  const count = activeDocument.createElement("span");
  count.classList.add("fk-column__count");
  count.textContent = String(cards.length);
  header.appendChild(title);
  header.appendChild(count);
  const cardsContainer = activeDocument.createElement("div");
  cardsContainer.classList.add("fk-column__cards");
  for (const card of cards) {
    cardsContainer.appendChild(renderCard(card, board));
  }
  const addBtn = activeDocument.createElement("button");
  addBtn.classList.add("fk-col__add-btn");
  addBtn.textContent = "+ Add card";
  container.appendChild(header);
  container.appendChild(cardsContainer);
  container.appendChild(addBtn);
  return container;
}

// src/render/board.ts
function capitalise(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
function renderBoard(board) {
  const wrapper = activeDocument.createElement("div");
  wrapper.classList.add("fk-board");
  const header = activeDocument.createElement("div");
  header.classList.add("fk-board__header");
  const settingsBtn = activeDocument.createElement("button");
  settingsBtn.classList.add("fk-board__settings");
  settingsBtn.textContent = "\u2699";
  settingsBtn.title = "Board settings";
  header.appendChild(settingsBtn);
  const titleEl = activeDocument.createElement("span");
  titleEl.classList.add("fk-board__title");
  titleEl.textContent = board.title;
  header.appendChild(titleEl);
  wrapper.appendChild(header);
  const columnsContainer = activeDocument.createElement("div");
  columnsContainer.classList.add("fk-board__columns");
  const columnField = board.fields.find((f) => f.name === board.viewConfig.columns);
  if (columnField == null ? void 0 : columnField.options) {
    for (const option of columnField.options) {
      const cards = board.cards.filter((c) => c.values[columnField.name] === option);
      columnsContainer.appendChild(renderColumn(option, capitalise(option), cards, board));
    }
  }
  wrapper.appendChild(columnsContainer);
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
    const footer = activeDocument.createElement("div");
    footer.classList.add("fk-modal-footer");
    if (this.onDelete) {
      const deleteBtn = activeDocument.createElement("button");
      deleteBtn.classList.add("fk-modal-delete");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        this.onDelete();
        this.close();
      });
      footer.appendChild(deleteBtn);
    }
    const saveBtn = activeDocument.createElement("button");
    saveBtn.classList.add("fk-modal-save");
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      var _a2;
      const values = { ...this.values };
      this.close();
      (_a2 = this.containerEl) == null ? void 0 : _a2.remove();
      this.onConfirm(values);
    });
    footer.appendChild(saveBtn);
    contentEl.appendChild(footer);
    (_a = contentEl.querySelector("input, textarea, select")) == null ? void 0 : _a.focus();
  }
  renderField(container, field, initialOverride) {
    var _a, _b;
    const initialValue = initialOverride != null ? initialOverride : this.card ? (_a = this.card.values[field.name]) != null ? _a : "" : (_b = field.default) != null ? _b : "";
    this.values[field.name] = initialValue;
    const wrapper = activeDocument.createElement("div");
    wrapper.classList.add("fk-modal-field");
    const label = activeDocument.createElement("label");
    label.textContent = field.label;
    wrapper.appendChild(label);
    const onChange = (value) => {
      this.values[field.name] = value;
    };
    if (field.type === "Link") {
      this.renderLinkField(wrapper, field, initialValue, onChange);
    } else if (field.type === "Select" && field.options) {
      const sel = activeDocument.createElement("select");
      sel.classList.add("fk-modal-input");
      for (const opt of field.options) {
        const o = activeDocument.createElement("option");
        o.value = opt;
        o.textContent = opt;
        if (opt === initialValue) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => onChange(sel.value));
      wrapper.appendChild(sel);
    } else if (field.type === "Textarea") {
      const ta = activeDocument.createElement("textarea");
      ta.classList.add("fk-modal-input");
      ta.value = initialValue;
      ta.rows = 4;
      ta.addEventListener("input", () => onChange(ta.value));
      wrapper.appendChild(ta);
    } else {
      const inp = activeDocument.createElement("input");
      inp.classList.add("fk-modal-input");
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
      wrapper.appendChild(inp);
    }
    container.appendChild(wrapper);
  }
  renderLinkField(container, _field, initialValue, onChange) {
    const items = splitLinks(initialValue);
    const field = activeDocument.createElement("div");
    field.classList.add("fk-link-field");
    container.appendChild(field);
    const itemList = activeDocument.createElement("div");
    field.appendChild(itemList);
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
        const row = activeDocument.createElement("div");
        row.classList.add("fk-link-item");
        const remove = activeDocument.createElement("span");
        remove.classList.add("fk-link-item__remove");
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
        const val = activeDocument.createElement("span");
        val.classList.add("fk-link-item__value");
        val.setAttribute("role", "button");
        val.setAttribute("tabindex", "0");
        val.textContent = item;
        val.addEventListener("click", () => openLink(item));
        val.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") openLink(item);
        });
        row.appendChild(remove);
        row.appendChild(val);
        itemList.appendChild(row);
      }
    };
    renderItems();
    const controls = activeDocument.createElement("div");
    controls.classList.add("fk-link-controls");
    const addFileBtn = activeDocument.createElement("button");
    addFileBtn.classList.add("fk-link-add--file");
    addFileBtn.textContent = "+ Add file";
    addFileBtn.addEventListener("click", () => {
      new LinkFilePicker(this.app, (path) => {
        items.push(path);
        onChange(joinLinks(items));
        renderItems();
      }).open();
    });
    const urlInputArea = activeDocument.createElement("div");
    urlInputArea.classList.add("fk-link-url-input");
    urlInputArea.style.display = "none";
    const urlInput = activeDocument.createElement("input");
    urlInput.type = "text";
    urlInput.placeholder = "https://\u2026";
    const urlError = activeDocument.createElement("span");
    urlError.classList.add("fk-link-error");
    const urlConfirm = activeDocument.createElement("button");
    urlConfirm.classList.add("fk-link-url-confirm");
    urlConfirm.textContent = "Add";
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
      urlInputArea.style.display = "none";
      renderItems();
    });
    urlInputArea.appendChild(urlInput);
    urlInputArea.appendChild(urlError);
    urlInputArea.appendChild(urlConfirm);
    const addUrlBtn = activeDocument.createElement("button");
    addUrlBtn.classList.add("fk-link-add--url");
    addUrlBtn.textContent = "+ Add URL";
    addUrlBtn.addEventListener("click", () => {
      const hidden = urlInputArea.style.display === "none";
      urlInputArea.style.display = hidden ? "" : "none";
      if (hidden) urlInput.focus();
    });
    controls.appendChild(addFileBtn);
    controls.appendChild(addUrlBtn);
    controls.appendChild(urlInputArea);
    field.appendChild(controls);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/render/board-config-modal.ts
var import_obsidian2 = require("obsidian");
function deriveFieldName(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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
    this.errorEl = activeDocument.createElement("p");
    this.errorEl.classList.add("fk-modal-error");
    contentEl.appendChild(this.errorEl);
    const saveBtn = activeDocument.createElement("button");
    saveBtn.classList.add("fk-modal-save");
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => this.submit());
    contentEl.appendChild(saveBtn);
    (_a = contentEl.querySelector("input")) == null ? void 0 : _a.focus();
  }
  renderTitleInput(container) {
    const wrap = this.field(container, "Board title");
    const inp = activeDocument.createElement("input");
    inp.type = "text";
    inp.classList.add("fk-modal-input");
    inp.value = this.schema.title;
    inp.addEventListener("input", () => {
      this.schema.title = inp.value;
    });
    wrap.appendChild(inp);
  }
  renderFieldsSection(container) {
    const section = activeDocument.createElement("div");
    section.classList.add("fk-modal-section");
    const heading = activeDocument.createElement("p");
    heading.classList.add("fk-modal-section-label");
    heading.textContent = "Fields";
    section.appendChild(heading);
    this.fieldListEl = activeDocument.createElement("div");
    this.fieldListEl.classList.add("fk-modal-field-list");
    section.appendChild(this.fieldListEl);
    this.rerenderFieldList();
    const addBtn = activeDocument.createElement("button");
    addBtn.classList.add("fk-modal-add-field");
    addBtn.textContent = "+ Add field";
    addBtn.addEventListener("click", () => {
      this.schema.fields.push({ name: "", type: "Text", label: "" });
      this.rerenderFieldList();
      this.refreshViewConfig();
    });
    section.appendChild(addBtn);
    container.appendChild(section);
  }
  rerenderFieldList() {
    if (!this.fieldListEl) return;
    this.fieldListEl.innerHTML = "";
    this.schema.fields.forEach((f, idx) => {
      this.fieldListEl.appendChild(this.renderFieldRow(f, idx));
    });
  }
  renderFieldRow(field, idx) {
    var _a, _b;
    const total = this.schema.fields.length;
    const row = activeDocument.createElement("div");
    row.classList.add("fk-modal-field-row");
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
    const typeSelect = activeDocument.createElement("select");
    typeSelect.classList.add("fk-modal-input-sm", "fk-col-type");
    for (const t of FIELD_TYPES) {
      const o = activeDocument.createElement("option");
      o.value = t;
      o.textContent = t;
      if (t === field.type) o.selected = true;
      typeSelect.appendChild(o);
    }
    row.appendChild(typeSelect);
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
    const controls = activeDocument.createElement("div");
    controls.classList.add("fk-modal-row-controls");
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
    row.appendChild(controls);
    return row;
  }
  renderViewConfig(container) {
    const section = activeDocument.createElement("div");
    section.classList.add("fk-modal-section");
    const colWrap = this.field(section, "Columns field");
    const colSelect = activeDocument.createElement("select");
    colSelect.classList.add("fk-modal-input");
    colSelect.dataset.role = "columns";
    this.populateFieldSelect(colSelect, this.schema.viewConfig.columns);
    colSelect.addEventListener("change", () => {
      this.schema.viewConfig.columns = colSelect.value;
    });
    colWrap.appendChild(colSelect);
    container.appendChild(section);
  }
  renderCardDisplay(container) {
    var _a;
    const section = activeDocument.createElement("div");
    section.classList.add("fk-modal-section");
    const heading = activeDocument.createElement("p");
    heading.classList.add("fk-modal-section-label");
    heading.textContent = "Card display";
    section.appendChild(heading);
    const titleWrap = this.field(section, "Card title");
    const titleSelect = activeDocument.createElement("select");
    titleSelect.classList.add("fk-modal-input");
    titleSelect.dataset.role = "card-title-select";
    const autoOpt = activeDocument.createElement("option");
    autoOpt.value = "__auto__";
    autoOpt.textContent = "(auto)";
    titleSelect.appendChild(autoOpt);
    const noneOpt = activeDocument.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "(none)";
    titleSelect.appendChild(noneOpt);
    this.populateCardTitleSelect(titleSelect);
    titleSelect.value = (_a = this.schema.viewConfig.cardTitle) != null ? _a : "__auto__";
    titleSelect.addEventListener("change", () => {
      const v = titleSelect.value;
      this.schema.viewConfig.cardTitle = v === "__auto__" ? void 0 : v;
    });
    titleWrap.appendChild(titleSelect);
    const labelsWrap = this.field(section, "Show labels");
    const labelsCheck = activeDocument.createElement("input");
    labelsCheck.type = "checkbox";
    labelsCheck.checked = this.schema.viewConfig.cardLabels !== false;
    labelsCheck.addEventListener("change", () => {
      this.schema.viewConfig.cardLabels = labelsCheck.checked ? void 0 : false;
    });
    labelsWrap.appendChild(labelsCheck);
    this.cardFieldListEl = activeDocument.createElement("div");
    this.cardFieldListEl.classList.add("fk-modal-field-list");
    section.appendChild(this.cardFieldListEl);
    this.rerenderCardFieldList();
    const addRow = activeDocument.createElement("div");
    addRow.dataset.role = "card-display-add";
    const addSelect = activeDocument.createElement("select");
    addSelect.classList.add("fk-modal-input-sm");
    addSelect.dataset.role = "card-display-select";
    addRow.appendChild(addSelect);
    const addBtn = activeDocument.createElement("button");
    addBtn.classList.add("fk-modal-add-field");
    addBtn.textContent = "+ Add field";
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
    addRow.appendChild(addBtn);
    section.appendChild(addRow);
    container.appendChild(section);
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
      const row = activeDocument.createElement("div");
      row.classList.add("fk-modal-field-row");
      const labelEl = activeDocument.createElement("span");
      labelEl.style.flex = "1";
      labelEl.textContent = (_a2 = field == null ? void 0 : field.label) != null ? _a2 : name;
      row.appendChild(labelEl);
      const controls = activeDocument.createElement("div");
      controls.classList.add("fk-modal-row-controls");
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
      row.appendChild(controls);
      this.cardFieldListEl.appendChild(row);
    });
  }
  populateCardTitleSelect(select) {
    const existing = Array.from(select.options).map((o) => o.value);
    for (const f of this.schema.fields.filter((f2) => f2.name !== "_id")) {
      if (!existing.includes(f.name)) {
        const o = activeDocument.createElement("option");
        o.value = f.name;
        o.textContent = f.label || f.name;
        select.appendChild(o);
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
      const o = activeDocument.createElement("option");
      o.value = f.name;
      o.textContent = f.label || f.name;
      select.appendChild(o);
    }
  }
  renderWorkflow(container) {
    var _a;
    const wrap = this.field(container, "Workflow (optional)");
    const inp = activeDocument.createElement("input");
    inp.type = "text";
    inp.classList.add("fk-modal-input");
    inp.placeholder = "todo\u2192doing, doing\u2192done";
    inp.value = (_a = this.schema.rawWorkflow) != null ? _a : "";
    inp.addEventListener("input", () => {
      this.schema.rawWorkflow = inp.value;
    });
    wrap.appendChild(inp);
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
        const o = activeDocument.createElement("option");
        o.value = name;
        o.textContent = name;
        select.appendChild(o);
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
    const wrap = activeDocument.createElement("div");
    wrap.classList.add("fk-modal-field");
    const lbl = activeDocument.createElement("label");
    lbl.textContent = label;
    wrap.appendChild(lbl);
    container.appendChild(wrap);
    return wrap;
  }
  smallInput(container, placeholder, value) {
    const inp = activeDocument.createElement("input");
    inp.type = "text";
    inp.classList.add("fk-modal-input-sm");
    inp.placeholder = placeholder;
    inp.value = value;
    container.appendChild(inp);
    return inp;
  }
  fixedInput(container, placeholder, value, cls) {
    const inp = activeDocument.createElement("input");
    inp.type = "text";
    inp.classList.add("fk-modal-input-sm", cls);
    inp.placeholder = placeholder;
    inp.value = value;
    container.appendChild(inp);
    return inp;
  }
  iconBtn(container, label, disabled) {
    const btn = activeDocument.createElement("button");
    btn.classList.add("fk-modal-icon-btn");
    btn.textContent = label;
    btn.disabled = disabled;
    container.appendChild(btn);
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
  const boardEl = renderBoard(board);
  attachDragDrop(boardEl, board, dispatch);
  attachCardActions(boardEl, board, dispatch, app, sourcePath);
  el.appendChild(boardEl);
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
        const reconciledCards = reconcileCards(schema.fields, board.cards);
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
  const indicator = activeDocument.createElement("div");
  indicator.classList.add("fk-drop-indicator");
  const cardsEl = col.querySelector(".fk-column__cards");
  if (!cardsEl) return;
  if (insertBeforeId === null) {
    cardsEl.appendChild(indicator);
  } else {
    const target = cardsEl.querySelector(`[data-card-id="${insertBeforeId}"]`);
    if (target) cardsEl.insertBefore(indicator, target);
    else cardsEl.appendChild(indicator);
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
  const toast = activeDocument.createElement("div");
  toast.classList.add("fk-toast");
  toast.textContent = `Cannot move from '${from}' to '${to}'. To allow this transition, add '${from} \u2192 ${to}' to the workflow.`;
  activeDocument.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fk-toast--hiding");
    setTimeout(() => toast.remove(), 400);
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
  const panel = activeDocument.createElement("div");
  panel.classList.add("fk-error-panel");
  for (const err of errors) {
    const msg = activeDocument.createElement("p");
    msg.classList.add("fk-error");
    msg.textContent = err.message;
    if (err.hint) {
      const hint = activeDocument.createElement("span");
      hint.classList.add("fk-error-panel__hint");
      hint.textContent = ` \u2014 ${err.hint}`;
      msg.appendChild(hint);
    }
    panel.appendChild(msg);
  }
  const pre = activeDocument.createElement("pre");
  pre.classList.add("fk-error-panel__source");
  pre.textContent = source;
  panel.appendChild(pre);
  const btn = activeDocument.createElement("button");
  btn.classList.add("fk-error-panel__goto");
  btn.textContent = "Go to source";
  btn.addEventListener("click", onGoToSource);
  panel.appendChild(btn);
  container.appendChild(panel);
}
function renderWarningBanner(container, warnings) {
  const banner = activeDocument.createElement("div");
  banner.classList.add("fk-warning-banner");
  const body = activeDocument.createElement("div");
  body.classList.add("fk-warning-banner__body");
  for (const w of warnings) {
    const item = activeDocument.createElement("p");
    item.classList.add("fk-warning-banner__item");
    item.textContent = w.message;
    body.appendChild(item);
  }
  banner.appendChild(body);
  const dismiss = activeDocument.createElement("button");
  dismiss.classList.add("fk-warning-banner__dismiss");
  dismiss.textContent = "\xD7";
  dismiss.setAttribute("aria-label", "Dismiss warnings");
  dismiss.addEventListener("click", () => banner.remove());
  banner.appendChild(dismiss);
  container.appendChild(banner);
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
      const boardWrapper2 = activeDocument.createElement("div");
      el.appendChild(boardWrapper2);
      mountBoard(boardWrapper2, result.board, () => Promise.resolve(), plugin.app, ctx.sourcePath);
      return;
    }
    if (result.readonly) {
      const banner = activeDocument.createElement("p");
      banner.classList.add("fk-banner", "fk-banner--warning");
      banner.textContent = (_a = result.readonlyReason) != null ? _a : "";
      el.appendChild(banner);
    }
    if (result.warnings.length > 0) renderWarningBanner(el, result.warnings);
    const boardWrapper = activeDocument.createElement("div");
    el.appendChild(boardWrapper);
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
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      const err = contentEl.createEl("p", { cls: "fk-error" });
      err.textContent = "No file is open.";
      return;
    }
    const content = await this.app.vault.read(file);
    const location = locateBlock(content, 0);
    if (!location) {
      const err = contentEl.createEl("p", { cls: "fk-error" });
      err.textContent = "No fancy-kanban block found in this file.";
      return;
    }
    const blockText = content.slice(location.start, location.end);
    const inner = blockText.replace(/^```fancy-kanban\n/, "").replace(/\n```$/, "");
    const result = parseBlock(inner);
    if (!result.ok) {
      const err = contentEl.createEl("p", { cls: "fk-error" });
      err.textContent = result.errors.map((e) => e.message).join("; ");
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJzcmMvaW50ZWdyYXRpb24vcG9zdHByb2Nlc3Nvci50cyIsICJzcmMvbW9kZWwvYm9hcmQudHMiLCAic3JjL2RhdGEvZGVwcmVjYXRpb25zLnRzIiwgInNyYy9kYXRhL3NjaGVtYS50cyIsICJzcmMvZGF0YS9wYXJzZXIudHMiLCAic3JjL2RhdGEvbGluay50cyIsICJzcmMvcmVuZGVyL2NhcmQudHMiLCAic3JjL3JlbmRlci9jb2x1bW4udHMiLCAic3JjL3JlbmRlci9ib2FyZC50cyIsICJzcmMvZGF0YS9zZXJpYWxpemVyLnRzIiwgInNyYy9tb2RlbC9tdXRhdGlvbnMudHMiLCAic3JjL2RhdGEvd29ya2Zsb3cudHMiLCAic3JjL3JlbmRlci9jYXJkLW1vZGFsLnRzIiwgInNyYy9yZW5kZXIvYm9hcmQtY29uZmlnLW1vZGFsLnRzIiwgInNyYy9yZW5kZXIvbW91bnQudHMiLCAic3JjL2ludGVncmF0aW9uL3dyaXRlLWJhY2sudHMiLCAic3JjL2ludGVncmF0aW9uL3N0YW5kYWxvbmUtdmlldy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgYWRkSWNvbiwgUGx1Z2luLCBURmlsZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IHJlZ2lzdGVyUG9zdFByb2Nlc3NvciB9IGZyb20gJy4vc3JjL2ludGVncmF0aW9uL3Bvc3Rwcm9jZXNzb3InO1xuaW1wb3J0IHsgRmFuY3lLYW5iYW5WaWV3LCBWSUVXX1RZUEVfRkFOQ1lfS0FOQkFOIH0gZnJvbSAnLi9zcmMvaW50ZWdyYXRpb24vc3RhbmRhbG9uZS12aWV3JztcbmltcG9ydCB7IEJvYXJkQ29uZmlnTW9kYWwgfSBmcm9tICcuL3NyYy9yZW5kZXIvYm9hcmQtY29uZmlnLW1vZGFsJztcbmltcG9ydCB7IHNlcmlhbGl6ZUJvYXJkQmxvY2sgfSBmcm9tICcuL3NyYy9kYXRhL3NlcmlhbGl6ZXInO1xuXG5jb25zdCBGQU5DWV9LQU5CQU5fSUNPTiA9ICdmYW5jeS1rYW5iYW4taWNvbic7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVySWNvbigpOiB2b2lkIHtcblx0YWRkSWNvbihGQU5DWV9LQU5CQU5fSUNPTiwgYDxnIHRyYW5zZm9ybT1cInNjYWxlKDQuMTY2NylcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNDRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj5cbjxwYXRoIGQ9XCJNOC4yIDExSDUuOEM1LjM1ODE3IDExIDUgMTEuMjk4NSA1IDExLjY2NjdWMjIuMzMzM0M1IDIyLjcwMTUgNS4zNTgxNyAyMyA1LjggMjNIOC4yQzguNjQxODMgMjMgOSAyMi43MDE1IDkgMjIuMzMzM1YxMS42NjY3QzkgMTEuMjk4NSA4LjY0MTgzIDExIDguMiAxMVpcIi8+XG48cGF0aCBkPVwiTTEzLjIgMTFIMTAuOEMxMC4zNTgyIDExIDEwIDExLjI5ODUgMTAgMTEuNjY2N1YxOC4zMzMzQzEwIDE4LjcwMTUgMTAuMzU4MiAxOSAxMC44IDE5SDEzLjJDMTMuNjQxOCAxOSAxNCAxOC43MDE1IDE0IDE4LjMzMzNWMTEuNjY2N0MxNCAxMS4yOTg1IDEzLjY0MTggMTEgMTMuMiAxMVpcIi8+XG48cGF0aCBkPVwiTTE4LjIgMTFIMTUuOEMxNS4zNTgyIDExIDE1IDExLjI2ODYgMTUgMTEuNlYxOS40QzE1IDE5LjczMTQgMTUuMzU4MiAyMCAxNS44IDIwSDE4LjJDMTguNjQxOCAyMCAxOSAxOS43MzE0IDE5IDE5LjRWMTEuNkMxOSAxMS4yNjg2IDE4LjY0MTggMTEgMTguMiAxMVpcIi8+XG48cGF0aCBkPVwiTTE4LjMwMDEgOC4yMDA2TDE2LjQwMTEgMi4yMDkyOUMxNi4zMTc5IDEuOTcwMDIgMTYuMTg1MyAxLjc1MDk4IDE2LjAxMTcgMS41NjY1MUMxNS44MzgxIDEuMzgyMDMgMTUuNjI3NSAxLjIzNjI3IDE1LjM5MzggMS4xMzg3NUMxNS4xNiAxLjA0MTIzIDE0LjkwODIgMC45OTQxNDUgMTQuNjU1IDEuMDAwNThDMTQuNDAxOCAxLjAwNzAyIDE0LjE1MjggMS4wNjY4MiAxMy45MjQzIDEuMTc2MDlMMTIuNzc1OSAxLjcyNTA5QzEyLjUzMzYgMS44NDA3MSAxMi4yNjg1IDEuOTAwNjggMTIuMDAwMSAxLjkwMDU5SDguODUwMDdDOC40NTc5OCAxLjkwMDUyIDguMDc2NTkgMi4wMjg0NiA3Ljc2Mzg3IDIuMjY0OTlDNy40NTExNSAyLjUwMTUyIDcuMjI0MjIgMi44MzM2OSA3LjExNzU3IDMuMjEwOTlMNS43MDAwNyA4LjIwMDZcIi8+XG48cGF0aCBkPVwiTTMgOC4yMDA0NEgyMVwiLz5cbjwvZz5gKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmFuY3lLYW5iYW5QbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuXHRhc3luYyBvbmxvYWQoKSB7XG5cdFx0cmVnaXN0ZXJJY29uKCk7XG5cdFx0dGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX0ZBTkNZX0tBTkJBTiwgKGxlYWYpID0+IG5ldyBGYW5jeUthbmJhblZpZXcobGVhZikpO1xuXG5cdFx0cmVnaXN0ZXJQb3N0UHJvY2Vzc29yKHRoaXMpO1xuXG5cdFx0dGhpcy5hZGRSaWJib25JY29uKEZBTkNZX0tBTkJBTl9JQ09OLCAnTmV3IEZhbmN5IEthbmJhbiBib2FyZCcsICgpID0+IHtcblx0XHRcdHRoaXMubmV3Qm9hcmQoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XG5cdFx0XHRpZDogJ25ldy1ib2FyZCcsXG5cdFx0XHRuYW1lOiAnTmV3IGJvYXJkJyxcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB0aGlzLm5ld0JvYXJkKCksXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZENvbW1hbmQoe1xuXHRcdFx0aWQ6ICdpbnNlcnQtYm9hcmQnLFxuXHRcdFx0bmFtZTogJ0luc2VydCBib2FyZCcsXG5cdFx0XHRlZGl0b3JDYWxsYmFjazogKGVkaXRvcikgPT4ge1xuXHRcdFx0XHRjb25zdCB0ZW1wbGF0ZSA9IHNlcmlhbGl6ZUJvYXJkQmxvY2soe1xuXHRcdFx0XHRcdHRpdGxlOiAnTmV3IEJvYXJkJyxcblx0XHRcdFx0XHRmaWVsZHM6IFtcblx0XHRcdFx0XHRcdHsgbmFtZTogJ3RpdGxlJywgdHlwZTogJ1RleHQnLCBsYWJlbDogJ1RpdGxlJyB9LFxuXHRcdFx0XHRcdFx0eyBuYW1lOiAnc3RhdHVzJywgdHlwZTogJ1NlbGVjdCcsIGxhYmVsOiAnU3RhdHVzJywgb3B0aW9uczogWyd0b2RvJywgJ2RvaW5nJywgJ2RvbmUnXSwgZGVmYXVsdDogJ3RvZG8nIH0sXG5cdFx0XHRcdFx0XSxcblx0XHRcdFx0XHR2aWV3Q29uZmlnOiB7IGNvbHVtbnM6ICdzdGF0dXMnIH0sXG5cdFx0XHRcdFx0cmF3V29ya2Zsb3c6ICcnLFxuXHRcdFx0XHRcdHZlcnNpb246IDEsXG5cdFx0XHRcdFx0Y2FyZHM6IFtdLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZWRpdG9yLnJlcGxhY2VSYW5nZSh0ZW1wbGF0ZSwgZWRpdG9yLmdldEN1cnNvcigpKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHRvbnVubG9hZCgpIHtcblx0XHQvLyBpbnRlbnRpb25hbGx5IGVtcHR5IFx1MjAxNCBPYnNpZGlhbiBoYW5kbGVzIGxlYWYgY2xlYW51cFxuXHR9XG5cblx0cHJpdmF0ZSBuZXdCb2FyZCgpOiB2b2lkIHtcblx0XHRuZXcgQm9hcmRDb25maWdNb2RhbCh0aGlzLmFwcCwgbnVsbCwgKHNjaGVtYSkgPT4ge1xuXHRcdFx0Y29uc3QgYmFzZU5hbWUgPSBzY2hlbWEudGl0bGUudHJpbSgpIHx8ICdOZXcgQm9hcmQnO1xuXHRcdFx0bGV0IGZpbGVOYW1lID0gYCR7YmFzZU5hbWV9Lm1kYDtcblx0XHRcdGxldCBjb3VudGVyID0gMjtcblx0XHRcdHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZU5hbWUpKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYCR7YmFzZU5hbWV9ICR7Y291bnRlcn0ubWRgO1xuXHRcdFx0XHRjb3VudGVyKys7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBjb250ZW50ID0gc2VyaWFsaXplQm9hcmRCbG9jayh7IC4uLnNjaGVtYSwgY2FyZHM6IFtdIH0pO1xuXHRcdFx0dm9pZCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZU5hbWUsIGNvbnRlbnQpLnRoZW4oKGZpbGUpID0+IHtcblx0XHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuXHRcdFx0XHRcdHZvaWQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pLm9wZW4oKTtcblx0fVxufVxuIiwgImltcG9ydCB0eXBlIHsgUGx1Z2luLCBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBwYXJzZUJsb2NrIH0gZnJvbSAnLi4vZGF0YS9wYXJzZXInO1xuaW1wb3J0IHR5cGUgeyBQYXJzZUlzc3VlIH0gZnJvbSAnLi4vZGF0YS9wYXJzZXInO1xuaW1wb3J0IHsgbW91bnRCb2FyZCB9IGZyb20gJy4uL3JlbmRlci9tb3VudCc7XG5pbXBvcnQgd3JpdGVCYWNrIGZyb20gJy4vd3JpdGUtYmFjayc7XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9ja0luZGV4RnJvbUNvbnRleHQoY3R4OiBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0LCBlbDogSFRNTEVsZW1lbnQpOiBudW1iZXIge1xuXHRjb25zdCBpbmZvID0gY3R4LmdldFNlY3Rpb25JbmZvKGVsKTtcblx0aWYgKCFpbmZvKSByZXR1cm4gMDtcblx0Y29uc3QgbGluZXMgPSBpbmZvLnRleHQuc3BsaXQoJ1xcbicpO1xuXHRsZXQgY291bnQgPSAwO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8ubGluZVN0YXJ0OyBpKyspIHtcblx0XHRpZiAobGluZXNbaV0udHJpbUVuZCgpID09PSAnYGBgZmFuY3kta2FuYmFuJykgY291bnQrKztcblx0fVxuXHRyZXR1cm4gY291bnQ7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckVycm9yUGFuZWwoXG5cdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG5cdGVycm9yczogUGFyc2VJc3N1ZVtdLFxuXHRzb3VyY2U6IHN0cmluZyxcblx0b25Hb1RvU291cmNlOiAoKSA9PiB2b2lkLFxuKTogdm9pZCB7XG5cdGNvbnN0IHBhbmVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdHBhbmVsLmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsJyk7XG5cblx0Zm9yIChjb25zdCBlcnIgb2YgZXJyb3JzKSB7XG5cdFx0Y29uc3QgbXNnID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdG1zZy5jbGFzc0xpc3QuYWRkKCdmay1lcnJvcicpO1xuXHRcdG1zZy50ZXh0Q29udGVudCA9IGVyci5tZXNzYWdlO1xuXHRcdGlmIChlcnIuaGludCkge1xuXHRcdFx0Y29uc3QgaGludCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdGhpbnQuY2xhc3NMaXN0LmFkZCgnZmstZXJyb3ItcGFuZWxfX2hpbnQnKTtcblx0XHRcdGhpbnQudGV4dENvbnRlbnQgPSBgIFx1MjAxNCAke2Vyci5oaW50fWA7XG5cdFx0XHRtc2cuYXBwZW5kQ2hpbGQoaGludCk7XG5cdFx0fVxuXHRcdHBhbmVsLmFwcGVuZENoaWxkKG1zZyk7XG5cdH1cblxuXHRjb25zdCBwcmUgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwcmUnKTtcblx0cHJlLmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsX19zb3VyY2UnKTtcblx0cHJlLnRleHRDb250ZW50ID0gc291cmNlO1xuXHRwYW5lbC5hcHBlbmRDaGlsZChwcmUpO1xuXG5cdGNvbnN0IGJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRidG4uY2xhc3NMaXN0LmFkZCgnZmstZXJyb3ItcGFuZWxfX2dvdG8nKTtcblx0YnRuLnRleHRDb250ZW50ID0gJ0dvIHRvIHNvdXJjZSc7XG5cdGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG9uR29Ub1NvdXJjZSk7XG5cdHBhbmVsLmFwcGVuZENoaWxkKGJ0bik7XG5cblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHBhbmVsKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyV2FybmluZ0Jhbm5lcihjb250YWluZXI6IEhUTUxFbGVtZW50LCB3YXJuaW5nczogUGFyc2VJc3N1ZVtdKTogdm9pZCB7XG5cdGNvbnN0IGJhbm5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRiYW5uZXIuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXInKTtcblxuXHRjb25zdCBib2R5ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGJvZHkuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXJfX2JvZHknKTtcblx0Zm9yIChjb25zdCB3IG9mIHdhcm5pbmdzKSB7XG5cdFx0Y29uc3QgaXRlbSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRpdGVtLmNsYXNzTGlzdC5hZGQoJ2ZrLXdhcm5pbmctYmFubmVyX19pdGVtJyk7XG5cdFx0aXRlbS50ZXh0Q29udGVudCA9IHcubWVzc2FnZTtcblx0XHRib2R5LmFwcGVuZENoaWxkKGl0ZW0pO1xuXHR9XG5cdGJhbm5lci5hcHBlbmRDaGlsZChib2R5KTtcblxuXHRjb25zdCBkaXNtaXNzID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdGRpc21pc3MuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXJfX2Rpc21pc3MnKTtcblx0ZGlzbWlzcy50ZXh0Q29udGVudCA9ICdcdTAwRDcnO1xuXHRkaXNtaXNzLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdEaXNtaXNzIHdhcm5pbmdzJyk7XG5cdGRpc21pc3MuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBiYW5uZXIucmVtb3ZlKCkpO1xuXHRiYW5uZXIuYXBwZW5kQ2hpbGQoZGlzbWlzcyk7XG5cblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGJhbm5lcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlclBvc3RQcm9jZXNzb3IocGx1Z2luOiBQbHVnaW4pOiB2b2lkIHtcblx0cGx1Z2luLnJlZ2lzdGVyTWFya2Rvd25Db2RlQmxvY2tQcm9jZXNzb3IoJ2ZhbmN5LWthbmJhbicsIChzb3VyY2UsIGVsLCBjdHgpID0+IHtcblx0XHRjb25zdCByZXN1bHQgPSBwYXJzZUJsb2NrKHNvdXJjZSk7XG5cdFx0aWYgKCFyZXN1bHQub2spIHtcblx0XHRcdHJlbmRlckVycm9yUGFuZWwoZWwsIHJlc3VsdC5lcnJvcnMsIHNvdXJjZSwgKCkgPT4ge1xuXHRcdFx0XHR2b2lkIHBsdWdpbi5hcHAud29ya3NwYWNlLm9wZW5MaW5rVGV4dChjdHguc291cmNlUGF0aCwgJycsIGZhbHNlKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGFic3RyYWN0ID0gcGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY3R4LnNvdXJjZVBhdGgpO1xuXHRcdGNvbnN0IGZpbGUgPSBhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlID8gYWJzdHJhY3QgOiBudWxsO1xuXG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRpZiAocmVzdWx0Lndhcm5pbmdzLmxlbmd0aCA+IDApIHJlbmRlcldhcm5pbmdCYW5uZXIoZWwsIHJlc3VsdC53YXJuaW5ncyk7XG5cdFx0XHRjb25zdCBib2FyZFdyYXBwZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGVsLmFwcGVuZENoaWxkKGJvYXJkV3JhcHBlcik7XG5cdFx0XHRtb3VudEJvYXJkKGJvYXJkV3JhcHBlciwgcmVzdWx0LmJvYXJkLCAoKSA9PiBQcm9taXNlLnJlc29sdmUoKSwgcGx1Z2luLmFwcCwgY3R4LnNvdXJjZVBhdGgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHQucmVhZG9ubHkpIHtcblx0XHRcdGNvbnN0IGJhbm5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRcdGJhbm5lci5jbGFzc0xpc3QuYWRkKCdmay1iYW5uZXInLCAnZmstYmFubmVyLS13YXJuaW5nJyk7XG5cdFx0XHRiYW5uZXIudGV4dENvbnRlbnQgPSByZXN1bHQucmVhZG9ubHlSZWFzb24gPz8gJyc7XG5cdFx0XHRlbC5hcHBlbmRDaGlsZChiYW5uZXIpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHQud2FybmluZ3MubGVuZ3RoID4gMCkgcmVuZGVyV2FybmluZ0Jhbm5lcihlbCwgcmVzdWx0Lndhcm5pbmdzKTtcblxuXHRcdGNvbnN0IGJvYXJkV3JhcHBlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGVsLmFwcGVuZENoaWxkKGJvYXJkV3JhcHBlcik7XG5cdFx0Y29uc3QgYmxvY2tJbmRleCA9IGJsb2NrSW5kZXhGcm9tQ29udGV4dChjdHgsIGVsKTtcblx0XHRjb25zdCBzYXZlID0gcmVzdWx0LnJlYWRvbmx5XG5cdFx0XHQ/ICgpID0+IFByb21pc2UucmVzb2x2ZSgpXG5cdFx0XHQ6IChiOiB0eXBlb2YgcmVzdWx0LmJvYXJkKSA9PiB3cml0ZUJhY2socGx1Z2luLmFwcC52YXVsdCwgZmlsZSwgYmxvY2tJbmRleCwgYik7XG5cblx0XHRtb3VudEJvYXJkKGJvYXJkV3JhcHBlciwgcmVzdWx0LmJvYXJkLCBzYXZlLCBwbHVnaW4uYXBwLCBjdHguc291cmNlUGF0aCk7XG5cdH0pO1xufVxuIiwgImV4cG9ydCB0eXBlIEZpZWxkVHlwZSA9ICdUZXh0JyB8ICdUZXh0YXJlYScgfCAnRGF0ZScgfCAnTnVtYmVyJyB8ICdTZWxlY3QnIHwgJ0xpbmsnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpZWxkRGVmaW5pdGlvbiB7XG5cdG5hbWU6IHN0cmluZztcblx0dHlwZTogRmllbGRUeXBlO1xuXHRsYWJlbDogc3RyaW5nO1xuXHRvcHRpb25zPzogc3RyaW5nW107XG5cdGRlZmF1bHQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlld0NvbmZpZyB7XG5cdGNvbHVtbnM6IHN0cmluZztcblx0bGFuZXM/OiBzdHJpbmc7XG5cdGNhcmRUaXRsZT86IHN0cmluZzsgICAgIC8vIGZpZWxkIG5hbWU7ICcnID0gbm8gdGl0bGU7IHVuZGVmaW5lZCA9IGF1dG8tZGV0ZWN0XG5cdGNhcmRGaWVsZHM/OiBzdHJpbmdbXTsgIC8vIHNlY29uZGFyeSBmaWVsZHMgb25seSAodGl0bGUgbm90IGluY2x1ZGVkKVxuXHRjYXJkTGFiZWxzPzogYm9vbGVhbjsgICAvLyBmYWxzZSA9IGhpZGUgbGFiZWxzIG9uIHNlY29uZGFyeSBmaWVsZHM7IGRlZmF1bHQgdHJ1ZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENhcmQge1xuXHRpZDogc3RyaW5nO1xuXHR2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBjb25zdCBTVVBQT1JURURfVkVSU0lPTiA9IDI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9hcmRTY2hlbWEge1xuXHR0aXRsZTogc3RyaW5nO1xuXHRmaWVsZHM6IEZpZWxkRGVmaW5pdGlvbltdO1xuXHR2aWV3Q29uZmlnOiBWaWV3Q29uZmlnO1xuXHRyYXdXb3JrZmxvdzogc3RyaW5nO1xuXHR2ZXJzaW9uOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9hcmQgZXh0ZW5kcyBCb2FyZFNjaGVtYSB7XG5cdGNhcmRzOiBDYXJkW107XG59XG4iLCAiZXhwb3J0IGNvbnN0IFdfRklFTERfVFlQRV9ERVBSRUNBVEVEID0gJ1dfRklFTERfVFlQRV9ERVBSRUNBVEVEJztcblxuZXhwb3J0IGludGVyZmFjZSBEZXByZWNhdGVkRW50cnkge1xuXHRyZXBsYWNlbWVudDogc3RyaW5nO1xuXHRyZW1vdmVBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgREVQUkVDQVRFRF9GSUVMRF9UWVBFUzogUmVjb3JkPHN0cmluZywgRGVwcmVjYXRlZEVudHJ5PiA9IHtcblx0RmlsZTogeyByZXBsYWNlbWVudDogJ0xpbmsnLCByZW1vdmVBdDogJzAuNS4wJyB9LFxufTtcbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkU2NoZW1hLCBDYXJkLCBGaWVsZERlZmluaXRpb24sIEZpZWxkVHlwZSB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IERFUFJFQ0FURURfRklFTERfVFlQRVMsIFdfRklFTERfVFlQRV9ERVBSRUNBVEVEIH0gZnJvbSAnLi9kZXByZWNhdGlvbnMnO1xuXG50eXBlIENvbmZpZ1dhcm5pbmcgPSB7IGNvZGU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nOyBoaW50Pzogc3RyaW5nIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbmZpZyhjb25maWdUZXh0OiBzdHJpbmcpOiBCb2FyZFNjaGVtYSAmIHsgd2FybmluZ3M6IENvbmZpZ1dhcm5pbmdbXSB9IHtcblx0Y29uc3QgbGluZXMgPSBjb25maWdUZXh0LnNwbGl0KCdcXG4nKTtcblx0bGV0IHRpdGxlID0gJyc7XG5cdGxldCByYXdXb3JrZmxvdyA9ICcnO1xuXHRsZXQgbGFuZXM6IHN0cmluZyB8IHVuZGVmaW5lZDtcblx0bGV0IGNhcmRUaXRsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXHRsZXQgY2FyZEZpZWxkczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG5cdGxldCBjYXJkTGFiZWxzOiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXHRsZXQgdmVyc2lvbiA9IDE7XG5cdGNvbnN0IGZpZWxkczogRmllbGREZWZpbml0aW9uW10gPSBbXTtcblx0Y29uc3Qgd2FybmluZ3M6IENvbmZpZ1dhcm5pbmdbXSA9IFtdO1xuXHRsZXQgaW5GaWVsZHMgPSBmYWxzZTtcblxuXHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XG5cdFx0aWYgKCF0cmltbWVkKSBjb250aW51ZTtcblxuXHRcdGlmIChpbkZpZWxkcyAmJiB0cmltbWVkLnN0YXJ0c1dpdGgoJy0gJykpIHtcblx0XHRcdGNvbnN0IHsgZmllbGQsIHdhcm5pbmcgfSA9IHBhcnNlRmllbGRMaW5lKHRyaW1tZWQuc2xpY2UoMikpO1xuXHRcdFx0ZmllbGRzLnB1c2goZmllbGQpO1xuXHRcdFx0aWYgKHdhcm5pbmcpIHdhcm5pbmdzLnB1c2god2FybmluZyk7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRpbkZpZWxkcyA9IGZhbHNlO1xuXG5cdFx0Y29uc3QgY29sb25JZHggPSB0cmltbWVkLmluZGV4T2YoJzonKTtcblx0XHRpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZTtcblxuXHRcdGNvbnN0IGtleSA9IHRyaW1tZWQuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKTtcblx0XHRjb25zdCB2YWx1ZSA9IHRyaW1tZWQuc2xpY2UoY29sb25JZHggKyAxKS50cmltKCk7XG5cblx0XHRpZiAoa2V5ID09PSAndGl0bGUnKSB0aXRsZSA9IHZhbHVlO1xuXHRcdGVsc2UgaWYgKGtleSA9PT0gJ3ZlcnNpb24nKSB2ZXJzaW9uID0gcGFyc2VJbnQodmFsdWUsIDEwKSB8fCAxO1xuXHRcdGVsc2UgaWYgKGtleSA9PT0gJ3dvcmtmbG93JykgcmF3V29ya2Zsb3cgPSB2YWx1ZS5yZXBsYWNlKC9eXCIoLiopXCIkLywgJyQxJyk7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAnbGFuZXMnKSBsYW5lcyA9IHZhbHVlO1xuXHRcdGVsc2UgaWYgKGtleSA9PT0gJ2NhcmRfdGl0bGUnKSBjYXJkVGl0bGUgPSB2YWx1ZTtcblx0XHRlbHNlIGlmIChrZXkgPT09ICdjYXJkX2ZpZWxkcycpIHtcblx0XHRcdGNvbnN0IHBhcnRzID0gdmFsdWUuc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pO1xuXHRcdFx0aWYgKHBhcnRzLmxlbmd0aCkgY2FyZEZpZWxkcyA9IHBhcnRzO1xuXHRcdH1cblx0XHRlbHNlIGlmIChrZXkgPT09ICdjYXJkX2xhYmVscycpIHtcblx0XHRcdGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykgY2FyZExhYmVscyA9IGZhbHNlO1xuXHRcdH1cblx0XHRlbHNlIGlmIChrZXkgPT09ICdmaWVsZHMnKSBpbkZpZWxkcyA9IHRydWU7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHRpdGxlLFxuXHRcdGZpZWxkcyxcblx0XHRyYXdXb3JrZmxvdyxcblx0XHR2ZXJzaW9uLFxuXHRcdHZpZXdDb25maWc6IHsgY29sdW1uczogJ3N0YXR1cycsIGxhbmVzLCBjYXJkVGl0bGUsIGNhcmRGaWVsZHMsIGNhcmRMYWJlbHMgfSxcblx0XHR3YXJuaW5ncyxcblx0fTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGaWVsZExpbmUobGluZTogc3RyaW5nKTogeyBmaWVsZDogRmllbGREZWZpbml0aW9uOyB3YXJuaW5nPzogQ29uZmlnV2FybmluZyB9IHtcblx0Y29uc3Qga3ZzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cdGNvbnN0IHBhcnRzID0gc3BsaXRGaWVsZFBhcnRzKGxpbmUpO1xuXG5cdGZvciAoY29uc3QgcGFydCBvZiBwYXJ0cykge1xuXHRcdGNvbnN0IGNvbG9uSWR4ID0gcGFydC5pbmRleE9mKCc6Jyk7XG5cdFx0aWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWU7XG5cdFx0Y29uc3Qga2V5ID0gcGFydC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpO1xuXHRcdGNvbnN0IHZhbHVlID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKTtcblx0XHRpZiAoa2V5KSBrdnNba2V5XSA9IHZhbHVlO1xuXHR9XG5cblx0aWYgKCFrdnNbJ25hbWUnXSkgdGhyb3cgbmV3IEVycm9yKGBGaWVsZCBkZWZpbml0aW9uIG1pc3NpbmcgJ25hbWUnOiAke2xpbmV9YCk7XG5cdGlmICgha3ZzWyd0eXBlJ10pIHRocm93IG5ldyBFcnJvcihgRmllbGQgZGVmaW5pdGlvbiBtaXNzaW5nICd0eXBlJzogJHtsaW5lfWApO1xuXG5cdGNvbnN0IHJhd1R5cGUgPSBrdnNbJ3R5cGUnXTtcblx0Y29uc3QgZGVwcmVjYXRpb24gPSBERVBSRUNBVEVEX0ZJRUxEX1RZUEVTW3Jhd1R5cGVdO1xuXHRjb25zdCB0eXBlOiBGaWVsZFR5cGUgPSBkZXByZWNhdGlvbiA/IChkZXByZWNhdGlvbi5yZXBsYWNlbWVudCBhcyBGaWVsZFR5cGUpIDogKHJhd1R5cGUgYXMgRmllbGRUeXBlKTtcblx0Y29uc3Qgd2FybmluZzogQ29uZmlnV2FybmluZyB8IHVuZGVmaW5lZCA9IGRlcHJlY2F0aW9uID8ge1xuXHRcdGNvZGU6IFdfRklFTERfVFlQRV9ERVBSRUNBVEVELFxuXHRcdG1lc3NhZ2U6IGBGaWVsZCB0eXBlICcke3Jhd1R5cGV9JyBpcyBkZXByZWNhdGVkLCB1c2UgJyR7ZGVwcmVjYXRpb24ucmVwbGFjZW1lbnR9JyBpbnN0ZWFkICh3aWxsIGJlIHJlbW92ZWQgaW4gJHtkZXByZWNhdGlvbi5yZW1vdmVBdH0pYCxcblx0XHRoaW50OiBgUmVwbGFjZSAndHlwZTogJHtyYXdUeXBlfScgd2l0aCAndHlwZTogJHtkZXByZWNhdGlvbi5yZXBsYWNlbWVudH0nIGluIHlvdXIgYm9hcmQgY29uZmlnYCxcblx0fSA6IHVuZGVmaW5lZDtcblxuXHRjb25zdCBmaWVsZDogRmllbGREZWZpbml0aW9uID0ge1xuXHRcdG5hbWU6IGt2c1snbmFtZSddLFxuXHRcdHR5cGUsXG5cdFx0bGFiZWw6IGt2c1snbGFiZWwnXSA/PyBrdnNbJ25hbWUnXSxcblx0fTtcblxuXHRpZiAoa3ZzWydvcHRpb25zJ10gIT09IHVuZGVmaW5lZCkgZmllbGQub3B0aW9ucyA9IGt2c1snb3B0aW9ucyddLnNwbGl0KCd8Jyk7XG5cdGlmIChrdnNbJ2RlZmF1bHQnXSAhPT0gdW5kZWZpbmVkKSBmaWVsZC5kZWZhdWx0ID0ga3ZzWydkZWZhdWx0J107XG5cblx0cmV0dXJuIHsgZmllbGQsIHdhcm5pbmcgfTtcbn1cblxuZnVuY3Rpb24gc3BsaXRGaWVsZFBhcnRzKGxpbmU6IHN0cmluZyk6IHN0cmluZ1tdIHtcblx0Ly8gU3BsaXQgb24gY29tbWFzIGJ1dCBub3Qgd2l0aGluIHZhbHVlcyBcdTIwMTQgZmllbGQgdmFsdWVzIGRvbid0IGNvbnRhaW4gY29tbWFzIHBlciBzcGVjLFxuXHQvLyBzbyBhIHNpbXBsZSBzcGxpdCBpcyBzYWZlIGhlcmUuXG5cdHJldHVybiBsaW5lLnNwbGl0KCcsJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvbmNpbGVDYXJkcyhmaWVsZHM6IEZpZWxkRGVmaW5pdGlvbltdLCBjYXJkczogQ2FyZFtdKTogQ2FyZFtdIHtcblx0cmV0dXJuIGNhcmRzLm1hcChjYXJkID0+IHtcblx0XHRjb25zdCB2YWx1ZXMgPSB7IC4uLmNhcmQudmFsdWVzIH07XG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZHMpIHtcblx0XHRcdGlmICghKGZpZWxkLm5hbWUgaW4gdmFsdWVzKSkge1xuXHRcdFx0XHR2YWx1ZXNbZmllbGQubmFtZV0gPSBmaWVsZC5kZWZhdWx0ID8/ICcnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4geyAuLi5jYXJkLCB2YWx1ZXMgfTtcblx0fSk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCwgRmllbGREZWZpbml0aW9uIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgU1VQUE9SVEVEX1ZFUlNJT04gfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyBwYXJzZUNvbmZpZywgcmVjb25jaWxlQ2FyZHMgfSBmcm9tICcuL3NjaGVtYSc7XG5leHBvcnQgeyBXX0ZJRUxEX1RZUEVfREVQUkVDQVRFRCB9IGZyb20gJy4vZGVwcmVjYXRpb25zJztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZUlzc3VlIHtcblx0Y29kZTogc3RyaW5nO1xuXHRtZXNzYWdlOiBzdHJpbmc7XG5cdGxpbmU/OiBudW1iZXI7XG5cdGhpbnQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBFX05PX0RFTElNSVRFUlMgPSAnRV9OT19ERUxJTUlURVJTJztcbmV4cG9ydCBjb25zdCBFX05PX1RJVExFID0gJ0VfTk9fVElUTEUnO1xuZXhwb3J0IGNvbnN0IEVfTk9fU1RBVFVTX0ZJRUxEID0gJ0VfTk9fU1RBVFVTX0ZJRUxEJztcbmV4cG9ydCBjb25zdCBXX1JPV19NQUxGT1JNRUQgPSAnV19ST1dfTUFMRk9STUVEJztcblxuZXhwb3J0IHR5cGUgUGFyc2VSZXN1bHQgPVxuXHR8IHsgb2s6IHRydWU7IGJvYXJkOiBCb2FyZDsgcmVhZG9ubHk6IGJvb2xlYW47IHJlYWRvbmx5UmVhc29uPzogc3RyaW5nOyB3YXJuaW5nczogUGFyc2VJc3N1ZVtdIH1cblx0fCB7IG9rOiBmYWxzZTsgZXJyb3JzOiBQYXJzZUlzc3VlW107IHdhcm5pbmdzOiBQYXJzZUlzc3VlW10gfTtcblxuLy8gU3BsaXRzIGEgbWFya2Rvd24gdGFibGUgcm93IG9uIHVuZXNjYXBlZCBwaXBlcyBvbmx5LlxuLy8gU3RyaXBzIHRoZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBwaXBlIGRlbGltaXRlcnMgb2YgdGhlIHJvdy5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdFJvdyhsaW5lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG5cdGNvbnN0IGNlbGxzOiBzdHJpbmdbXSA9IFtdO1xuXHRsZXQgY3VycmVudCA9ICcnO1xuXHRsZXQgaSA9IDA7XG5cblx0Ly8gU2tpcCB0aGUgbGVhZGluZyAnfCdcblx0aWYgKGxpbmVbMF0gPT09ICd8JykgaSA9IDE7XG5cblx0d2hpbGUgKGkgPCBsaW5lLmxlbmd0aCkge1xuXHRcdGlmIChsaW5lW2ldID09PSAnXFxcXCcgJiYgKGxpbmVbaSArIDFdID09PSAnfCcgfHwgbGluZVtpICsgMV0gPT09ICdcXFxcJykpIHtcblx0XHRcdGN1cnJlbnQgKz0gbGluZVtpXSArIGxpbmVbaSArIDFdO1xuXHRcdFx0aSArPSAyO1xuXHRcdH0gZWxzZSBpZiAobGluZVtpXSA9PT0gJ3wnKSB7XG5cdFx0XHRjZWxscy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0Y3VycmVudCA9ICcnO1xuXHRcdFx0aSsrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50ICs9IGxpbmVbaV07XG5cdFx0XHRpKys7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVGhlIHRyYWlsaW5nICd8JyBjYXVzZXMgYW4gZW1wdHkgc3RyaW5nIGF0IHRoZSBlbmQgXHUyMDE0IGRyb3AgaXRcblx0aWYgKGN1cnJlbnQgIT09ICcnKSBjZWxscy5wdXNoKGN1cnJlbnQpO1xuXG5cdHJldHVybiBjZWxscztcbn1cblxuLy8gVW5lc2NhcGVzIGEgc2luZ2xlIGNlbGwgdmFsdWU6IDxicj4gXHUyMTkyIG5ld2xpbmUsIFxcfCBcdTIxOTIgfCwgXFxcXCBcdTIxOTIgXFwuIFRyaW1zIHdoaXRlc3BhY2UuXG5leHBvcnQgZnVuY3Rpb24gdW5lc2NhcGVDZWxsKGNlbGw6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBjZWxsXG5cdFx0LnRyaW0oKVxuXHRcdC5yZXBsYWNlKC88YnJcXC8/Pi9naSwgJ1xcbicpXG5cdFx0LnJlcGxhY2UoL1xcXFxbfF0vZywgJ3wnKVxuXHRcdC5yZXBsYWNlKC9cXFxcXFxcXC9nLCAnXFxcXCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUYWJsZSh0YWJsZVRleHQ6IHN0cmluZywgZmllbGRzOiBGaWVsZERlZmluaXRpb25bXSk6IHsgY2FyZHM6IENhcmRbXTsgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSB9IHtcblx0Y29uc3QgbGluZXMgPSB0YWJsZVRleHQuc3BsaXQoJ1xcbicpLmZpbHRlcihsID0+IGwudHJpbSgpLnN0YXJ0c1dpdGgoJ3wnKSk7XG5cdGlmIChsaW5lcy5sZW5ndGggPCAyKSByZXR1cm4geyBjYXJkczogW10sIHdhcm5pbmdzOiBbXSB9O1xuXG5cdGNvbnN0IGhlYWRlckNlbGxzID0gc3BsaXRSb3cobGluZXNbMF0pLm1hcChjID0+IHVuZXNjYXBlQ2VsbChjKS50b0xvd2VyQ2FzZSgpKTtcblx0Ly8gbGluZXNbMV0gaXMgdGhlIHNlcGFyYXRvciByb3cgXHUyMDE0IHNraXAgaXRcblx0Y29uc3QgZGF0YUxpbmVzID0gbGluZXMuc2xpY2UoMik7XG5cblx0Ly8gQnVpbGQgbGFiZWwgXHUyMTkyIGZpZWxkIG5hbWUgbWFwIChjYXNlLWluc2Vuc2l0aXZlKVxuXHRjb25zdCBsYWJlbFRvRmllbGQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGZpZWxkcykge1xuXHRcdGxhYmVsVG9GaWVsZC5zZXQoZmllbGQubGFiZWwudG9Mb3dlckNhc2UoKSwgZmllbGQubmFtZSk7XG5cdH1cblxuXHRjb25zdCBjYXJkczogQ2FyZFtdID0gW107XG5cdGNvbnN0IHdhcm5pbmdzOiBQYXJzZUlzc3VlW10gPSBbXTtcblxuXHRmb3IgKGxldCByb3dJZHggPSAwOyByb3dJZHggPCBkYXRhTGluZXMubGVuZ3RoOyByb3dJZHgrKykge1xuXHRcdGNvbnN0IGxpbmUgPSBkYXRhTGluZXNbcm93SWR4XTtcblx0XHRjb25zdCBjZWxscyA9IHNwbGl0Um93KGxpbmUpLm1hcCh1bmVzY2FwZUNlbGwpO1xuXG5cdFx0aWYgKGNlbGxzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0d2FybmluZ3MucHVzaCh7XG5cdFx0XHRcdGNvZGU6IFdfUk9XX01BTEZPUk1FRCxcblx0XHRcdFx0bWVzc2FnZTogYFJvdyAke3Jvd0lkeCArIDF9IGNvdWxkIG5vdCBiZSBwYXJzZWQgYW5kIHdhcyBza2lwcGVkYCxcblx0XHRcdFx0bGluZTogcm93SWR4ICsgMSxcblx0XHRcdH0pO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaWQgPSBoZWFkZXJDZWxsc1swXSA9PT0gJ19pZCcgPyAoY2VsbHNbMF0gPz8gJycpIDogJyc7XG5cdFx0Y29uc3Qgc3RhcnRJZHggPSBoZWFkZXJDZWxsc1swXSA9PT0gJ19pZCcgPyAxIDogMDtcblxuXHRcdGNvbnN0IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRcdGZvciAobGV0IGkgPSBzdGFydElkeDsgaSA8IGhlYWRlckNlbGxzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb25zdCBsYWJlbCA9IGhlYWRlckNlbGxzW2ldO1xuXHRcdFx0Y29uc3QgZmllbGROYW1lID0gbGFiZWxUb0ZpZWxkLmdldChsYWJlbCkgPz8gbGFiZWw7XG5cdFx0XHR2YWx1ZXNbZmllbGROYW1lXSA9IGNlbGxzW2ldID8/ICcnO1xuXHRcdH1cblxuXHRcdGNhcmRzLnB1c2goeyBpZCwgdmFsdWVzIH0pO1xuXHR9XG5cblx0cmV0dXJuIHsgY2FyZHMsIHdhcm5pbmdzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUJsb2NrKGJsb2NrVGV4dDogc3RyaW5nKTogUGFyc2VSZXN1bHQge1xuXHR0cnkge1xuXHRcdGNvbnN0IHBhcnRzID0gYmxvY2tUZXh0LnNwbGl0KC9eLS0tJC9tKTtcblx0XHRpZiAocGFydHMubGVuZ3RoIDwgMykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcnM6IFt7IGNvZGU6IEVfTk9fREVMSU1JVEVSUywgbWVzc2FnZTogJ0Jsb2NrIG11c3QgY29udGFpbiB0d28gLS0tIGRlbGltaXRlcnMgc2VwYXJhdGluZyBjb25maWcgZnJvbSB0YWJsZScgfV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29uZmlnVGV4dCA9IHBhcnRzWzFdLnRyaW0oKTtcblx0XHRjb25zdCB0YWJsZVRleHQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCctLS0nKTtcblxuXHRcdGNvbnN0IHsgd2FybmluZ3M6IGNvbmZpZ1dhcm5pbmdzLCAuLi5zY2hlbWEgfSA9IHBhcnNlQ29uZmlnKGNvbmZpZ1RleHQpO1xuXHRcdGlmICghc2NoZW1hLnRpdGxlKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRvazogZmFsc2UsXG5cdFx0XHRcdGVycm9yczogW3sgY29kZTogRV9OT19USVRMRSwgbWVzc2FnZTogJ0JvYXJkIGNvbmZpZyBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZScgfV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29sdW1uc0ZpZWxkID0gc2NoZW1hLmZpZWxkcy5maW5kKGYgPT4gZi5uYW1lID09PSBzY2hlbWEudmlld0NvbmZpZy5jb2x1bW5zKTtcblx0XHRpZiAoIWNvbHVtbnNGaWVsZCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcnM6IFt7XG5cdFx0XHRcdFx0Y29kZTogRV9OT19TVEFUVVNfRklFTEQsXG5cdFx0XHRcdFx0bWVzc2FnZTogYENvbHVtbnMgZmllbGQgXCIke3NjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnN9XCIgaXMgbm90IGRlZmluZWQgaW4gZmllbGRzYCxcblx0XHRcdFx0XHRoaW50OiAnQWRkIGEgZmllbGQgd2l0aCB0aGF0IG5hbWUsIG9yIHVwZGF0ZSB0aGUgY29sdW1ucyBzZXR0aW5nIHRvIG1hdGNoIGFuIGV4aXN0aW5nIGZpZWxkJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBjYXJkczogcmF3Q2FyZHMsIHdhcm5pbmdzOiB0YWJsZVdhcm5pbmdzIH0gPSBwYXJzZVRhYmxlKHRhYmxlVGV4dCwgc2NoZW1hLmZpZWxkcyk7XG5cdFx0Y29uc3Qgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSA9IFsuLi5jb25maWdXYXJuaW5ncywgLi4udGFibGVXYXJuaW5nc107XG5cdFx0Y29uc3QgY2FyZHMgPSByZWNvbmNpbGVDYXJkcyhzY2hlbWEuZmllbGRzLCByYXdDYXJkcyk7XG5cdFx0Y29uc3QgYm9hcmQ6IEJvYXJkID0geyAuLi5zY2hlbWEsIGNhcmRzIH07XG5cblx0XHRpZiAoc2NoZW1hLnZlcnNpb24gPiBTVVBQT1JURURfVkVSU0lPTikge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IHRydWUsXG5cdFx0XHRcdGJvYXJkLFxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcblx0XHRcdFx0cmVhZG9ubHlSZWFzb246IGBUaGlzIGJvYXJkIHdhcyBjcmVhdGVkIHdpdGggdmVyc2lvbiAke3NjaGVtYS52ZXJzaW9ufSBvZiB0aGUgRmFuY3kgS2FuYmFuIGZvcm1hdC4gVXBkYXRlIHRoZSBwbHVnaW4gdG8gZWRpdCBpdC5gLFxuXHRcdFx0XHR3YXJuaW5ncyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHsgb2s6IHRydWUsIGJvYXJkLCByZWFkb25seTogZmFsc2UsIHdhcm5pbmdzIH07XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdHJldHVybiB7XG5cdFx0XHRvazogZmFsc2UsXG5cdFx0XHRlcnJvcnM6IFt7IGNvZGU6ICdFX1VORVhQRUNURUQnLCBtZXNzYWdlOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycikgfV0sXG5cdFx0XHR3YXJuaW5nczogW10sXG5cdFx0fTtcblx0fVxufVxuIiwgImV4cG9ydCBmdW5jdGlvbiBzcGxpdExpbmtzKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG5cdGlmICghdmFsdWUpIHJldHVybiBbXTtcblx0cmV0dXJuIHZhbHVlLnNwbGl0KCdcXG4nKS5maWx0ZXIocyA9PiBzLmxlbmd0aCA+IDApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gam9pbkxpbmtzKGl0ZW1zOiBzdHJpbmdbXSk6IHN0cmluZyB7XG5cdHJldHVybiBpdGVtcy5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMaW5rVmFsaWRhdGlvblJlc3VsdCB7XG5cdHZhbGlkOiBib29sZWFuO1xuXHRlcnJvcj86IHN0cmluZztcbn1cblxuY29uc3QgVVJJX1BBVFRFUk4gPSAvXlthLXpBLVpdW2EtekEtWjAtOStcXC0uXSo6XFwvXFwvLztcbmNvbnN0IEFMTE9XRURfUFJPVE9DT0xTID0gbmV3IFNldChbJ2h0dHBzOicsICdodHRwOicsICdmdHA6J10pO1xuY29uc3QgTUFJTFRPX1BBVFRFUk4gPSAvXm1haWx0bzpbXkBcXHNdK0BbXkBcXHNdK1xcLlteQFxcc10rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUxpbmtJdGVtKHJhdzogc3RyaW5nKTogTGlua1ZhbGlkYXRpb25SZXN1bHQge1xuXHRjb25zdCB2YWx1ZSA9IHJhdy50cmltKCk7XG5cdGlmICghdmFsdWUpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgZXJyb3I6ICdFbnRlciBhIHBhdGggb3IgVVJJJyB9O1xuXG5cdGlmICh2YWx1ZS5zdGFydHNXaXRoKCdtYWlsdG86JykpIHtcblx0XHRyZXR1cm4gTUFJTFRPX1BBVFRFUk4udGVzdCh2YWx1ZSlcblx0XHRcdD8geyB2YWxpZDogdHJ1ZSB9XG5cdFx0XHQ6IHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogJ0VudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzcyAobWFpbHRvOnVzZXJAZXhhbXBsZS5jb20pJyB9O1xuXHR9XG5cblx0aWYgKFVSSV9QQVRURVJOLnRlc3QodmFsdWUpKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuXHRcdFx0aWYgKCFBTExPV0VEX1BST1RPQ09MUy5oYXModXJsLnByb3RvY29sKSkge1xuXHRcdFx0XHRyZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiAnVVJJIG11c3QgdXNlIGh0dHBzLCBodHRwLCBvciBmdHAnIH07XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXVybC5ob3N0bmFtZSkge1xuXHRcdFx0XHRyZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiAnVVJJIGlzIG1pc3NpbmcgYSBob3N0JyB9O1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0cmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogJ1VSSSBpcyBub3QgdmFsaWQnIH07XG5cdFx0fVxuXHRcdHJldHVybiB7IHZhbGlkOiB0cnVlIH07XG5cdH1cblxuXHRpZiAodmFsdWUuc3RhcnRzV2l0aCgnLycpKSB7XG5cdFx0cmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogJ1BhdGggbXVzdCBiZSByZWxhdGl2ZSB0byB0aGUgdmF1bHQgcm9vdCAocmVtb3ZlIHRoZSBsZWFkaW5nIC8pJyB9O1xuXHR9XG5cdGlmICgvXltBLVphLXpdOlsvXFxcXF0vLnRlc3QodmFsdWUpKSB7XG5cdFx0cmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogJ1BhdGggbXVzdCBiZSByZWxhdGl2ZSB0byB0aGUgdmF1bHQgcm9vdCAocmVtb3ZlIHRoZSBkcml2ZSBsZXR0ZXIpJyB9O1xuXHR9XG5cdGlmICh2YWx1ZS5zdGFydHNXaXRoKCd+JykpIHtcblx0XHRyZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiAnUGF0aCBtdXN0IGJlIHJlbGF0aXZlIHRvIHRoZSB2YXVsdCByb290ICh+IGlzIG5vdCBzdXBwb3J0ZWQpJyB9O1xuXHR9XG5cblx0cmV0dXJuIHsgdmFsaWQ6IHRydWUgfTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgc3BsaXRMaW5rcyB9IGZyb20gJy4uL2RhdGEvbGluayc7XG5cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RpdmVDYXJkVGl0bGUoYm9hcmQ6IEJvYXJkKTogc3RyaW5nIHwgbnVsbCB7XG5cdGlmIChib2FyZC52aWV3Q29uZmlnLmNhcmRUaXRsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Y29uc3QgbmFtZSA9IGJvYXJkLnZpZXdDb25maWcuY2FyZFRpdGxlO1xuXHRcdGlmICghbmFtZSkgcmV0dXJuIG51bGw7XG5cdFx0cmV0dXJuIGJvYXJkLmZpZWxkcy5zb21lKGYgPT4gZi5uYW1lID09PSBuYW1lKSA/IG5hbWUgOiBudWxsO1xuXHR9XG5cdGNvbnN0IGZpcnN0ID0gYm9hcmQuZmllbGRzLmZpbmQoXG5cdFx0ZiA9PiBmLm5hbWUgIT09ICdfaWQnICYmIGYubmFtZSAhPT0gYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zLFxuXHQpO1xuXHRyZXR1cm4gZmlyc3Q/Lm5hbWUgPz8gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdGl2ZUNhcmRGaWVsZHMoYm9hcmQ6IEJvYXJkKTogc3RyaW5nW10ge1xuXHRjb25zdCB0aXRsZUZpZWxkID0gZWZmZWN0aXZlQ2FyZFRpdGxlKGJvYXJkKTtcblx0cmV0dXJuIChib2FyZC52aWV3Q29uZmlnLmNhcmRGaWVsZHMgPz8gW10pLmZpbHRlcihcblx0XHRuYW1lID0+IG5hbWUgIT09IHRpdGxlRmllbGQgJiYgYm9hcmQuZmllbGRzLnNvbWUoZiA9PiBmLm5hbWUgPT09IG5hbWUpLFxuXHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ2FyZChjYXJkOiBDYXJkLCBib2FyZDogQm9hcmQpOiBIVE1MRWxlbWVudCB7XG5cdGNvbnN0IGNvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY2FyZCcpO1xuXHRjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY2FyZC0tZHJhZ2dhYmxlJyk7XG5cdGNvbnRhaW5lci5kYXRhc2V0LmNhcmRJZCA9IGNhcmQuaWQ7XG5cblx0Y29uc3QgdGl0bGVGaWVsZE5hbWUgPSBlZmZlY3RpdmVDYXJkVGl0bGUoYm9hcmQpO1xuXHRpZiAodGl0bGVGaWVsZE5hbWUgIT09IG51bGwpIHtcblx0XHRjb25zdCB0aXRsZSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHRpdGxlLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmRfX3RpdGxlJyk7XG5cdFx0dGl0bGUudGV4dENvbnRlbnQgPSBjYXJkLnZhbHVlc1t0aXRsZUZpZWxkTmFtZV0gPz8gJyc7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblx0fVxuXG5cdGNvbnN0IHNlY29uZGFyeUZpZWxkcyA9IGVmZmVjdGl2ZUNhcmRGaWVsZHMoYm9hcmQpXG5cdFx0Lm1hcChuYW1lID0+IGJvYXJkLmZpZWxkcy5maW5kKGYgPT4gZi5uYW1lID09PSBuYW1lKSlcblx0XHQuZmlsdGVyKChmKTogZiBpcyBOb25OdWxsYWJsZTx0eXBlb2YgZj4gPT4gZiAhPT0gdW5kZWZpbmVkKTtcblxuXHRpZiAoc2Vjb25kYXJ5RmllbGRzLmxlbmd0aCkge1xuXHRcdGNvbnN0IGZpZWxkc0VsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZmllbGRzRWwuY2xhc3NMaXN0LmFkZCgnZmstY2FyZF9fZmllbGRzJyk7XG5cdFx0Y29uc3Qgc2hvd0xhYmVscyA9IGJvYXJkLnZpZXdDb25maWcuY2FyZExhYmVscyAhPT0gZmFsc2U7XG5cblx0XHRmb3IgKGNvbnN0IGZpZWxkIG9mIHNlY29uZGFyeUZpZWxkcykge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSBjYXJkLnZhbHVlc1tmaWVsZC5uYW1lXSA/PyAnJztcblx0XHRcdGlmICghdmFsdWUpIGNvbnRpbnVlO1xuXG5cdFx0XHRjb25zdCByb3cgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdHJvdy5jbGFzc0xpc3QuYWRkKCdmay1jYXJkX19maWVsZCcpO1xuXG5cdFx0XHRpZiAoc2hvd0xhYmVscykge1xuXHRcdFx0XHRjb25zdCBsYWJlbEVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHRsYWJlbEVsLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmRfX2ZpZWxkLWxhYmVsJyk7XG5cdFx0XHRcdGxhYmVsRWwudGV4dENvbnRlbnQgPSBmaWVsZC5sYWJlbDtcblx0XHRcdFx0cm93LmFwcGVuZENoaWxkKGxhYmVsRWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZmllbGQudHlwZSA9PT0gJ0xpbmsnKSB7XG5cdFx0XHRcdGNvbnN0IGxpbmtzRWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdGxpbmtzRWwuY2xhc3NMaXN0LmFkZCgnZmstY2FyZF9fZmllbGQtbGlua3MnKTtcblx0XHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIHNwbGl0TGlua3ModmFsdWUpKSB7XG5cdFx0XHRcdFx0Y29uc3Qgc3BhbiA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0XHRzcGFuLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmRfX2ZpZWxkLWxpbmsnKTtcblx0XHRcdFx0XHRzcGFuLmRhdGFzZXQuaHJlZiA9IGl0ZW07XG5cdFx0XHRcdFx0c3Bhbi50ZXh0Q29udGVudCA9IGl0ZW07XG5cdFx0XHRcdFx0bGlua3NFbC5hcHBlbmRDaGlsZChzcGFuKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cuYXBwZW5kQ2hpbGQobGlua3NFbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCB2YWx1ZUVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHR2YWx1ZUVsLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmRfX2ZpZWxkLXZhbHVlJyk7XG5cdFx0XHRcdHZhbHVlRWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcblx0XHRcdFx0cm93LmFwcGVuZENoaWxkKHZhbHVlRWwpO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWVsZHNFbC5hcHBlbmRDaGlsZChyb3cpO1xuXHRcdH1cblxuXHRcdGlmIChmaWVsZHNFbC5jaGlsZEVsZW1lbnRDb3VudCkgY29udGFpbmVyLmFwcGVuZENoaWxkKGZpZWxkc0VsKTtcblx0fVxuXG5cdHJldHVybiBjb250YWluZXI7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHJlbmRlckNhcmQgfSBmcm9tICcuL2NhcmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29sdW1uKFxuXHRuYW1lOiBzdHJpbmcsXG5cdGxhYmVsOiBzdHJpbmcsXG5cdGNhcmRzOiBDYXJkW10sXG5cdGJvYXJkOiBCb2FyZCxcbik6IEhUTUxFbGVtZW50IHtcblx0Y29uc3QgY29udGFpbmVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW4nKTtcblx0Y29udGFpbmVyLmRhdGFzZXQuY29sdW1uVmFsdWUgPSBuYW1lO1xuXG5cdGNvbnN0IGhlYWRlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRoZWFkZXIuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX19oZWFkZXInKTtcblxuXHRjb25zdCB0aXRsZSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dGl0bGUuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX190aXRsZScpO1xuXHR0aXRsZS50ZXh0Q29udGVudCA9IGxhYmVsO1xuXG5cdGNvbnN0IGNvdW50ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRjb3VudC5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW5fX2NvdW50Jyk7XG5cdGNvdW50LnRleHRDb250ZW50ID0gU3RyaW5nKGNhcmRzLmxlbmd0aCk7XG5cblx0aGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblx0aGVhZGVyLmFwcGVuZENoaWxkKGNvdW50KTtcblxuXHRjb25zdCBjYXJkc0NvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjYXJkc0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW5fX2NhcmRzJyk7XG5cblx0Zm9yIChjb25zdCBjYXJkIG9mIGNhcmRzKSB7XG5cdFx0Y2FyZHNDb250YWluZXIuYXBwZW5kQ2hpbGQocmVuZGVyQ2FyZChjYXJkLCBib2FyZCkpO1xuXHR9XG5cblx0Y29uc3QgYWRkQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdGFkZEJ0bi5jbGFzc0xpc3QuYWRkKCdmay1jb2xfX2FkZC1idG4nKTtcblx0YWRkQnRuLnRleHRDb250ZW50ID0gJysgQWRkIGNhcmQnO1xuXG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZChoZWFkZXIpO1xuXHRjb250YWluZXIuYXBwZW5kQ2hpbGQoY2FyZHNDb250YWluZXIpO1xuXHRjb250YWluZXIuYXBwZW5kQ2hpbGQoYWRkQnRuKTtcblxuXHRyZXR1cm4gY29udGFpbmVyO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQm9hcmQgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyByZW5kZXJDb2x1bW4gfSBmcm9tICcuL2NvbHVtbic7XG5cbmZ1bmN0aW9uIGNhcGl0YWxpc2Uoczogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHMubGVuZ3RoID09PSAwID8gcyA6IHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJCb2FyZChib2FyZDogQm9hcmQpOiBIVE1MRWxlbWVudCB7XG5cdGNvbnN0IHdyYXBwZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0d3JhcHBlci5jbGFzc0xpc3QuYWRkKCdmay1ib2FyZCcpO1xuXG5cdGNvbnN0IGhlYWRlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRoZWFkZXIuY2xhc3NMaXN0LmFkZCgnZmstYm9hcmRfX2hlYWRlcicpO1xuXG5cdGNvbnN0IHNldHRpbmdzQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdHNldHRpbmdzQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLWJvYXJkX19zZXR0aW5ncycpO1xuXHRzZXR0aW5nc0J0bi50ZXh0Q29udGVudCA9ICdcdTI2OTknO1xuXHRzZXR0aW5nc0J0bi50aXRsZSA9ICdCb2FyZCBzZXR0aW5ncyc7XG5cdGhlYWRlci5hcHBlbmRDaGlsZChzZXR0aW5nc0J0bik7XG5cblx0Y29uc3QgdGl0bGVFbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dGl0bGVFbC5jbGFzc0xpc3QuYWRkKCdmay1ib2FyZF9fdGl0bGUnKTtcblx0dGl0bGVFbC50ZXh0Q29udGVudCA9IGJvYXJkLnRpdGxlO1xuXHRoZWFkZXIuYXBwZW5kQ2hpbGQodGl0bGVFbCk7XG5cblx0d3JhcHBlci5hcHBlbmRDaGlsZChoZWFkZXIpO1xuXG5cdGNvbnN0IGNvbHVtbnNDb250YWluZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0Y29sdW1uc0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdmay1ib2FyZF9fY29sdW1ucycpO1xuXG5cdGNvbnN0IGNvbHVtbkZpZWxkID0gYm9hcmQuZmllbGRzLmZpbmQoZiA9PiBmLm5hbWUgPT09IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucyk7XG5cblx0aWYgKGNvbHVtbkZpZWxkPy5vcHRpb25zKSB7XG5cdFx0Zm9yIChjb25zdCBvcHRpb24gb2YgY29sdW1uRmllbGQub3B0aW9ucykge1xuXHRcdFx0Y29uc3QgY2FyZHMgPSBib2FyZC5jYXJkcy5maWx0ZXIoYyA9PiBjLnZhbHVlc1tjb2x1bW5GaWVsZC5uYW1lXSA9PT0gb3B0aW9uKTtcblx0XHRcdGNvbHVtbnNDb250YWluZXIuYXBwZW5kQ2hpbGQocmVuZGVyQ29sdW1uKG9wdGlvbiwgY2FwaXRhbGlzZShvcHRpb24pLCBjYXJkcywgYm9hcmQpKTtcblx0XHR9XG5cdH1cblxuXHR3cmFwcGVyLmFwcGVuZENoaWxkKGNvbHVtbnNDb250YWluZXIpO1xuXHRyZXR1cm4gd3JhcHBlcjtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlQ2VsbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHZhbHVlXG5cdFx0LnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcblx0XHQucmVwbGFjZSgvXFx8L2csICdcXFxcfCcpXG5cdFx0LnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVJZCgpOiBzdHJpbmcge1xuXHRjb25zdCBjaGFycyA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuXHRsZXQgaWQgPSAnJztcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHtcblx0XHRpZCArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXTtcblx0fVxuXHRyZXR1cm4gaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVCb2FyZChib2FyZDogQm9hcmQpOiBzdHJpbmcge1xuXHRjb25zdCBjb25maWcgPSBzZXJpYWxpemVDb25maWcoYm9hcmQpO1xuXHRjb25zdCB0YWJsZSA9IHNlcmlhbGl6ZVRhYmxlKGJvYXJkKTtcblx0cmV0dXJuIGAtLS1cXG4ke2NvbmZpZ31cXG4tLS1cXG5cXG4ke3RhYmxlfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVCb2FyZEJsb2NrKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdHJldHVybiBgXFxgXFxgXFxgZmFuY3kta2FuYmFuXFxuJHtzZXJpYWxpemVCb2FyZChib2FyZCl9XFxuXFxgXFxgXFxgXFxuYDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplQ29uZmlnKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXHRsaW5lcy5wdXNoKGB2ZXJzaW9uOiAyYCk7XG5cdGxpbmVzLnB1c2goYHRpdGxlOiAke2JvYXJkLnRpdGxlfWApO1xuXHRsaW5lcy5wdXNoKCdmaWVsZHM6Jyk7XG5cdGZvciAoY29uc3QgZmllbGQgb2YgYm9hcmQuZmllbGRzKSB7XG5cdFx0bGV0IGxpbmUgPSBgICAtIG5hbWU6ICR7ZmllbGQubmFtZX0sIHR5cGU6ICR7ZmllbGQudHlwZX0sIGxhYmVsOiAke2ZpZWxkLmxhYmVsfWA7XG5cdFx0aWYgKGZpZWxkLm9wdGlvbnMgIT09IHVuZGVmaW5lZCkgbGluZSArPSBgLCBvcHRpb25zOiAke2ZpZWxkLm9wdGlvbnMuam9pbignfCcpfWA7XG5cdFx0aWYgKGZpZWxkLmRlZmF1bHQgIT09IHVuZGVmaW5lZCkgbGluZSArPSBgLCBkZWZhdWx0OiAke2ZpZWxkLmRlZmF1bHR9YDtcblx0XHRsaW5lcy5wdXNoKGxpbmUpO1xuXHR9XG5cdGlmIChib2FyZC52aWV3Q29uZmlnLmxhbmVzKSBsaW5lcy5wdXNoKGBsYW5lczogJHtib2FyZC52aWV3Q29uZmlnLmxhbmVzfWApO1xuXHRpZiAoYm9hcmQudmlld0NvbmZpZy5jYXJkVGl0bGUgIT09IHVuZGVmaW5lZCkgbGluZXMucHVzaChgY2FyZF90aXRsZTogJHtib2FyZC52aWV3Q29uZmlnLmNhcmRUaXRsZX1gKTtcblx0aWYgKGJvYXJkLnZpZXdDb25maWcuY2FyZEZpZWxkcz8ubGVuZ3RoKSBsaW5lcy5wdXNoKGBjYXJkX2ZpZWxkczogJHtib2FyZC52aWV3Q29uZmlnLmNhcmRGaWVsZHMuam9pbignLCAnKX1gKTtcblx0aWYgKGJvYXJkLnZpZXdDb25maWcuY2FyZExhYmVscyA9PT0gZmFsc2UpIGxpbmVzLnB1c2goYGNhcmRfbGFiZWxzOiBmYWxzZWApO1xuXHRpZiAoYm9hcmQucmF3V29ya2Zsb3cpIGxpbmVzLnB1c2goYHdvcmtmbG93OiAke2JvYXJkLnJhd1dvcmtmbG93fWApO1xuXHRyZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVRhYmxlKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdGNvbnN0IHNjaGVtYUZpZWxkTmFtZXMgPSBuZXcgU2V0KGJvYXJkLmZpZWxkcy5tYXAoZiA9PiBmLm5hbWUpKTtcblxuXHQvLyBDb2xsZWN0IG9ycGhhbmVkIGtleXMgZnJvbSBhbGwgY2FyZHMgKGtleXMgbm90IGluIHRoZSBjdXJyZW50IHNjaGVtYSlcblx0Y29uc3Qgb3JwaGFuZWRLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdGZvciAoY29uc3QgY2FyZCBvZiBib2FyZC5jYXJkcykge1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNhcmQudmFsdWVzKSkge1xuXHRcdFx0aWYgKCFzY2hlbWFGaWVsZE5hbWVzLmhhcyhrZXkpKSBvcnBoYW5lZEtleXMuYWRkKGtleSk7XG5cdFx0fVxuXHR9XG5cblx0Y29uc3Qgc2NoZW1hTGFiZWxzID0gYm9hcmQuZmllbGRzLm1hcChmID0+IGYubGFiZWwpO1xuXHRjb25zdCBhbGxMYWJlbHMgPSBbJ19pZCcsIC4uLnNjaGVtYUxhYmVscywgLi4ub3JwaGFuZWRLZXlzXTtcblxuXHRjb25zdCBoZWFkZXIgICAgPSBgfCAke2FsbExhYmVscy5qb2luKCcgfCAnKX0gfGA7XG5cdGNvbnN0IHNlcGFyYXRvciA9IGB8ICR7YWxsTGFiZWxzLm1hcCgoKSA9PiAnLS0tJykuam9pbignIHwgJyl9IHxgO1xuXG5cdGNvbnN0IHNlZW5JZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3Qgcm93cyA9IGJvYXJkLmNhcmRzLm1hcChjYXJkID0+IHNlcmlhbGl6ZVJvdyhjYXJkLCBib2FyZCwgb3JwaGFuZWRLZXlzLCBzZWVuSWRzKSk7XG5cblx0cmV0dXJuIFtoZWFkZXIsIHNlcGFyYXRvciwgLi4ucm93c10uam9pbignXFxuJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVJvdyhjYXJkOiBDYXJkLCBib2FyZDogQm9hcmQsIG9ycGhhbmVkS2V5czogU2V0PHN0cmluZz4sIHNlZW5JZHM6IFNldDxzdHJpbmc+KTogc3RyaW5nIHtcblx0bGV0IGlkID0gY2FyZC5pZCB8fCBnZW5lcmF0ZUlkKCk7XG5cdGlmIChzZWVuSWRzLmhhcyhpZCkpIGlkID0gZ2VuZXJhdGVJZCgpO1xuXHRzZWVuSWRzLmFkZChpZCk7XG5cdGNvbnN0IHNjaGVtYUNlbGxzID0gYm9hcmQuZmllbGRzLm1hcChmID0+IGVzY2FwZUNlbGwoY2FyZC52YWx1ZXNbZi5uYW1lXSA/PyAnJykpO1xuXHRjb25zdCBvcnBoYW5DZWxscyA9IFsuLi5vcnBoYW5lZEtleXNdLm1hcChrZXkgPT4gZXNjYXBlQ2VsbChjYXJkLnZhbHVlc1trZXldID8/ICcnKSk7XG5cdGNvbnN0IGNlbGxzID0gW2lkLCAuLi5zY2hlbWFDZWxscywgLi4ub3JwaGFuQ2VsbHNdO1xuXHRyZXR1cm4gYHwgJHtjZWxscy5qb2luKCcgfCAnKX0gfGA7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCB9IGZyb20gJy4vYm9hcmQnO1xuaW1wb3J0IHsgZ2VuZXJhdGVJZCB9IGZyb20gJy4uL2RhdGEvc2VyaWFsaXplcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRDYXJkKGJvYXJkOiBCb2FyZCwgY29sdW1uVmFsdWU6IHN0cmluZyk6IEJvYXJkIHtcblx0Y29uc3QgY29sdW1uRmllbGQgPSBib2FyZC52aWV3Q29uZmlnLmNvbHVtbnM7XG5cdGNvbnN0IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGJvYXJkLmZpZWxkcykge1xuXHRcdHZhbHVlc1tmaWVsZC5uYW1lXSA9IGZpZWxkLm5hbWUgPT09IGNvbHVtbkZpZWxkID8gY29sdW1uVmFsdWUgOiAoZmllbGQuZGVmYXVsdCA/PyAnJyk7XG5cdH1cblx0Y29uc3QgbmV3Q2FyZDogQ2FyZCA9IHsgaWQ6IGdlbmVyYXRlSWQoKSwgdmFsdWVzIH07XG5cdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogWy4uLmJvYXJkLmNhcmRzLCBuZXdDYXJkXSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlQ2FyZChib2FyZDogQm9hcmQsIGNhcmRJZDogc3RyaW5nKTogQm9hcmQge1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IGJvYXJkLmNhcmRzLmZpbHRlcihjYXJkID0+IGNhcmQuaWQgIT09IGNhcmRJZCkgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlb3JkZXJDYXJkKFxuXHRib2FyZDogQm9hcmQsXG5cdGNhcmRJZDogc3RyaW5nLFxuXHR0b0NvbHVtblZhbHVlOiBzdHJpbmcsXG5cdGluc2VydEJlZm9yZUlkOiBzdHJpbmcgfCBudWxsLFxuKTogQm9hcmQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucztcblx0Y29uc3QgZHJhZ2dlZCA9IGJvYXJkLmNhcmRzLmZpbmQoYyA9PiBjLmlkID09PSBjYXJkSWQpO1xuXHRpZiAoIWRyYWdnZWQpIHJldHVybiBib2FyZDtcblxuXHRjb25zdCB1cGRhdGVkQ2FyZCA9IHsgLi4uZHJhZ2dlZCwgdmFsdWVzOiB7IC4uLmRyYWdnZWQudmFsdWVzLCBbY29sdW1uRmllbGRdOiB0b0NvbHVtblZhbHVlIH0gfTtcblx0Y29uc3QgcmVtYWluaW5nID0gYm9hcmQuY2FyZHMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2FyZElkKTtcblxuXHRpZiAoaW5zZXJ0QmVmb3JlSWQgPT09IG51bGwpIHtcblx0XHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5yZW1haW5pbmcsIHVwZGF0ZWRDYXJkXSB9O1xuXHR9XG5cblx0Y29uc3QgdGFyZ2V0SWR4ID0gcmVtYWluaW5nLmZpbmRJbmRleChjID0+IGMuaWQgPT09IGluc2VydEJlZm9yZUlkKTtcblx0aWYgKHRhcmdldElkeCA9PT0gLTEpIHtcblx0XHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5yZW1haW5pbmcsIHVwZGF0ZWRDYXJkXSB9O1xuXHR9XG5cblx0Y29uc3QgbmV3Q2FyZHMgPSBbLi4ucmVtYWluaW5nXTtcblx0bmV3Q2FyZHMuc3BsaWNlKHRhcmdldElkeCwgMCwgdXBkYXRlZENhcmQpO1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IG5ld0NhcmRzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDYXJkKGJvYXJkOiBCb2FyZCwgY29sdW1uVmFsdWU6IHN0cmluZywgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogQm9hcmQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucztcblx0Y29uc3QgY2FyZFZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGJvYXJkLmZpZWxkcykge1xuXHRcdGlmIChmaWVsZC5uYW1lID09PSBjb2x1bW5GaWVsZCkge1xuXHRcdFx0Y2FyZFZhbHVlc1tmaWVsZC5uYW1lXSA9IGNvbHVtblZhbHVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYXJkVmFsdWVzW2ZpZWxkLm5hbWVdID0gdmFsdWVzW2ZpZWxkLm5hbWVdID8/IGZpZWxkLmRlZmF1bHQgPz8gJyc7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IG5ld0NhcmQ6IENhcmQgPSB7IGlkOiBnZW5lcmF0ZUlkKCksIHZhbHVlczogY2FyZFZhbHVlcyB9O1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5ib2FyZC5jYXJkcywgbmV3Q2FyZF0gfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUNhcmQoYm9hcmQ6IEJvYXJkLCBjYXJkSWQ6IHN0cmluZywgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogQm9hcmQge1xuXHRyZXR1cm4ge1xuXHRcdC4uLmJvYXJkLFxuXHRcdGNhcmRzOiBib2FyZC5jYXJkcy5tYXAoY2FyZCA9PlxuXHRcdFx0Y2FyZC5pZCA9PT0gY2FyZElkXG5cdFx0XHRcdD8geyAuLi5jYXJkLCB2YWx1ZXM6IHsgLi4uY2FyZC52YWx1ZXMsIC4uLnZhbHVlcyB9IH1cblx0XHRcdFx0OiBjYXJkLFxuXHRcdCksXG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVDYXJkRmllbGQoYm9hcmQ6IEJvYXJkLCBjYXJkSWQ6IHN0cmluZywgZmllbGROYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBCb2FyZCB7XG5cdHJldHVybiB7XG5cdFx0Li4uYm9hcmQsXG5cdFx0Y2FyZHM6IGJvYXJkLmNhcmRzLm1hcChjYXJkID0+XG5cdFx0XHRjYXJkLmlkID09PSBjYXJkSWRcblx0XHRcdFx0PyB7IC4uLmNhcmQsIHZhbHVlczogeyAuLi5jYXJkLnZhbHVlcywgW2ZpZWxkTmFtZV06IHZhbHVlIH0gfVxuXHRcdFx0XHQ6IGNhcmQsXG5cdFx0KSxcblx0fTtcbn1cbiIsICJleHBvcnQgdHlwZSBXb3JrZmxvd01hcCA9IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PjtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlV29ya2Zsb3cod29ya2Zsb3dTdHJpbmc6IHN0cmluZyB8IHVuZGVmaW5lZCwgc3RhdHVzT3B0aW9uczogc3RyaW5nW10pOiBXb3JrZmxvd01hcCB7XG5cdGNvbnN0IG1hcDogV29ya2Zsb3dNYXAgPSBuZXcgTWFwKCk7XG5cblx0aWYgKCF3b3JrZmxvd1N0cmluZyB8fCAhd29ya2Zsb3dTdHJpbmcudHJpbSgpKSB7XG5cdFx0Zm9yIChjb25zdCBmcm9tIG9mIHN0YXR1c09wdGlvbnMpIHtcblx0XHRcdG1hcC5zZXQoZnJvbSwgbmV3IFNldChzdGF0dXNPcHRpb25zLmZpbHRlcihzID0+IHMgIT09IGZyb20pKSk7XG5cdFx0fVxuXHRcdHJldHVybiBtYXA7XG5cdH1cblxuXHRmb3IgKGNvbnN0IHBhaXIgb2Ygd29ya2Zsb3dTdHJpbmcuc3BsaXQoJywnKSkge1xuXHRcdGNvbnN0IFtmcm9tLCB0b10gPSBwYWlyLnNwbGl0KC8tPnxcdTIxOTIvKS5tYXAocyA9PiBzLnRyaW0oKSk7XG5cdFx0aWYgKCFmcm9tIHx8ICF0bykgY29udGludWU7XG5cdFx0aWYgKCFtYXAuaGFzKGZyb20pKSBtYXAuc2V0KGZyb20sIG5ldyBTZXQoKSk7XG5cdFx0bWFwLmdldChmcm9tKSEuYWRkKHRvKTtcblx0fVxuXG5cdHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RyYW5zaXRpb25BbGxvd2VkKG1hcDogV29ya2Zsb3dNYXAsIGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBmYWxzZTtcblx0cmV0dXJuIG1hcC5nZXQoZnJvbSk/Lmhhcyh0bykgPz8gZmFsc2U7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgRnV6enlTdWdnZXN0TW9kYWwsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCwgRmllbGREZWZpbml0aW9uIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgc3BsaXRMaW5rcywgam9pbkxpbmtzLCB2YWxpZGF0ZUxpbmtJdGVtIH0gZnJvbSAnLi4vZGF0YS9saW5rJztcblxuY2xhc3MgTGlua0ZpbGVQaWNrZXIgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxURmlsZT4ge1xuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSBvblNlbGVjdDogKHBhdGg6IHN0cmluZykgPT4gdm9pZCkge1xuXHRcdHN1cGVyKGFwcCk7XG5cdH1cblx0Z2V0SXRlbXMoKTogVEZpbGVbXSB7XG5cdFx0cmV0dXJuICh0aGlzLmFwcCBhcyBBcHApLnZhdWx0LmdldEZpbGVzKCk7XG5cdH1cblx0Z2V0SXRlbVRleHQoZmlsZTogVEZpbGUpOiBzdHJpbmcge1xuXHRcdHJldHVybiBmaWxlLnBhdGg7XG5cdH1cblx0b25DaG9vc2VJdGVtKGZpbGU6IFRGaWxlKTogdm9pZCB7XG5cdFx0dGhpcy5vblNlbGVjdChmaWxlLnBhdGgpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBDYXJkTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG5cdHByaXZhdGUgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cblx0Y29uc3RydWN0b3IoXG5cdFx0YXBwOiBBcHAsXG5cdFx0cHJpdmF0ZSBib2FyZDogQm9hcmQsXG5cdFx0cHJpdmF0ZSBjYXJkOiBDYXJkIHwgbnVsbCxcblx0XHRwcml2YXRlIGNvbHVtblZhbHVlOiBzdHJpbmcsXG5cdFx0cHJpdmF0ZSBvbkNvbmZpcm06ICh2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pID0+IHZvaWQsXG5cdFx0cHJpdmF0ZSBvbkRlbGV0ZT86ICgpID0+IHZvaWQsXG5cdFx0cHJpdmF0ZSBzb3VyY2VQYXRoOiBzdHJpbmcgPSAnJyxcblx0KSB7XG5cdFx0c3VwZXIoYXBwKTtcblx0fVxuXG5cdG9uT3BlbigpOiB2b2lkIHtcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcblx0XHR0aGlzLnRpdGxlRWwudGV4dENvbnRlbnQgPSB0aGlzLmNhcmQgPyAnRWRpdCBjYXJkJyA6ICdBZGQgY2FyZCc7XG5cblx0XHRjb25zdCBjb2x1bW5GaWVsZCA9IHRoaXMuYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zO1xuXHRcdGNvbnN0IGVkaXRhYmxlRmllbGRzID0gdGhpcy5ib2FyZC5maWVsZHMuZmlsdGVyKGYgPT4gZi5uYW1lICE9PSAnX2lkJyk7XG5cblx0XHRmb3IgKGNvbnN0IGZpZWxkIG9mIGVkaXRhYmxlRmllbGRzKSB7XG5cdFx0XHR0aGlzLnJlbmRlckZpZWxkKGNvbnRlbnRFbCwgZmllbGQsIGZpZWxkLm5hbWUgPT09IGNvbHVtbkZpZWxkICYmICF0aGlzLmNhcmQgPyB0aGlzLmNvbHVtblZhbHVlIDogdW5kZWZpbmVkKTtcblx0XHR9XG5cblx0XHRjb25zdCBmb290ZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRmb290ZXIuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZm9vdGVyJyk7XG5cblx0XHRpZiAodGhpcy5vbkRlbGV0ZSkge1xuXHRcdFx0Y29uc3QgZGVsZXRlQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0XHRkZWxldGVCdG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZGVsZXRlJyk7XG5cdFx0XHRkZWxldGVCdG4udGV4dENvbnRlbnQgPSAnRGVsZXRlJztcblx0XHRcdGRlbGV0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFx0dGhpcy5vbkRlbGV0ZSEoKTtcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0fSk7XG5cdFx0XHRmb290ZXIuYXBwZW5kQ2hpbGQoZGVsZXRlQnRuKTtcblx0XHR9XG5cblx0XHRjb25zdCBzYXZlQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0c2F2ZUJ0bi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1zYXZlJyk7XG5cdFx0c2F2ZUJ0bi50ZXh0Q29udGVudCA9ICdTYXZlJztcblx0XHRzYXZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWVzID0geyAuLi50aGlzLnZhbHVlcyB9O1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0dGhpcy5jb250YWluZXJFbD8ucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLm9uQ29uZmlybSh2YWx1ZXMpO1xuXHRcdH0pO1xuXHRcdGZvb3Rlci5hcHBlbmRDaGlsZChzYXZlQnRuKTtcblx0XHRjb250ZW50RWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcblxuXHRcdGNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignaW5wdXQsIHRleHRhcmVhLCBzZWxlY3QnKT8uZm9jdXMoKTtcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyRmllbGQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgZmllbGQ6IEZpZWxkRGVmaW5pdGlvbiwgaW5pdGlhbE92ZXJyaWRlPzogc3RyaW5nKTogdm9pZCB7XG5cdFx0Y29uc3QgaW5pdGlhbFZhbHVlID0gaW5pdGlhbE92ZXJyaWRlXG5cdFx0XHQ/PyAodGhpcy5jYXJkID8gKHRoaXMuY2FyZC52YWx1ZXNbZmllbGQubmFtZV0gPz8gJycpIDogKGZpZWxkLmRlZmF1bHQgPz8gJycpKTtcblx0XHR0aGlzLnZhbHVlc1tmaWVsZC5uYW1lXSA9IGluaXRpYWxWYWx1ZTtcblxuXHRcdGNvbnN0IHdyYXBwZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR3cmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZpZWxkJyk7XG5cblx0XHRjb25zdCBsYWJlbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG5cdFx0bGFiZWwudGV4dENvbnRlbnQgPSBmaWVsZC5sYWJlbDtcblx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKGxhYmVsKTtcblxuXHRcdGNvbnN0IG9uQ2hhbmdlID0gKHZhbHVlOiBzdHJpbmcpID0+IHsgdGhpcy52YWx1ZXNbZmllbGQubmFtZV0gPSB2YWx1ZTsgfTtcblxuXHRcdGlmIChmaWVsZC50eXBlID09PSAnTGluaycpIHtcblx0XHRcdHRoaXMucmVuZGVyTGlua0ZpZWxkKHdyYXBwZXIsIGZpZWxkLCBpbml0aWFsVmFsdWUsIG9uQ2hhbmdlKTtcblx0XHR9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT09ICdTZWxlY3QnICYmIGZpZWxkLm9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IHNlbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuXHRcdFx0c2VsLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0XHRmb3IgKGNvbnN0IG9wdCBvZiBmaWVsZC5vcHRpb25zKSB7XG5cdFx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdFx0by52YWx1ZSA9IG9wdDtcblx0XHRcdFx0by50ZXh0Q29udGVudCA9IG9wdDtcblx0XHRcdFx0aWYgKG9wdCA9PT0gaW5pdGlhbFZhbHVlKSBvLnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdFx0c2VsLmFwcGVuZENoaWxkKG8pO1xuXHRcdFx0fVxuXHRcdFx0c2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IG9uQ2hhbmdlKHNlbC52YWx1ZSkpO1xuXHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChzZWwpO1xuXHRcdH0gZWxzZSBpZiAoZmllbGQudHlwZSA9PT0gJ1RleHRhcmVhJykge1xuXHRcdFx0Y29uc3QgdGEgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuXHRcdFx0dGEuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRcdHRhLnZhbHVlID0gaW5pdGlhbFZhbHVlO1xuXHRcdFx0dGEucm93cyA9IDQ7XG5cdFx0XHR0YS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IG9uQ2hhbmdlKHRhLnZhbHVlKSk7XG5cdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKHRhKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRcdGlucC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dCcpO1xuXHRcdFx0aW5wLnR5cGUgPSBmaWVsZC50eXBlID09PSAnRGF0ZScgPyAnZGF0ZSdcblx0XHRcdFx0OiBmaWVsZC50eXBlID09PSAnTnVtYmVyJyA/ICdudW1iZXInXG5cdFx0XHRcdDogJ3RleHQnO1xuXHRcdFx0aW5wLnZhbHVlID0gaW5pdGlhbFZhbHVlO1xuXHRcdFx0aW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4gb25DaGFuZ2UoaW5wLnZhbHVlKSk7XG5cdFx0XHRpbnAuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG5cdFx0XHRcdGlmIChlLmtleSA9PT0gJ0VudGVyJykge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlcyA9IHsgLi4udGhpcy52YWx1ZXMgfTtcblx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJFbD8ucmVtb3ZlKCk7XG5cdFx0XHRcdFx0dGhpcy5vbkNvbmZpcm0odmFsdWVzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKGlucCk7XG5cdFx0fVxuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHdyYXBwZXIpO1xuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJMaW5rRmllbGQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgX2ZpZWxkOiBGaWVsZERlZmluaXRpb24sIGluaXRpYWxWYWx1ZTogc3RyaW5nLCBvbkNoYW5nZTogKHY6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuXHRcdGNvbnN0IGl0ZW1zID0gc3BsaXRMaW5rcyhpbml0aWFsVmFsdWUpO1xuXG5cdFx0Y29uc3QgZmllbGQgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRmaWVsZC5jbGFzc0xpc3QuYWRkKCdmay1saW5rLWZpZWxkJyk7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGZpZWxkKTtcblxuXHRcdGNvbnN0IGl0ZW1MaXN0ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZmllbGQuYXBwZW5kQ2hpbGQoaXRlbUxpc3QpO1xuXG5cdFx0Y29uc3Qgb3BlbkxpbmsgPSAoaXRlbTogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHRpZiAoL15bYS16QS1aXVthLXpBLVowLTkrXFwtLl0qOi8udGVzdChpdGVtKSkge1xuXHRcdFx0XHR3aW5kb3cub3BlbihpdGVtLCAnX2JsYW5rJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2b2lkICh0aGlzLmFwcCBhcyBBcHApLndvcmtzcGFjZS5vcGVuTGlua1RleHQoaXRlbSwgdGhpcy5zb3VyY2VQYXRoLCAndGFiJyk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IHJlbmRlckl0ZW1zID0gKCkgPT4ge1xuXHRcdFx0d2hpbGUgKGl0ZW1MaXN0LmZpcnN0Q2hpbGQpIGl0ZW1MaXN0LnJlbW92ZUNoaWxkKGl0ZW1MaXN0LmZpcnN0Q2hpbGQpO1xuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG5cdFx0XHRcdGNvbnN0IHJvdyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0XHRyb3cuY2xhc3NMaXN0LmFkZCgnZmstbGluay1pdGVtJyk7XG5cblx0XHRcdFx0Y29uc3QgcmVtb3ZlID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHRyZW1vdmUuY2xhc3NMaXN0LmFkZCgnZmstbGluay1pdGVtX19yZW1vdmUnKTtcblx0XHRcdFx0cmVtb3ZlLnNldEF0dHJpYnV0ZSgncm9sZScsICdidXR0b24nKTtcblx0XHRcdFx0cmVtb3ZlLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXHRcdFx0XHRyZW1vdmUuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1JlbW92ZScpO1xuXHRcdFx0XHRyZW1vdmUudGV4dENvbnRlbnQgPSAnXHUwMEQ3Jztcblx0XHRcdFx0Y29uc3QgZG9SZW1vdmUgPSAoZTogRXZlbnQpID0+IHtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9IGl0ZW1zLmluZGV4T2YoaXRlbSk7XG5cdFx0XHRcdFx0aWYgKGlkeCA+IC0xKSBpdGVtcy5zcGxpY2UoaWR4LCAxKTtcblx0XHRcdFx0XHRvbkNoYW5nZShqb2luTGlua3MoaXRlbXMpKTtcblx0XHRcdFx0XHRyZW5kZXJJdGVtcygpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZW1vdmUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBkb1JlbW92ZSk7XG5cdFx0XHRcdHJlbW92ZS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZS5rZXkgPT09ICdFbnRlcicgfHwgZS5rZXkgPT09ICcgJykgZG9SZW1vdmUoZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGNvbnN0IHZhbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0dmFsLmNsYXNzTGlzdC5hZGQoJ2ZrLWxpbmstaXRlbV9fdmFsdWUnKTtcblx0XHRcdFx0dmFsLnNldEF0dHJpYnV0ZSgncm9sZScsICdidXR0b24nKTtcblx0XHRcdFx0dmFsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXHRcdFx0XHR2YWwudGV4dENvbnRlbnQgPSBpdGVtO1xuXHRcdFx0XHR2YWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBvcGVuTGluayhpdGVtKSk7XG5cdFx0XHRcdHZhbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZS5rZXkgPT09ICdFbnRlcicgfHwgZS5rZXkgPT09ICcgJykgb3BlbkxpbmsoaXRlbSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJvdy5hcHBlbmRDaGlsZChyZW1vdmUpO1xuXHRcdFx0XHRyb3cuYXBwZW5kQ2hpbGQodmFsKTtcblx0XHRcdFx0aXRlbUxpc3QuYXBwZW5kQ2hpbGQocm93KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cmVuZGVySXRlbXMoKTtcblxuXHRcdGNvbnN0IGNvbnRyb2xzID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29udHJvbHMuY2xhc3NMaXN0LmFkZCgnZmstbGluay1jb250cm9scycpO1xuXG5cdFx0Y29uc3QgYWRkRmlsZUJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdGFkZEZpbGVCdG4uY2xhc3NMaXN0LmFkZCgnZmstbGluay1hZGQtLWZpbGUnKTtcblx0XHRhZGRGaWxlQnRuLnRleHRDb250ZW50ID0gJysgQWRkIGZpbGUnO1xuXHRcdGFkZEZpbGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRuZXcgTGlua0ZpbGVQaWNrZXIodGhpcy5hcHAgYXMgQXBwLCAocGF0aCkgPT4ge1xuXHRcdFx0XHRpdGVtcy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRvbkNoYW5nZShqb2luTGlua3MoaXRlbXMpKTtcblx0XHRcdFx0cmVuZGVySXRlbXMoKTtcblx0XHRcdH0pLm9wZW4oKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHVybElucHV0QXJlYSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHVybElucHV0QXJlYS5jbGFzc0xpc3QuYWRkKCdmay1saW5rLXVybC1pbnB1dCcpO1xuXHRcdHVybElucHV0QXJlYS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG5cdFx0Y29uc3QgdXJsSW5wdXQgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuXHRcdHVybElucHV0LnR5cGUgPSAndGV4dCc7XG5cdFx0dXJsSW5wdXQucGxhY2Vob2xkZXIgPSAnaHR0cHM6Ly9cdTIwMjYnO1xuXG5cdFx0Y29uc3QgdXJsRXJyb3IgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0dXJsRXJyb3IuY2xhc3NMaXN0LmFkZCgnZmstbGluay1lcnJvcicpO1xuXG5cdFx0Y29uc3QgdXJsQ29uZmlybSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdHVybENvbmZpcm0uY2xhc3NMaXN0LmFkZCgnZmstbGluay11cmwtY29uZmlybScpO1xuXHRcdHVybENvbmZpcm0udGV4dENvbnRlbnQgPSAnQWRkJztcblx0XHR1cmxDb25maXJtLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB1cmxJbnB1dC52YWx1ZS50cmltKCk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUxpbmtJdGVtKHZhbHVlKTtcblx0XHRcdGlmICghcmVzdWx0LnZhbGlkKSB7XG5cdFx0XHRcdHVybEVycm9yLnRleHRDb250ZW50ID0gcmVzdWx0LmVycm9yID8/ICcnO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR1cmxFcnJvci50ZXh0Q29udGVudCA9ICcnO1xuXHRcdFx0aXRlbXMucHVzaCh2YWx1ZSk7XG5cdFx0XHRvbkNoYW5nZShqb2luTGlua3MoaXRlbXMpKTtcblx0XHRcdHVybElucHV0LnZhbHVlID0gJyc7XG5cdFx0XHR1cmxJbnB1dEFyZWEuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRcdHJlbmRlckl0ZW1zKCk7XG5cdFx0fSk7XG5cblx0XHR1cmxJbnB1dEFyZWEuYXBwZW5kQ2hpbGQodXJsSW5wdXQpO1xuXHRcdHVybElucHV0QXJlYS5hcHBlbmRDaGlsZCh1cmxFcnJvcik7XG5cdFx0dXJsSW5wdXRBcmVhLmFwcGVuZENoaWxkKHVybENvbmZpcm0pO1xuXG5cdFx0Y29uc3QgYWRkVXJsQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0YWRkVXJsQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLWxpbmstYWRkLS11cmwnKTtcblx0XHRhZGRVcmxCdG4udGV4dENvbnRlbnQgPSAnKyBBZGQgVVJMJztcblx0XHRhZGRVcmxCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBoaWRkZW4gPSB1cmxJbnB1dEFyZWEuc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnO1xuXHRcdFx0dXJsSW5wdXRBcmVhLnN0eWxlLmRpc3BsYXkgPSBoaWRkZW4gPyAnJyA6ICdub25lJztcblx0XHRcdGlmIChoaWRkZW4pIHVybElucHV0LmZvY3VzKCk7XG5cdFx0fSk7XG5cblx0XHRjb250cm9scy5hcHBlbmRDaGlsZChhZGRGaWxlQnRuKTtcblx0XHRjb250cm9scy5hcHBlbmRDaGlsZChhZGRVcmxCdG4pO1xuXHRcdGNvbnRyb2xzLmFwcGVuZENoaWxkKHVybElucHV0QXJlYSk7XG5cdFx0ZmllbGQuYXBwZW5kQ2hpbGQoY29udHJvbHMpO1xuXHR9XG5cblx0b25DbG9zZSgpOiB2b2lkIHtcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuXHR9XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgQm9hcmRTY2hlbWEsIEZpZWxkRGVmaW5pdGlvbiwgRmllbGRUeXBlIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5mdW5jdGlvbiBkZXJpdmVGaWVsZE5hbWUobGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBsYWJlbC50b0xvd2VyQ2FzZSgpLnRyaW0oKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csICdfJykucmVwbGFjZSgvXl8rfF8rJC9nLCAnJyk7XG59XG5cbmNvbnN0IEZJRUxEX1RZUEVTOiBGaWVsZFR5cGVbXSA9IFsnVGV4dCcsICdUZXh0YXJlYScsICdEYXRlJywgJ051bWJlcicsICdTZWxlY3QnLCAnTGluayddO1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQTogQm9hcmRTY2hlbWEgPSB7XG5cdHRpdGxlOiAnTmV3IEJvYXJkJyxcblx0ZmllbGRzOiBbXG5cdFx0eyBuYW1lOiAndGl0bGUnLCB0eXBlOiAnVGV4dCcsIGxhYmVsOiAnVGl0bGUnIH0sXG5cdFx0eyBuYW1lOiAnc3RhdHVzJywgdHlwZTogJ1NlbGVjdCcsIGxhYmVsOiAnU3RhdHVzJywgb3B0aW9uczogWyd0b2RvJywgJ2RvaW5nJywgJ2RvbmUnXSwgZGVmYXVsdDogJ3RvZG8nIH0sXG5cdF0sXG5cdHZpZXdDb25maWc6IHsgY29sdW1uczogJ3N0YXR1cycgfSxcblx0cmF3V29ya2Zsb3c6ICcnLFxuXHR2ZXJzaW9uOiAxLFxufTtcblxuZXhwb3J0IGNsYXNzIEJvYXJkQ29uZmlnTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG5cdHByaXZhdGUgc2NoZW1hOiBCb2FyZFNjaGVtYTtcblx0cHJpdmF0ZSBlcnJvckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIGZpZWxkTGlzdEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIGNhcmRGaWVsZExpc3RFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuXHRjb25zdHJ1Y3Rvcihcblx0XHRhcHA6IEFwcCxcblx0XHRpbml0aWFsOiBCb2FyZFNjaGVtYSB8IG51bGwsXG5cdFx0cHJpdmF0ZSBvbkNvbmZpcm06IChzY2hlbWE6IEJvYXJkU2NoZW1hKSA9PiB2b2lkLFxuXHQpIHtcblx0XHRzdXBlcihhcHApO1xuXHRcdHRoaXMuc2NoZW1hID0gaW5pdGlhbFxuXHRcdFx0PyB7IC4uLmluaXRpYWwsIGZpZWxkczogaW5pdGlhbC5maWVsZHMubWFwKGYgPT4gKHsgLi4uZiB9KSkgfVxuXHRcdFx0OiB7IC4uLkRFRkFVTFRfU0NIRU1BLCBmaWVsZHM6IERFRkFVTFRfU0NIRU1BLmZpZWxkcy5tYXAoZiA9PiAoeyAuLi5mIH0pKSB9O1xuXHR9XG5cblx0b25PcGVuKCk6IHZvaWQge1xuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xuXHRcdHRoaXMudGl0bGVFbC50ZXh0Q29udGVudCA9IHRoaXMuc2NoZW1hLnRpdGxlID09PSAnTmV3IEJvYXJkJyAmJiAhdGhpcy5zY2hlbWEuZmllbGRzLmxlbmd0aFxuXHRcdFx0PyAnTmV3IGJvYXJkJ1xuXHRcdFx0OiAnQm9hcmQgc2V0dGluZ3MnO1xuXG5cdFx0dGhpcy5yZW5kZXJUaXRsZUlucHV0KGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJGaWVsZHNTZWN0aW9uKGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJWaWV3Q29uZmlnKGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJDYXJkRGlzcGxheShjb250ZW50RWwpO1xuXHRcdHRoaXMucmVuZGVyV29ya2Zsb3coY29udGVudEVsKTtcblxuXHRcdHRoaXMuZXJyb3JFbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHR0aGlzLmVycm9yRWwuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZXJyb3InKTtcblx0XHRjb250ZW50RWwuYXBwZW5kQ2hpbGQodGhpcy5lcnJvckVsKTtcblxuXHRcdGNvbnN0IHNhdmVCdG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0XHRzYXZlQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNhdmUnKTtcblx0XHRzYXZlQnRuLnRleHRDb250ZW50ID0gJ1NhdmUnO1xuXHRcdHNhdmVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLnN1Ym1pdCgpKTtcblx0XHRjb250ZW50RWwuYXBwZW5kQ2hpbGQoc2F2ZUJ0bik7XG5cblx0XHRjb250ZW50RWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJ2lucHV0Jyk/LmZvY3VzKCk7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlclRpdGxlSW5wdXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuXHRcdGNvbnN0IHdyYXAgPSB0aGlzLmZpZWxkKGNvbnRhaW5lciwgJ0JvYXJkIHRpdGxlJyk7XG5cdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRpbnAudHlwZSA9ICd0ZXh0Jztcblx0XHRpbnAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRpbnAudmFsdWUgPSB0aGlzLnNjaGVtYS50aXRsZTtcblx0XHRpbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7IHRoaXMuc2NoZW1hLnRpdGxlID0gaW5wLnZhbHVlOyB9KTtcblx0XHR3cmFwLmFwcGVuZENoaWxkKGlucCk7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlckZpZWxkc1NlY3Rpb24oY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuXHRcdGNvbnN0IHNlY3Rpb24gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRzZWN0aW9uLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNlY3Rpb24nKTtcblxuXHRcdGNvbnN0IGhlYWRpbmcgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0aGVhZGluZy5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1zZWN0aW9uLWxhYmVsJyk7XG5cdFx0aGVhZGluZy50ZXh0Q29udGVudCA9ICdGaWVsZHMnO1xuXHRcdHNlY3Rpb24uYXBwZW5kQ2hpbGQoaGVhZGluZyk7XG5cblx0XHR0aGlzLmZpZWxkTGlzdEVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0dGhpcy5maWVsZExpc3RFbC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1maWVsZC1saXN0Jyk7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZCh0aGlzLmZpZWxkTGlzdEVsKTtcblxuXHRcdHRoaXMucmVyZW5kZXJGaWVsZExpc3QoKTtcblxuXHRcdGNvbnN0IGFkZEJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdGFkZEJ0bi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1hZGQtZmllbGQnKTtcblx0XHRhZGRCdG4udGV4dENvbnRlbnQgPSAnKyBBZGQgZmllbGQnO1xuXHRcdGFkZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuc2NoZW1hLmZpZWxkcy5wdXNoKHsgbmFtZTogJycsIHR5cGU6ICdUZXh0JywgbGFiZWw6ICcnIH0pO1xuXHRcdFx0dGhpcy5yZXJlbmRlckZpZWxkTGlzdCgpO1xuXHRcdFx0dGhpcy5yZWZyZXNoVmlld0NvbmZpZygpO1xuXHRcdH0pO1xuXHRcdHNlY3Rpb24uYXBwZW5kQ2hpbGQoYWRkQnRuKTtcblxuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChzZWN0aW9uKTtcblx0fVxuXG5cdHByaXZhdGUgcmVyZW5kZXJGaWVsZExpc3QoKTogdm9pZCB7XG5cdFx0aWYgKCF0aGlzLmZpZWxkTGlzdEVsKSByZXR1cm47XG5cdFx0dGhpcy5maWVsZExpc3RFbC5pbm5lckhUTUwgPSAnJztcblx0XHR0aGlzLnNjaGVtYS5maWVsZHMuZm9yRWFjaCgoZiwgaWR4KSA9PiB7XG5cdFx0XHR0aGlzLmZpZWxkTGlzdEVsIS5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlckZpZWxkUm93KGYsIGlkeCkpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyRmllbGRSb3coZmllbGQ6IEZpZWxkRGVmaW5pdGlvbiwgaWR4OiBudW1iZXIpOiBIVE1MRWxlbWVudCB7XG5cdFx0Y29uc3QgdG90YWwgPSB0aGlzLnNjaGVtYS5maWVsZHMubGVuZ3RoO1xuXHRcdGNvbnN0IHJvdyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHJvdy5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1maWVsZC1yb3cnKTtcblxuXHRcdGNvbnN0IGlzTmV3ID0gZmllbGQubmFtZSA9PT0gJyc7XG5cblx0XHRjb25zdCBsYWJlbElucCA9IHRoaXMuZml4ZWRJbnB1dChyb3csICdMYWJlbCcsIGZpZWxkLmxhYmVsLCAnZmstY29sLWxhYmVsJyk7XG5cdFx0aWYgKCFpc05ldykgbGFiZWxJbnAudGl0bGUgPSBgaWQ6ICR7ZmllbGQubmFtZX1gO1xuXHRcdGxhYmVsSW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuXHRcdFx0ZmllbGQubGFiZWwgPSBsYWJlbElucC52YWx1ZTtcblx0XHRcdGlmIChpc05ldykge1xuXHRcdFx0XHRmaWVsZC5uYW1lID0gZGVyaXZlRmllbGROYW1lKGxhYmVsSW5wLnZhbHVlKTtcblx0XHRcdFx0bGFiZWxJbnAudGl0bGUgPSBmaWVsZC5uYW1lID8gYGlkOiAke2ZpZWxkLm5hbWV9YCA6ICcnO1xuXHRcdFx0XHR0aGlzLnJlZnJlc2hWaWV3Q29uZmlnKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjb25zdCB0eXBlU2VsZWN0ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0Jyk7XG5cdFx0dHlwZVNlbGVjdC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dC1zbScsICdmay1jb2wtdHlwZScpO1xuXHRcdGZvciAoY29uc3QgdCBvZiBGSUVMRF9UWVBFUykge1xuXHRcdFx0Y29uc3QgbyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuXHRcdFx0by52YWx1ZSA9IHQ7XG5cdFx0XHRvLnRleHRDb250ZW50ID0gdDtcblx0XHRcdGlmICh0ID09PSBmaWVsZC50eXBlKSBvLnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdHR5cGVTZWxlY3QuYXBwZW5kQ2hpbGQobyk7XG5cdFx0fVxuXHRcdHJvdy5hcHBlbmRDaGlsZCh0eXBlU2VsZWN0KTtcblxuXHRcdGNvbnN0IGlzU2VsZWN0ID0gZmllbGQudHlwZSA9PT0gJ1NlbGVjdCc7XG5cblx0XHRjb25zdCBvcHRpb25zSW5wID0gdGhpcy5maXhlZElucHV0KHJvdywgJ2EgfCBiIHwgYycsIChmaWVsZC5vcHRpb25zID8/IFtdKS5qb2luKCcsICcpLCAnZmstY29sLW9wdGlvbnMnKTtcblx0XHRvcHRpb25zSW5wLmRpc2FibGVkID0gIWlzU2VsZWN0O1xuXHRcdG9wdGlvbnNJbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRmaWVsZC5vcHRpb25zID0gb3B0aW9uc0lucC52YWx1ZS5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbik7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBkZWZhdWx0SW5wID0gdGhpcy5maXhlZElucHV0KHJvdywgJ0RlZmF1bHQnLCBmaWVsZC5kZWZhdWx0ID8/ICcnLCAnZmstY29sLWRlZmF1bHQnKTtcblx0XHRkZWZhdWx0SW5wLmRpc2FibGVkID0gIWlzU2VsZWN0O1xuXHRcdGRlZmF1bHRJbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRmaWVsZC5kZWZhdWx0ID0gZGVmYXVsdElucC52YWx1ZSB8fCB1bmRlZmluZWQ7XG5cdFx0fSk7XG5cblx0XHR0eXBlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcblx0XHRcdGZpZWxkLnR5cGUgPSB0eXBlU2VsZWN0LnZhbHVlIGFzIEZpZWxkVHlwZTtcblx0XHRcdGNvbnN0IG5vd1NlbGVjdCA9IGZpZWxkLnR5cGUgPT09ICdTZWxlY3QnO1xuXHRcdFx0b3B0aW9uc0lucC5kaXNhYmxlZCA9ICFub3dTZWxlY3Q7XG5cdFx0XHRkZWZhdWx0SW5wLmRpc2FibGVkID0gIW5vd1NlbGVjdDtcblx0XHRcdGlmICghbm93U2VsZWN0KSB7XG5cdFx0XHRcdGZpZWxkLm9wdGlvbnMgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGZpZWxkLmRlZmF1bHQgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdG9wdGlvbnNJbnAudmFsdWUgPSAnJztcblx0XHRcdFx0ZGVmYXVsdElucC52YWx1ZSA9ICcnO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gUmVvcmRlciAvIHJlbW92ZSBjb250cm9sc1xuXHRcdGNvbnN0IGNvbnRyb2xzID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29udHJvbHMuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtcm93LWNvbnRyb2xzJyk7XG5cblx0XHRjb25zdCB1cEJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MjE5MScsIGlkeCA9PT0gMCk7XG5cdFx0dXBCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeCAtIDFdLCB0aGlzLnNjaGVtYS5maWVsZHNbaWR4XV0gPVxuXHRcdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeF0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHggLSAxXV07XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBkb3duQnRuID0gdGhpcy5pY29uQnRuKGNvbnRyb2xzLCAnXHUyMTkzJywgaWR4ID09PSB0b3RhbCAtIDEpO1xuXHRcdGRvd25CdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeF0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHggKyAxXV0gPVxuXHRcdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeCArIDFdLCB0aGlzLnNjaGVtYS5maWVsZHNbaWR4XV07XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCByZW1vdmVCdG4gPSB0aGlzLmljb25CdG4oY29udHJvbHMsICdcdTAwRDcnLCB0b3RhbCA8PSAxKTtcblx0XHRyZW1vdmVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNjaGVtYS5maWVsZHMuc3BsaWNlKGlkeCwgMSk7XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0XHR0aGlzLnJlZnJlc2hWaWV3Q29uZmlnKCk7XG5cdFx0fSk7XG5cblx0XHRyb3cuYXBwZW5kQ2hpbGQoY29udHJvbHMpO1xuXHRcdHJldHVybiByb3c7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlclZpZXdDb25maWcoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuXHRcdGNvbnN0IHNlY3Rpb24gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRzZWN0aW9uLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNlY3Rpb24nKTtcblxuXHRcdGNvbnN0IGNvbFdyYXAgPSB0aGlzLmZpZWxkKHNlY3Rpb24sICdDb2x1bW5zIGZpZWxkJyk7XG5cdFx0Y29uc3QgY29sU2VsZWN0ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0Jyk7XG5cdFx0Y29sU2VsZWN0LmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0Y29sU2VsZWN0LmRhdGFzZXQucm9sZSA9ICdjb2x1bW5zJztcblx0XHR0aGlzLnBvcHVsYXRlRmllbGRTZWxlY3QoY29sU2VsZWN0LCB0aGlzLnNjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnMpO1xuXHRcdGNvbFNlbGVjdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucyA9IGNvbFNlbGVjdC52YWx1ZTsgfSk7XG5cdFx0Y29sV3JhcC5hcHBlbmRDaGlsZChjb2xTZWxlY3QpO1xuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHNlY3Rpb24pO1xuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJDYXJkRGlzcGxheShjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgc2VjdGlvbiA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHNlY3Rpb24uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2VjdGlvbicpO1xuXG5cdFx0Y29uc3QgaGVhZGluZyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRoZWFkaW5nLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNlY3Rpb24tbGFiZWwnKTtcblx0XHRoZWFkaW5nLnRleHRDb250ZW50ID0gJ0NhcmQgZGlzcGxheSc7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZChoZWFkaW5nKTtcblxuXHRcdC8vIENhcmQgdGl0bGUgZHJvcGRvd25cblx0XHRjb25zdCB0aXRsZVdyYXAgPSB0aGlzLmZpZWxkKHNlY3Rpb24sICdDYXJkIHRpdGxlJyk7XG5cdFx0Y29uc3QgdGl0bGVTZWxlY3QgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblx0XHR0aXRsZVNlbGVjdC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dCcpO1xuXHRcdHRpdGxlU2VsZWN0LmRhdGFzZXQucm9sZSA9ICdjYXJkLXRpdGxlLXNlbGVjdCc7XG5cdFx0Y29uc3QgYXV0b09wdCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuXHRcdGF1dG9PcHQudmFsdWUgPSAnX19hdXRvX18nO1xuXHRcdGF1dG9PcHQudGV4dENvbnRlbnQgPSAnKGF1dG8pJztcblx0XHR0aXRsZVNlbGVjdC5hcHBlbmRDaGlsZChhdXRvT3B0KTtcblx0XHRjb25zdCBub25lT3B0ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XG5cdFx0bm9uZU9wdC52YWx1ZSA9ICcnO1xuXHRcdG5vbmVPcHQudGV4dENvbnRlbnQgPSAnKG5vbmUpJztcblx0XHR0aXRsZVNlbGVjdC5hcHBlbmRDaGlsZChub25lT3B0KTtcblx0XHR0aGlzLnBvcHVsYXRlQ2FyZFRpdGxlU2VsZWN0KHRpdGxlU2VsZWN0KTtcblx0XHR0aXRsZVNlbGVjdC52YWx1ZSA9IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZFRpdGxlID8/ICdfX2F1dG9fXyc7XG5cdFx0dGl0bGVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgdiA9IHRpdGxlU2VsZWN0LnZhbHVlO1xuXHRcdFx0dGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkVGl0bGUgPSB2ID09PSAnX19hdXRvX18nID8gdW5kZWZpbmVkIDogdjtcblx0XHR9KTtcblx0XHR0aXRsZVdyYXAuYXBwZW5kQ2hpbGQodGl0bGVTZWxlY3QpO1xuXG5cdFx0Ly8gU2hvdyBsYWJlbHMgY2hlY2tib3hcblx0XHRjb25zdCBsYWJlbHNXcmFwID0gdGhpcy5maWVsZChzZWN0aW9uLCAnU2hvdyBsYWJlbHMnKTtcblx0XHRjb25zdCBsYWJlbHNDaGVjayA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0bGFiZWxzQ2hlY2sudHlwZSA9ICdjaGVja2JveCc7XG5cdFx0bGFiZWxzQ2hlY2suY2hlY2tlZCA9IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZExhYmVscyAhPT0gZmFsc2U7XG5cdFx0bGFiZWxzQ2hlY2suYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkTGFiZWxzID0gbGFiZWxzQ2hlY2suY2hlY2tlZCA/IHVuZGVmaW5lZCA6IGZhbHNlO1xuXHRcdH0pO1xuXHRcdGxhYmVsc1dyYXAuYXBwZW5kQ2hpbGQobGFiZWxzQ2hlY2spO1xuXG5cdFx0dGhpcy5jYXJkRmllbGRMaXN0RWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR0aGlzLmNhcmRGaWVsZExpc3RFbC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1maWVsZC1saXN0Jyk7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZCh0aGlzLmNhcmRGaWVsZExpc3RFbCk7XG5cdFx0dGhpcy5yZXJlbmRlckNhcmRGaWVsZExpc3QoKTtcblxuXHRcdGNvbnN0IGFkZFJvdyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGFkZFJvdy5kYXRhc2V0LnJvbGUgPSAnY2FyZC1kaXNwbGF5LWFkZCc7XG5cblx0XHRjb25zdCBhZGRTZWxlY3QgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblx0XHRhZGRTZWxlY3QuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQtc20nKTtcblx0XHRhZGRTZWxlY3QuZGF0YXNldC5yb2xlID0gJ2NhcmQtZGlzcGxheS1zZWxlY3QnO1xuXHRcdGFkZFJvdy5hcHBlbmRDaGlsZChhZGRTZWxlY3QpO1xuXG5cdFx0Y29uc3QgYWRkQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0YWRkQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWFkZC1maWVsZCcpO1xuXHRcdGFkZEJ0bi50ZXh0Q29udGVudCA9ICcrIEFkZCBmaWVsZCc7XG5cdFx0YWRkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbmFtZSA9IGFkZFNlbGVjdC52YWx1ZTtcblx0XHRcdGlmICghbmFtZSkgcmV0dXJuO1xuXHRcdFx0Y29uc3QgY3VycmVudCA9IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZEZpZWxkcyA/PyBbXTtcblx0XHRcdGlmICghY3VycmVudC5pbmNsdWRlcyhuYW1lKSkge1xuXHRcdFx0XHR0aGlzLnNjaGVtYS52aWV3Q29uZmlnLmNhcmRGaWVsZHMgPSBbLi4uY3VycmVudCwgbmFtZV07XG5cdFx0XHRcdHRoaXMucmVyZW5kZXJDYXJkRmllbGRMaXN0KCk7XG5cdFx0XHRcdHRoaXMucmVmcmVzaENhcmREaXNwbGF5U2VsZWN0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0YWRkUm93LmFwcGVuZENoaWxkKGFkZEJ0bik7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZChhZGRSb3cpO1xuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHNlY3Rpb24pO1xuXHRcdHRoaXMucmVmcmVzaENhcmREaXNwbGF5U2VsZWN0KCk7XG5cdH1cblxuXHRwcml2YXRlIHJlcmVuZGVyQ2FyZEZpZWxkTGlzdCgpOiB2b2lkIHtcblx0XHRpZiAoIXRoaXMuY2FyZEZpZWxkTGlzdEVsKSByZXR1cm47XG5cdFx0dGhpcy5jYXJkRmllbGRMaXN0RWwuaW5uZXJIVE1MID0gJyc7XG5cdFx0Y29uc3QgY2FyZEZpZWxkcyA9IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZEZpZWxkcyA/PyBbXTtcblx0XHRjYXJkRmllbGRzLmZvckVhY2goKG5hbWUsIGlkeCkgPT4ge1xuXHRcdFx0Y29uc3QgZmllbGQgPSB0aGlzLnNjaGVtYS5maWVsZHMuZmluZChmID0+IGYubmFtZSA9PT0gbmFtZSk7XG5cdFx0XHRjb25zdCByb3cgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdHJvdy5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1maWVsZC1yb3cnKTtcblxuXHRcdFx0Y29uc3QgbGFiZWxFbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdGxhYmVsRWwuc3R5bGUuZmxleCA9ICcxJztcblx0XHRcdGxhYmVsRWwudGV4dENvbnRlbnQgPSBmaWVsZD8ubGFiZWwgPz8gbmFtZTtcblx0XHRcdHJvdy5hcHBlbmRDaGlsZChsYWJlbEVsKTtcblxuXHRcdFx0Y29uc3QgY29udHJvbHMgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGNvbnRyb2xzLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXJvdy1jb250cm9scycpO1xuXG5cdFx0XHRjb25zdCB1cEJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MjE5MScsIGlkeCA9PT0gMCk7XG5cdFx0XHR1cEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFx0Y29uc3QgY2YgPSBbLi4uKHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZEZpZWxkcyA/PyBbXSldO1xuXHRcdFx0XHRbY2ZbaWR4IC0gMV0sIGNmW2lkeF1dID0gW2NmW2lkeF0sIGNmW2lkeCAtIDFdXTtcblx0XHRcdFx0dGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkRmllbGRzID0gY2Y7XG5cdFx0XHRcdHRoaXMucmVyZW5kZXJDYXJkRmllbGRMaXN0KCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgZG93bkJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MjE5MycsIGlkeCA9PT0gY2FyZEZpZWxkcy5sZW5ndGggLSAxKTtcblx0XHRcdGRvd25CdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGNmID0gWy4uLih0aGlzLnNjaGVtYS52aWV3Q29uZmlnLmNhcmRGaWVsZHMgPz8gW10pXTtcblx0XHRcdFx0W2NmW2lkeF0sIGNmW2lkeCArIDFdXSA9IFtjZltpZHggKyAxXSwgY2ZbaWR4XV07XG5cdFx0XHRcdHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZEZpZWxkcyA9IGNmO1xuXHRcdFx0XHR0aGlzLnJlcmVuZGVyQ2FyZEZpZWxkTGlzdCgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHJlbW92ZUJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MDBENycsIGZhbHNlKTtcblx0XHRcdHJlbW92ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFx0Y29uc3QgY2YgPSAodGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkRmllbGRzID8/IFtdKS5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGlkeCk7XG5cdFx0XHRcdHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY2FyZEZpZWxkcyA9IGNmLmxlbmd0aCA/IGNmIDogdW5kZWZpbmVkO1xuXHRcdFx0XHR0aGlzLnJlcmVuZGVyQ2FyZEZpZWxkTGlzdCgpO1xuXHRcdFx0XHR0aGlzLnJlZnJlc2hDYXJkRGlzcGxheVNlbGVjdCgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJvdy5hcHBlbmRDaGlsZChjb250cm9scyk7XG5cdFx0XHR0aGlzLmNhcmRGaWVsZExpc3RFbCEuYXBwZW5kQ2hpbGQocm93KTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgcG9wdWxhdGVDYXJkVGl0bGVTZWxlY3Qoc2VsZWN0OiBIVE1MU2VsZWN0RWxlbWVudCk6IHZvaWQge1xuXHRcdGNvbnN0IGV4aXN0aW5nID0gQXJyYXkuZnJvbShzZWxlY3Qub3B0aW9ucykubWFwKG8gPT4gby52YWx1ZSk7XG5cdFx0Zm9yIChjb25zdCBmIG9mIHRoaXMuc2NoZW1hLmZpZWxkcy5maWx0ZXIoZiA9PiBmLm5hbWUgIT09ICdfaWQnKSkge1xuXHRcdFx0aWYgKCFleGlzdGluZy5pbmNsdWRlcyhmLm5hbWUpKSB7XG5cdFx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdFx0by52YWx1ZSA9IGYubmFtZTtcblx0XHRcdFx0by50ZXh0Q29udGVudCA9IGYubGFiZWwgfHwgZi5uYW1lO1xuXHRcdFx0XHRzZWxlY3QuYXBwZW5kQ2hpbGQobyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSByZWZyZXNoQ2FyZFRpdGxlU2VsZWN0KCk6IHZvaWQge1xuXHRcdGNvbnN0IHNlbGVjdCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3I8SFRNTFNlbGVjdEVsZW1lbnQ+KCdbZGF0YS1yb2xlPVwiY2FyZC10aXRsZS1zZWxlY3RcIl0nKTtcblx0XHRpZiAoIXNlbGVjdCkgcmV0dXJuO1xuXHRcdGNvbnN0IGN1cnJlbnQgPSBzZWxlY3QudmFsdWU7XG5cdFx0d2hpbGUgKHNlbGVjdC5vcHRpb25zLmxlbmd0aCA+IDIpIHNlbGVjdC5yZW1vdmUoMik7IC8vIGtlZXAgKGF1dG8pIGFuZCAobm9uZSlcblx0XHR0aGlzLnBvcHVsYXRlQ2FyZFRpdGxlU2VsZWN0KHNlbGVjdCk7XG5cdFx0c2VsZWN0LnZhbHVlID0gY3VycmVudCBpbiBBcnJheS5mcm9tKHNlbGVjdC5vcHRpb25zKS5tYXAobyA9PiBvLnZhbHVlKSA/IGN1cnJlbnQgOiAodGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkVGl0bGUgPz8gJ19fYXV0b19fJyk7XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hDYXJkRGlzcGxheVNlbGVjdCgpOiB2b2lkIHtcblx0XHRjb25zdCBzZWxlY3QgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxTZWxlY3RFbGVtZW50PignW2RhdGEtcm9sZT1cImNhcmQtZGlzcGxheS1zZWxlY3RcIl0nKTtcblx0XHRpZiAoIXNlbGVjdCkgcmV0dXJuO1xuXHRcdHNlbGVjdC5pbm5lckhUTUwgPSAnJztcblx0XHRjb25zdCBjdXJyZW50ID0gdGhpcy5zY2hlbWEudmlld0NvbmZpZy5jYXJkRmllbGRzID8/IFtdO1xuXHRcdGNvbnN0IGF2YWlsYWJsZSA9IHRoaXMuc2NoZW1hLmZpZWxkcy5maWx0ZXIoZiA9PiBmLm5hbWUgIT09ICdfaWQnICYmICFjdXJyZW50LmluY2x1ZGVzKGYubmFtZSkpO1xuXHRcdGZvciAoY29uc3QgZiBvZiBhdmFpbGFibGUpIHtcblx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdG8udmFsdWUgPSBmLm5hbWU7XG5cdFx0XHRvLnRleHRDb250ZW50ID0gZi5sYWJlbCB8fCBmLm5hbWU7XG5cdFx0XHRzZWxlY3QuYXBwZW5kQ2hpbGQobyk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJXb3JrZmxvdyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgd3JhcCA9IHRoaXMuZmllbGQoY29udGFpbmVyLCAnV29ya2Zsb3cgKG9wdGlvbmFsKScpO1xuXHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0aW5wLnR5cGUgPSAndGV4dCc7XG5cdFx0aW5wLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0aW5wLnBsYWNlaG9sZGVyID0gJ3RvZG9cdTIxOTJkb2luZywgZG9pbmdcdTIxOTJkb25lJztcblx0XHRpbnAudmFsdWUgPSB0aGlzLnNjaGVtYS5yYXdXb3JrZmxvdyA/PyAnJztcblx0XHRpbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7IHRoaXMuc2NoZW1hLnJhd1dvcmtmbG93ID0gaW5wLnZhbHVlOyB9KTtcblx0XHR3cmFwLmFwcGVuZENoaWxkKGlucCk7XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hWaWV3Q29uZmlnKCk6IHZvaWQge1xuXHRcdGNvbnN0IGNvbFNlbGVjdCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3I8SFRNTFNlbGVjdEVsZW1lbnQ+KCdbZGF0YS1yb2xlPVwiY29sdW1uc1wiXScpO1xuXHRcdGlmIChjb2xTZWxlY3QpIHRoaXMucG9wdWxhdGVGaWVsZFNlbGVjdChjb2xTZWxlY3QsIHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucyk7XG5cdFx0dGhpcy5yZWZyZXNoQ2FyZFRpdGxlU2VsZWN0KCk7XG5cdFx0dGhpcy5yZXJlbmRlckNhcmRGaWVsZExpc3QoKTtcblx0XHR0aGlzLnJlZnJlc2hDYXJkRGlzcGxheVNlbGVjdCgpO1xuXHR9XG5cblx0cHJpdmF0ZSBwb3B1bGF0ZUZpZWxkU2VsZWN0KHNlbGVjdDogSFRNTFNlbGVjdEVsZW1lbnQsIGN1cnJlbnQ6IHN0cmluZyk6IHZvaWQge1xuXHRcdGNvbnN0IGV4aXN0aW5nID0gQXJyYXkuZnJvbShzZWxlY3Qub3B0aW9ucykubWFwKG8gPT4gby52YWx1ZSkuZmlsdGVyKHYgPT4gdik7XG5cdFx0Y29uc3QgbmFtZXMgPSB0aGlzLnNjaGVtYS5maWVsZHMubWFwKGYgPT4gZi5uYW1lKS5maWx0ZXIobiA9PiBuKTtcblx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcblx0XHRcdGlmICghZXhpc3RpbmcuaW5jbHVkZXMobmFtZSkpIHtcblx0XHRcdFx0Y29uc3QgbyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuXHRcdFx0XHRvLnZhbHVlID0gbmFtZTtcblx0XHRcdFx0by50ZXh0Q29udGVudCA9IG5hbWU7XG5cdFx0XHRcdHNlbGVjdC5hcHBlbmRDaGlsZChvKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGN1cnJlbnQpIHNlbGVjdC52YWx1ZSA9IGN1cnJlbnQ7XG5cdH1cblxuXHRwcml2YXRlIHN1Ym1pdCgpOiB2b2lkIHtcblx0XHRjb25zdCBlcnJvciA9IHRoaXMudmFsaWRhdGUoKTtcblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGlmICh0aGlzLmVycm9yRWwpIHRoaXMuZXJyb3JFbC50ZXh0Q29udGVudCA9IGVycm9yO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLm9uQ29uZmlybSh0aGlzLnNjaGVtYSk7XG5cdFx0dGhpcy5jbG9zZSgpO1xuXHR9XG5cblx0cHJpdmF0ZSB2YWxpZGF0ZSgpOiBzdHJpbmcgfCBudWxsIHtcblx0XHRpZiAoIXRoaXMuc2NoZW1hLnRpdGxlLnRyaW0oKSkgcmV0dXJuICdCb2FyZCB0aXRsZSBpcyByZXF1aXJlZC4nO1xuXHRcdGlmICh0aGlzLnNjaGVtYS5maWVsZHMubGVuZ3RoID09PSAwKSByZXR1cm4gJ0F0IGxlYXN0IG9uZSBmaWVsZCBpcyByZXF1aXJlZC4nO1xuXHRcdGNvbnN0IG5hbWVzID0gdGhpcy5zY2hlbWEuZmllbGRzLm1hcChmID0+IGYubmFtZS50cmltKCkpO1xuXHRcdGlmIChuYW1lcy5zb21lKG4gPT4gIW4pKSByZXR1cm4gJ0FsbCBmaWVsZCBuYW1lcyBtdXN0IGJlIG5vbi1lbXB0eS4nO1xuXHRcdGlmIChuZXcgU2V0KG5hbWVzKS5zaXplICE9PSBuYW1lcy5sZW5ndGgpIHJldHVybiAnRmllbGQgbmFtZXMgbXVzdCBiZSB1bmlxdWUuJztcblx0XHRmb3IgKGNvbnN0IGYgb2YgdGhpcy5zY2hlbWEuZmllbGRzKSB7XG5cdFx0XHRpZiAoZi50eXBlID09PSAnU2VsZWN0JyAmJiAoIWYub3B0aW9ucyB8fCBmLm9wdGlvbnMubGVuZ3RoID09PSAwKSkge1xuXHRcdFx0XHRyZXR1cm4gYFNlbGVjdCBmaWVsZCBcIiR7Zi5uYW1lfVwiIG11c3QgaGF2ZSBhdCBsZWFzdCBvbmUgb3B0aW9uLmA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICghdGhpcy5zY2hlbWEuZmllbGRzLnNvbWUoZiA9PiBmLm5hbWUgPT09IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucykpIHtcblx0XHRcdHJldHVybiAnQ29sdW1ucyBmaWVsZCBtdXN0IG1hdGNoIGFuIGV4aXN0aW5nIGZpZWxkIG5hbWUuJztcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRwcml2YXRlIGZpZWxkKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG5cdFx0Y29uc3Qgd3JhcCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHdyYXAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZmllbGQnKTtcblx0XHRjb25zdCBsYmwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuXHRcdGxibC50ZXh0Q29udGVudCA9IGxhYmVsO1xuXHRcdHdyYXAuYXBwZW5kQ2hpbGQobGJsKTtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQod3JhcCk7XG5cdFx0cmV0dXJuIHdyYXA7XG5cdH1cblxuXHRwcml2YXRlIHNtYWxsSW5wdXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgcGxhY2Vob2xkZXI6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IEhUTUxJbnB1dEVsZW1lbnQge1xuXHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0aW5wLnR5cGUgPSAndGV4dCc7XG5cdFx0aW5wLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0LXNtJyk7XG5cdFx0aW5wLnBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXI7XG5cdFx0aW5wLnZhbHVlID0gdmFsdWU7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGlucCk7XG5cdFx0cmV0dXJuIGlucDtcblx0fVxuXG5cdHByaXZhdGUgZml4ZWRJbnB1dChjb250YWluZXI6IEhUTUxFbGVtZW50LCBwbGFjZWhvbGRlcjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBjbHM6IHN0cmluZyk6IEhUTUxJbnB1dEVsZW1lbnQge1xuXHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0aW5wLnR5cGUgPSAndGV4dCc7XG5cdFx0aW5wLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0LXNtJywgY2xzKTtcblx0XHRpbnAucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcblx0XHRpbnAudmFsdWUgPSB2YWx1ZTtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoaW5wKTtcblx0XHRyZXR1cm4gaW5wO1xuXHR9XG5cblx0cHJpdmF0ZSBpY29uQnRuKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIGRpc2FibGVkOiBib29sZWFuKTogSFRNTEJ1dHRvbkVsZW1lbnQge1xuXHRcdGNvbnN0IGJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pY29uLWJ0bicpO1xuXHRcdGJ0bi50ZXh0Q29udGVudCA9IGxhYmVsO1xuXHRcdGJ0bi5kaXNhYmxlZCA9IGRpc2FibGVkO1xuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChidG4pO1xuXHRcdHJldHVybiBidG47XG5cdH1cblxuXHRvbkNsb3NlKCk6IHZvaWQge1xuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG5cdH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIFdvcmtzcGFjZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgQm9hcmQgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyByZW5kZXJCb2FyZCB9IGZyb20gJy4vYm9hcmQnO1xuaW1wb3J0IHsgcmVvcmRlckNhcmQsIGRlbGV0ZUNhcmQsIGNyZWF0ZUNhcmQsIHVwZGF0ZUNhcmQgfSBmcm9tICcuLi9tb2RlbC9tdXRhdGlvbnMnO1xuaW1wb3J0IHsgcGFyc2VXb3JrZmxvdywgaXNUcmFuc2l0aW9uQWxsb3dlZCB9IGZyb20gJy4uL2RhdGEvd29ya2Zsb3cnO1xuaW1wb3J0IHsgQ2FyZE1vZGFsIH0gZnJvbSAnLi9jYXJkLW1vZGFsJztcbmltcG9ydCB7IEJvYXJkQ29uZmlnTW9kYWwgfSBmcm9tICcuL2JvYXJkLWNvbmZpZy1tb2RhbCc7XG5pbXBvcnQgeyByZWNvbmNpbGVDYXJkcyB9IGZyb20gJy4uL2RhdGEvc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgU2F2ZUZuID0gKGJvYXJkOiBCb2FyZCkgPT4gUHJvbWlzZTx2b2lkPjtcblxuZXhwb3J0IGZ1bmN0aW9uIG1vdW50Qm9hcmQoZWw6IEhUTUxFbGVtZW50LCBib2FyZDogQm9hcmQsIHNhdmU6IFNhdmVGbiwgYXBwPzogQXBwLCBzb3VyY2VQYXRoID0gJycpOiB2b2lkIHtcblx0d2hpbGUgKGVsLmZpcnN0Q2hpbGQpIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuXG5cdGNvbnN0IGRpc3BhdGNoID0gKG5ld0JvYXJkOiBCb2FyZCk6IHZvaWQgPT4ge1xuXHRcdHZvaWQgc2F2ZShuZXdCb2FyZCkudGhlbigoKSA9PiBtb3VudEJvYXJkKGVsLCBuZXdCb2FyZCwgc2F2ZSwgYXBwLCBzb3VyY2VQYXRoKSk7XG5cdH07XG5cblx0Y29uc3QgYm9hcmRFbCA9IHJlbmRlckJvYXJkKGJvYXJkKTtcblx0YXR0YWNoRHJhZ0Ryb3AoYm9hcmRFbCwgYm9hcmQsIGRpc3BhdGNoKTtcblx0YXR0YWNoQ2FyZEFjdGlvbnMoYm9hcmRFbCwgYm9hcmQsIGRpc3BhdGNoLCBhcHAsIHNvdXJjZVBhdGgpO1xuXHRlbC5hcHBlbmRDaGlsZChib2FyZEVsKTtcbn1cblxuZnVuY3Rpb24gYXR0YWNoQ2FyZEFjdGlvbnMoYm9hcmRFbDogSFRNTEVsZW1lbnQsIGJvYXJkOiBCb2FyZCwgZGlzcGF0Y2g6IChiOiBCb2FyZCkgPT4gdm9pZCwgYXBwPzogQXBwLCBzb3VyY2VQYXRoID0gJycpOiB2b2lkIHtcblx0Ym9hcmRFbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG5cblx0XHRjb25zdCBsaW5rRWwgPSB0YXJnZXQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1jYXJkX19maWVsZC1saW5rJyk7XG5cdFx0aWYgKGxpbmtFbCkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdGNvbnN0IGhyZWYgPSBsaW5rRWwuZGF0YXNldC5ocmVmID8/ICcnO1xuXHRcdFx0aWYgKC9eW2EtekEtWl1bYS16QS1aMC05K1xcLS5dKjovLnRlc3QoaHJlZikpIHtcblx0XHRcdFx0d2luZG93Lm9wZW4oaHJlZiwgJ19ibGFuaycpO1xuXHRcdFx0fSBlbHNlIGlmIChhcHApIHtcblx0XHRcdFx0dm9pZCAoYXBwLndvcmtzcGFjZSBhcyBXb3Jrc3BhY2UpLm9wZW5MaW5rVGV4dChocmVmLCBzb3VyY2VQYXRoLCAndGFiJyk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2V0dGluZ3NCdG4gPSB0YXJnZXQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1ib2FyZF9fc2V0dGluZ3MnKTtcblx0XHRpZiAoc2V0dGluZ3NCdG4gJiYgYXBwKSB7XG5cdFx0XHRuZXcgQm9hcmRDb25maWdNb2RhbChhcHAsIGJvYXJkLCAoc2NoZW1hKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHJlY29uY2lsZWRDYXJkcyA9IHJlY29uY2lsZUNhcmRzKHNjaGVtYS5maWVsZHMsIGJvYXJkLmNhcmRzKTtcblx0XHRcdFx0ZGlzcGF0Y2goeyAuLi5zY2hlbWEsIGNhcmRzOiByZWNvbmNpbGVkQ2FyZHMgfSk7XG5cdFx0XHR9KS5vcGVuKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWRkQnRuID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sX19hZGQtYnRuJyk7XG5cdFx0aWYgKGFkZEJ0bikge1xuXHRcdFx0Y29uc3QgY29sID0gYWRkQnRuLmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sdW1uJyk7XG5cdFx0XHRjb25zdCBjb2x1bW5WYWx1ZSA9IGNvbD8uZGF0YXNldC5jb2x1bW5WYWx1ZSA/PyAnJztcblx0XHRcdGlmIChhcHApIHtcblx0XHRcdFx0bmV3IENhcmRNb2RhbChhcHAsIGJvYXJkLCBudWxsLCBjb2x1bW5WYWx1ZSwgKHZhbHVlcykgPT4ge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGNyZWF0ZUNhcmQoYm9hcmQsIGNvbHVtblZhbHVlLCB2YWx1ZXMpKTtcblx0XHRcdFx0fSwgdW5kZWZpbmVkLCBzb3VyY2VQYXRoKS5vcGVuKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkaXNwYXRjaChjcmVhdGVDYXJkKGJvYXJkLCBjb2x1bW5WYWx1ZSwge30pKTtcblx0XHRcdH1cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBjYXJkRWwgPSB0YXJnZXQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1jYXJkJyk7XG5cdFx0aWYgKGNhcmRFbCkge1xuXHRcdFx0Y29uc3QgY2FyZElkID0gY2FyZEVsLmRhdGFzZXQuY2FyZElkID8/ICcnO1xuXHRcdFx0Y29uc3QgY2FyZCA9IGJvYXJkLmNhcmRzLmZpbmQoYyA9PiBjLmlkID09PSBjYXJkSWQpID8/IG51bGw7XG5cdFx0XHRjb25zdCBjb2x1bW5WYWx1ZSA9IGNhcmRFbC5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNvbHVtbicpPy5kYXRhc2V0LmNvbHVtblZhbHVlID8/ICcnO1xuXHRcdFx0aWYgKGFwcCAmJiBjYXJkKSB7XG5cdFx0XHRcdG5ldyBDYXJkTW9kYWwoYXBwLCBib2FyZCwgY2FyZCwgY29sdW1uVmFsdWUsICh2YWx1ZXMpID0+IHtcblx0XHRcdFx0XHRkaXNwYXRjaCh1cGRhdGVDYXJkKGJvYXJkLCBjYXJkSWQsIHZhbHVlcykpO1xuXHRcdFx0XHR9LCAoKSA9PiB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZGVsZXRlQ2FyZChib2FyZCwgY2FyZElkKSk7XG5cdFx0XHRcdH0sIHNvdXJjZVBhdGgpLm9wZW4oKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXRJbnNlcnRCZWZvcmVJZChjbGllbnRZOiBudW1iZXIsIGNvbDogSFRNTEVsZW1lbnQpOiBzdHJpbmcgfCBudWxsIHtcblx0Y29uc3QgY2FyZHMgPSBBcnJheS5mcm9tKGNvbC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLmZrLWNhcmQ6bm90KC5may1jYXJkLS1kcmFnZ2luZyknKSk7XG5cdGZvciAoY29uc3QgY2FyZCBvZiBjYXJkcykge1xuXHRcdGNvbnN0IHJlY3QgPSBjYXJkLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdGlmIChjbGllbnRZIDwgcmVjdC50b3AgKyByZWN0LmhlaWdodCAvIDIpIHJldHVybiBjYXJkLmRhdGFzZXQuY2FyZElkID8/IG51bGw7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZURyb3BJbmRpY2F0b3IoY29sOiBIVE1MRWxlbWVudCwgaW5zZXJ0QmVmb3JlSWQ6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcblx0Y29sLnF1ZXJ5U2VsZWN0b3JBbGwoJy5may1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuXHRjb25zdCBpbmRpY2F0b3IgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0aW5kaWNhdG9yLmNsYXNzTGlzdC5hZGQoJ2ZrLWRyb3AtaW5kaWNhdG9yJyk7XG5cdGNvbnN0IGNhcmRzRWwgPSBjb2wucXVlcnlTZWxlY3RvcignLmZrLWNvbHVtbl9fY2FyZHMnKTtcblx0aWYgKCFjYXJkc0VsKSByZXR1cm47XG5cdGlmIChpbnNlcnRCZWZvcmVJZCA9PT0gbnVsbCkge1xuXHRcdGNhcmRzRWwuYXBwZW5kQ2hpbGQoaW5kaWNhdG9yKTtcblx0fSBlbHNlIHtcblx0XHRjb25zdCB0YXJnZXQgPSBjYXJkc0VsLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWNhcmQtaWQ9XCIke2luc2VydEJlZm9yZUlkfVwiXWApO1xuXHRcdGlmICh0YXJnZXQpIGNhcmRzRWwuaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0KTtcblx0XHRlbHNlIGNhcmRzRWwuYXBwZW5kQ2hpbGQoaW5kaWNhdG9yKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjbGVhckRyb3BTdGF0ZShib2FyZEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuXHRib2FyZEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5may1jYXJkLS1kcmFnZ2luZycpLmZvckVhY2goYyA9PiBjLmNsYXNzTGlzdC5yZW1vdmUoJ2ZrLWNhcmQtLWRyYWdnaW5nJykpO1xuXHRib2FyZEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5may1jb2x1bW4tLWRyYWctb3ZlcicpLmZvckVhY2goYyA9PiBjLmNsYXNzTGlzdC5yZW1vdmUoJ2ZrLWNvbHVtbi0tZHJhZy1vdmVyJykpO1xuXHRib2FyZEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5may1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvd1RyYW5zaXRpb25CbG9ja2VkVG9hc3QoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogdm9pZCB7XG5cdGNvbnN0IGV4aXN0aW5nID0gYWN0aXZlRG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZrLXRvYXN0Jyk7XG5cdGlmIChleGlzdGluZykgZXhpc3RpbmcucmVtb3ZlKCk7XG5cblx0Y29uc3QgdG9hc3QgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0dG9hc3QuY2xhc3NMaXN0LmFkZCgnZmstdG9hc3QnKTtcblx0dG9hc3QudGV4dENvbnRlbnQgPSBgQ2Fubm90IG1vdmUgZnJvbSAnJHtmcm9tfScgdG8gJyR7dG99Jy4gVG8gYWxsb3cgdGhpcyB0cmFuc2l0aW9uLCBhZGQgJyR7ZnJvbX0gXHUyMTkyICR7dG99JyB0byB0aGUgd29ya2Zsb3cuYDtcblx0YWN0aXZlRG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0b2FzdCk7XG5cblx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0dG9hc3QuY2xhc3NMaXN0LmFkZCgnZmstdG9hc3QtLWhpZGluZycpO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4gdG9hc3QucmVtb3ZlKCksIDQwMCk7XG5cdH0sIDMwMDApO1xufVxuXG5mdW5jdGlvbiBhdHRhY2hEcmFnRHJvcChib2FyZEVsOiBIVE1MRWxlbWVudCwgYm9hcmQ6IEJvYXJkLCBkaXNwYXRjaDogKGI6IEJvYXJkKSA9PiB2b2lkKTogdm9pZCB7XG5cdGNvbnN0IGNvbHVtbkZpZWxkID0gYm9hcmQuZmllbGRzLmZpbmQoZiA9PiBmLm5hbWUgPT09IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucyk7XG5cdGNvbnN0IHN0YXR1c09wdGlvbnMgPSBjb2x1bW5GaWVsZD8ub3B0aW9ucyA/PyBbXTtcblx0Y29uc3Qgd29ya2Zsb3dNYXAgPSBwYXJzZVdvcmtmbG93KGJvYXJkLnJhd1dvcmtmbG93IHx8IHVuZGVmaW5lZCwgc3RhdHVzT3B0aW9ucyk7XG5cblx0bGV0IGRyYWdnaW5nQ2FyZElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblx0bGV0IGN1cnJlbnRDb2w6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cdGxldCBpbnNlcnRCZWZvcmVJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cblx0Ym9hcmRFbC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIChlKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG5cdFx0aWYgKHRhcmdldC5jbG9zZXN0KCdidXR0b24nKSkgcmV0dXJuO1xuXHRcdGNvbnN0IGNhcmQgPSB0YXJnZXQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1jYXJkJyk7XG5cdFx0aWYgKCFjYXJkKSByZXR1cm47XG5cblx0XHRjb25zdCBzdGFydFggPSBlLmNsaWVudFg7XG5cdFx0Y29uc3Qgc3RhcnRZID0gZS5jbGllbnRZO1xuXHRcdGxldCBkcmFnU3RhcnRlZCA9IGZhbHNlO1xuXG5cdFx0Y29uc3Qgb25Nb3ZlID0gKGV2OiBQb2ludGVyRXZlbnQpID0+IHtcblx0XHRcdGlmICghZHJhZ1N0YXJ0ZWQpIHtcblx0XHRcdFx0Y29uc3QgZHggPSBldi5jbGllbnRYIC0gc3RhcnRYO1xuXHRcdFx0XHRjb25zdCBkeSA9IGV2LmNsaWVudFkgLSBzdGFydFk7XG5cdFx0XHRcdGlmIChkeCAqIGR4ICsgZHkgKiBkeSA8IDI1KSByZXR1cm47XG5cdFx0XHRcdGRyYWdTdGFydGVkID0gdHJ1ZTtcblx0XHRcdFx0ZHJhZ2dpbmdDYXJkSWQgPSBjYXJkLmRhdGFzZXQuY2FyZElkID8/IG51bGw7XG5cdFx0XHRcdGNhcmQuY2xhc3NMaXN0LmFkZCgnZmstY2FyZC0tZHJhZ2dpbmcnKTtcblx0XHRcdH1cblx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBiZWxvdyA9IGFjdGl2ZURvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoZXYuY2xpZW50WCwgZXYuY2xpZW50WSk7XG5cdFx0XHRjb25zdCBjb2wgPSBiZWxvdz8uY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1jb2x1bW4nKSA/PyBudWxsO1xuXHRcdFx0aWYgKGNvbCAhPT0gY3VycmVudENvbCkge1xuXHRcdFx0XHRjdXJyZW50Q29sPy5jbGFzc0xpc3QucmVtb3ZlKCdmay1jb2x1bW4tLWRyYWctb3ZlcicpO1xuXHRcdFx0XHRjdXJyZW50Q29sPy5xdWVyeVNlbGVjdG9yQWxsKCcuZmstZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcblx0XHRcdFx0Y3VycmVudENvbCA9IGNvbDtcblx0XHRcdFx0Y29sPy5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW4tLWRyYWctb3ZlcicpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNvbCkge1xuXHRcdFx0XHRpbnNlcnRCZWZvcmVJZCA9IGdldEluc2VydEJlZm9yZUlkKGV2LmNsaWVudFksIGNvbCk7XG5cdFx0XHRcdHVwZGF0ZURyb3BJbmRpY2F0b3IoY29sLCBpbnNlcnRCZWZvcmVJZCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGNvbnN0IG9uVXAgPSAoKSA9PiB7XG5cdFx0XHRhY3RpdmVEb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIG9uTW92ZSk7XG5cdFx0XHRhY3RpdmVEb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCBvblVwKTtcblx0XHRcdGlmICghZHJhZ1N0YXJ0ZWQpIHJldHVybjtcblx0XHRcdGNvbnN0IGNvbCA9IGN1cnJlbnRDb2w7XG5cdFx0XHRjbGVhckRyb3BTdGF0ZShib2FyZEVsKTtcblx0XHRcdGlmIChjb2wgJiYgZHJhZ2dpbmdDYXJkSWQpIHtcblx0XHRcdFx0Y29uc3QgdG9WYWx1ZSA9IGNvbC5kYXRhc2V0LmNvbHVtblZhbHVlID8/ICcnO1xuXHRcdFx0XHRjb25zdCBkcmFnZ2VkQ2FyZCA9IGJvYXJkLmNhcmRzLmZpbmQoYyA9PiBjLmlkID09PSBkcmFnZ2luZ0NhcmRJZCk7XG5cdFx0XHRcdGNvbnN0IGZyb21WYWx1ZSA9IGRyYWdnZWRDYXJkPy52YWx1ZXNbYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zXSA/PyAnJztcblx0XHRcdFx0aWYgKGZyb21WYWx1ZSA9PT0gdG9WYWx1ZSB8fCBpc1RyYW5zaXRpb25BbGxvd2VkKHdvcmtmbG93TWFwLCBmcm9tVmFsdWUsIHRvVmFsdWUpKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2gocmVvcmRlckNhcmQoYm9hcmQsIGRyYWdnaW5nQ2FyZElkLCB0b1ZhbHVlLCBpbnNlcnRCZWZvcmVJZCkpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyb21WYWx1ZSAhPT0gdG9WYWx1ZSkge1xuXHRcdFx0XHRcdHNob3dUcmFuc2l0aW9uQmxvY2tlZFRvYXN0KGZyb21WYWx1ZSwgdG9WYWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGRyYWdnaW5nQ2FyZElkID0gbnVsbDtcblx0XHRcdGN1cnJlbnRDb2wgPSBudWxsO1xuXHRcdFx0aW5zZXJ0QmVmb3JlSWQgPSBudWxsO1xuXHRcdH07XG5cblx0XHRhY3RpdmVEb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIG9uTW92ZSk7XG5cdFx0YWN0aXZlRG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgb25VcCk7XG5cdH0pO1xufVxuIiwgImltcG9ydCB0eXBlIHsgVmF1bHQsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgeyBCb2FyZCB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHNlcmlhbGl6ZUJvYXJkIH0gZnJvbSAnLi4vZGF0YS9zZXJpYWxpemVyJztcblxuZXhwb3J0IHR5cGUgQmxvY2tMb2NhdGlvbiA9IHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZUJsb2NrKGZpbGVDb250ZW50OiBzdHJpbmcsIGJsb2NrSW5kZXg6IG51bWJlcik6IEJsb2NrTG9jYXRpb24gfCBudWxsIHtcblx0Y29uc3QgcmVnZXggPSAvXmBgYGZhbmN5LWthbmJhbiRbXFxzXFxTXSo/XmBgYCQvZ207XG5cdGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcblx0bGV0IGNvdW50ID0gMDtcblxuXHR3aGlsZSAoKG1hdGNoID0gcmVnZXguZXhlYyhmaWxlQ29udGVudCkpICE9PSBudWxsKSB7XG5cdFx0aWYgKGNvdW50ID09PSBibG9ja0luZGV4KSB7XG5cdFx0XHRyZXR1cm4geyBzdGFydDogbWF0Y2guaW5kZXgsIGVuZDogbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGggfTtcblx0XHR9XG5cdFx0Y291bnQrKztcblx0fVxuXG5cdHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hCbG9jayhcblx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcblx0c3RhcnQ6IG51bWJlcixcblx0ZW5kOiBudW1iZXIsXG5cdG5ld0Jsb2NrVGV4dDogc3RyaW5nLFxuKTogc3RyaW5nIHtcblx0cmV0dXJuIGZpbGVDb250ZW50LnNsaWNlKDAsIHN0YXJ0KSArIG5ld0Jsb2NrVGV4dCArIGZpbGVDb250ZW50LnNsaWNlKGVuZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlQmFjayhcblx0dmF1bHQ6IFZhdWx0LFxuXHRmaWxlOiBURmlsZSxcblx0YmxvY2tJbmRleDogbnVtYmVyLFxuXHRib2FyZDogQm9hcmQsXG4pOiBQcm9taXNlPHZvaWQ+IHtcblx0Y29uc3QgbmV3QmxvY2tUZXh0ID0gJ2BgYGZhbmN5LWthbmJhblxcbicgKyBzZXJpYWxpemVCb2FyZChib2FyZCkgKyAnXFxuYGBgJztcblxuXHRhd2FpdCB2YXVsdC5wcm9jZXNzKGZpbGUsIChjb250ZW50KSA9PiB7XG5cdFx0Y29uc3QgbG9jYXRpb24gPSBsb2NhdGVCbG9jayhjb250ZW50LCBibG9ja0luZGV4KTtcblx0XHRpZiAoIWxvY2F0aW9uKSByZXR1cm4gY29udGVudDtcblx0XHRyZXR1cm4gcGF0Y2hCbG9jayhjb250ZW50LCBsb2NhdGlvbi5zdGFydCwgbG9jYXRpb24uZW5kLCBuZXdCbG9ja1RleHQpO1xuXHR9KTtcbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IHBhcnNlQmxvY2sgfSBmcm9tICcuLi9kYXRhL3BhcnNlcic7XG5pbXBvcnQgeyBsb2NhdGVCbG9jayB9IGZyb20gJy4vd3JpdGUtYmFjayc7XG5pbXBvcnQgd3JpdGVCYWNrIGZyb20gJy4vd3JpdGUtYmFjayc7XG5pbXBvcnQgeyBtb3VudEJvYXJkIH0gZnJvbSAnLi4vcmVuZGVyL21vdW50JztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9GQU5DWV9LQU5CQU4gPSAnZmFuY3kta2FuYmFuLXZpZXcnO1xuXG5leHBvcnQgY29uc3QgQk9BUkRfVEVNUExBVEUgPSBgXFxgXFxgXFxgZmFuY3kta2FuYmFuXG4tLS1cbnRpdGxlOiBOZXcgQm9hcmRcbmZpZWxkczpcbiAgLSBuYW1lOiB0aXRsZSwgdHlwZTogVGV4dCwgbGFiZWw6IFRpdGxlXG4gIC0gbmFtZTogc3RhdHVzLCB0eXBlOiBTZWxlY3QsIG9wdGlvbnM6IHRvZG98ZG9pbmd8ZG9uZSwgbGFiZWw6IFN0YXR1cywgZGVmYXVsdDogdG9kb1xuLS0tXG5cbnwgX2lkIHwgVGl0bGUgfCBTdGF0dXMgfFxufC0tLS0tfC0tLS0tLS18LS0tLS0tLS18XG5cXGBcXGBcXGBgO1xuXG5leHBvcnQgY2xhc3MgRmFuY3lLYW5iYW5WaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuXHRwcml2YXRlIGJvYXJkVGl0bGUgPSAnRmFuY3kgS2FuYmFuJztcblxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XG5cdFx0c3VwZXIobGVhZik7XG5cdH1cblxuXHRnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuXHRcdHJldHVybiBWSUVXX1RZUEVfRkFOQ1lfS0FOQkFOO1xuXHR9XG5cblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5ib2FyZFRpdGxlO1xuXHR9XG5cblx0Z2V0SWNvbigpOiBzdHJpbmcge1xuXHRcdHJldHVybiAnbGF5b3V0LWthbmJhbic7XG5cdH1cblxuXHRhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XG5cblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblx0XHRpZiAoIWZpbGUpIHtcblx0XHRcdGNvbnN0IGVyciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgY2xzOiAnZmstZXJyb3InIH0pO1xuXHRcdFx0ZXJyLnRleHRDb250ZW50ID0gJ05vIGZpbGUgaXMgb3Blbi4nO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuXHRcdGNvbnN0IGxvY2F0aW9uID0gbG9jYXRlQmxvY2soY29udGVudCwgMCk7XG5cdFx0aWYgKCFsb2NhdGlvbikge1xuXHRcdFx0Y29uc3QgZXJyID0gY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyBjbHM6ICdmay1lcnJvcicgfSk7XG5cdFx0XHRlcnIudGV4dENvbnRlbnQgPSAnTm8gZmFuY3kta2FuYmFuIGJsb2NrIGZvdW5kIGluIHRoaXMgZmlsZS4nO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJsb2NrVGV4dCA9IGNvbnRlbnQuc2xpY2UobG9jYXRpb24uc3RhcnQsIGxvY2F0aW9uLmVuZCk7XG5cdFx0Y29uc3QgaW5uZXIgPSBibG9ja1RleHQucmVwbGFjZSgvXmBgYGZhbmN5LWthbmJhblxcbi8sICcnKS5yZXBsYWNlKC9cXG5gYGAkLywgJycpO1xuXHRcdGNvbnN0IHJlc3VsdCA9IHBhcnNlQmxvY2soaW5uZXIpO1xuXG5cdFx0aWYgKCFyZXN1bHQub2spIHtcblx0XHRcdGNvbnN0IGVyciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgY2xzOiAnZmstZXJyb3InIH0pO1xuXHRcdFx0ZXJyLnRleHRDb250ZW50ID0gcmVzdWx0LmVycm9ycy5tYXAoZSA9PiBlLm1lc3NhZ2UpLmpvaW4oJzsgJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5ib2FyZFRpdGxlID0gcmVzdWx0LmJvYXJkLnRpdGxlO1xuXHRcdGNvbnN0IHNhdmUgPSAoYm9hcmQ6IHR5cGVvZiByZXN1bHQuYm9hcmQpID0+IHdyaXRlQmFjayh0aGlzLmFwcC52YXVsdCwgZmlsZSwgMCwgYm9hcmQpO1xuXHRcdG1vdW50Qm9hcmQoY29udGVudEVsLCByZXN1bHQuYm9hcmQsIHNhdmUsIHRoaXMuYXBwKTtcblx0fVxuXG5cdGFzeW5jIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblx0fVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBdUM7OztBQ0N2QyxJQUFBQyxtQkFBc0I7OztBQ3NCZixJQUFNLG9CQUFvQjs7O0FDdkIxQixJQUFNLDBCQUEwQjtBQU9oQyxJQUFNLHlCQUEwRDtBQUFBLEVBQ3RFLE1BQU0sRUFBRSxhQUFhLFFBQVEsVUFBVSxRQUFRO0FBQ2hEOzs7QUNKTyxTQUFTLFlBQVksWUFBaUU7QUFDNUYsUUFBTSxRQUFRLFdBQVcsTUFBTSxJQUFJO0FBQ25DLE1BQUksUUFBUTtBQUNaLE1BQUksY0FBYztBQUNsQixNQUFJO0FBQ0osTUFBSTtBQUNKLE1BQUk7QUFDSixNQUFJO0FBQ0osTUFBSSxVQUFVO0FBQ2QsUUFBTSxTQUE0QixDQUFDO0FBQ25DLFFBQU0sV0FBNEIsQ0FBQztBQUNuQyxNQUFJLFdBQVc7QUFFZixhQUFXLFFBQVEsT0FBTztBQUN6QixVQUFNLFVBQVUsS0FBSyxLQUFLO0FBQzFCLFFBQUksQ0FBQyxRQUFTO0FBRWQsUUFBSSxZQUFZLFFBQVEsV0FBVyxJQUFJLEdBQUc7QUFD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QUssU0FBUztBQUFBLElBQy9CLENBQUM7QUFFRCxTQUFLLFdBQVc7QUFBQSxNQUNmLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLGdCQUFnQixDQUFDLFdBQVc7QUFDM0IsY0FBTSxXQUFXLG9CQUFvQjtBQUFBLFVBQ3BDLE9BQU87QUFBQSxVQUNQLFFBQVE7QUFBQSxZQUNQLEVBQUUsTUFBTSxTQUFTLE1BQU0sUUFBUSxPQUFPLFFBQVE7QUFBQSxZQUM5QyxFQUFFLE1BQU0sVUFBVSxNQUFNLFVBQVUsT0FBTyxVQUFVLFNBQVMsQ0FBQyxRQUFRLFNBQVMsTUFBTSxHQUFHLFNBQVMsT0FBTztBQUFBLFVBQ3hHO0FBQUEsVUFDQSxZQUFZLEVBQUUsU0FBUyxTQUFTO0FBQUEsVUFDaEMsYUFBYTtBQUFBLFVBQ2IsU0FBUztBQUFBLFVBQ1QsT0FBTyxDQUFDO0FBQUEsUUFDVCxDQUFDO0FBQ0QsZUFBTyxhQUFhLFVBQVUsT0FBTyxVQUFVLENBQUM7QUFBQSxNQUNqRDtBQUFBLElBQ0QsQ0FBQztBQUFBLEVBQ0Y7QUFBQSxFQUVBLFdBQVc7QUFBQSxFQUVYO0FBQUEsRUFFUSxXQUFpQjtBQUN4QixRQUFJLGlCQUFpQixLQUFLLEtBQUssTUFBTSxDQUFDLFdBQVc7QUFDaEQsWUFBTSxXQUFXLE9BQU8sTUFBTSxLQUFLLEtBQUs7QUFDeEMsVUFBSSxXQUFXLEdBQUcsUUFBUTtBQUMxQixVQUFJLFVBQVU7QUFDZCxhQUFPLEtBQUssSUFBSSxNQUFNLHNCQUFzQixRQUFRLEdBQUc7QUFDdEQsbUJBQVcsR0FBRyxRQUFRLElBQUksT0FBTztBQUNqQztBQUFBLE1BQ0Q7QUFDQSxZQUFNLFVBQVUsb0JBQW9CLEVBQUUsR0FBRyxRQUFRLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFDNUQsV0FBSyxLQUFLLElBQUksTUFBTSxPQUFPLFVBQVUsT0FBTyxFQUFFLEtBQUssQ0FBQyxTQUFTO0FBQzVELFlBQUksZ0JBQWdCLHdCQUFPO0FBQzFCLGVBQUssS0FBSyxJQUFJLFVBQVUsUUFBUSxJQUFJLEVBQUUsU0FBUyxJQUFJO0FBQUEsUUFDcEQ7QUFBQSxNQUNELENBQUM7QUFBQSxJQUNGLENBQUMsRUFBRSxLQUFLO0FBQUEsRUFDVDtBQUNEOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJmIiwgIl9hIiwgImJvYXJkV3JhcHBlciIsICJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
