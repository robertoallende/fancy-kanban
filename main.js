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
var SUPPORTED_VERSION = 1;

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
    else if (key === "fields") inFields = true;
  }
  return {
    title,
    fields,
    rawWorkflow,
    version,
    viewConfig: { columns: "status", lanes },
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

// src/render/card.ts
function renderCard(card, fields) {
  var _a, _b;
  const container = activeDocument.createElement("div");
  container.classList.add("fk-card");
  container.classList.add("fk-card--draggable");
  container.dataset.cardId = card.id;
  const titleField = fields.find((f) => f.name !== "_id");
  const title = activeDocument.createElement("div");
  title.classList.add("fk-card__title");
  title.textContent = (_b = card.values[(_a = titleField == null ? void 0 : titleField.name) != null ? _a : ""]) != null ? _b : "";
  container.appendChild(title);
  return container;
}

// src/render/column.ts
function renderColumn(name, label, cards, fields) {
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
    cardsContainer.appendChild(renderCard(card, fields));
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
      columnsContainer.appendChild(renderColumn(option, capitalise(option), cards, board.fields));
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
  const lines = [];
  lines.push(`version: 1`);
  lines.push(`title: ${board.title}`);
  lines.push("fields:");
  for (const field of board.fields) {
    let line = `  - name: ${field.name}, type: ${field.type}, label: ${field.label}`;
    if (field.options !== void 0) line += `, options: ${field.options.join("|")}`;
    if (field.default !== void 0) line += `, default: ${field.default}`;
    lines.push(line);
  }
  if (board.viewConfig.lanes) lines.push(`lanes: ${board.viewConfig.lanes}`);
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
var CardModal = class extends import_obsidian.Modal {
  constructor(app, board, card, columnValue, onConfirm, onDelete) {
    super(app);
    this.board = board;
    this.card = card;
    this.columnValue = columnValue;
    this.onConfirm = onConfirm;
    this.onDelete = onDelete;
    this.values = {};
  }
  onOpen() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.textContent = this.card ? "Edit card" : "Add card";
    const columnField = this.board.viewConfig.columns;
    const editableFields = this.board.fields.filter(
      (f) => f.name !== "_id" && f.name !== columnField
    );
    for (const field of editableFields) {
      this.renderField(contentEl, field);
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
  renderField(container, field) {
    var _a, _b;
    const initialValue = this.card ? (_a = this.card.values[field.name]) != null ? _a : "" : (_b = field.default) != null ? _b : "";
    this.values[field.name] = initialValue;
    const wrapper = activeDocument.createElement("div");
    wrapper.classList.add("fk-modal-field");
    const label = activeDocument.createElement("label");
    label.textContent = field.label;
    wrapper.appendChild(label);
    const onChange = (value) => {
      this.values[field.name] = value;
    };
    if (field.type === "Select" && field.options) {
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
    const optionsInp = this.fixedInput(row, "a, b, c", ((_a = field.options) != null ? _a : []).join(", "), "fk-col-options");
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
function mountBoard(el, board, save, app) {
  while (el.firstChild) el.removeChild(el.firstChild);
  const dispatch = (newBoard) => {
    void save(newBoard).then(() => mountBoard(el, newBoard, save, app));
  };
  const boardEl = renderBoard(board);
  attachDragDrop(boardEl, board, dispatch);
  attachCardActions(boardEl, board, dispatch, app);
  el.appendChild(boardEl);
}
function attachCardActions(boardEl, board, dispatch, app) {
  boardEl.addEventListener("click", (e) => {
    var _a, _b, _c, _d, _e;
    const target = e.target;
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
      const columnValue = (_a = col == null ? void 0 : col.dataset.columnValue) != null ? _a : "";
      if (app) {
        new CardModal(app, board, null, columnValue, (values) => {
          dispatch(createCard(board, columnValue, values));
        }).open();
      } else {
        dispatch(createCard(board, columnValue, {}));
      }
      return;
    }
    const cardEl = target.closest(".fk-card");
    if (cardEl) {
      const cardId = (_b = cardEl.dataset.cardId) != null ? _b : "";
      const card = (_c = board.cards.find((c) => c.id === cardId)) != null ? _c : null;
      const columnValue = (_e = (_d = cardEl.closest(".fk-column")) == null ? void 0 : _d.dataset.columnValue) != null ? _e : "";
      if (app && card) {
        new CardModal(app, board, card, columnValue, (values) => {
          dispatch(updateCard(board, cardId, values));
        }, () => {
          dispatch(deleteCard(board, cardId));
        }).open();
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
      mountBoard(boardWrapper2, result.board, () => Promise.resolve(), plugin.app);
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
    mountBoard(boardWrapper, result.board, save, plugin.app);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJzcmMvaW50ZWdyYXRpb24vcG9zdHByb2Nlc3Nvci50cyIsICJzcmMvbW9kZWwvYm9hcmQudHMiLCAic3JjL2RhdGEvZGVwcmVjYXRpb25zLnRzIiwgInNyYy9kYXRhL3NjaGVtYS50cyIsICJzcmMvZGF0YS9wYXJzZXIudHMiLCAic3JjL3JlbmRlci9jYXJkLnRzIiwgInNyYy9yZW5kZXIvY29sdW1uLnRzIiwgInNyYy9yZW5kZXIvYm9hcmQudHMiLCAic3JjL2RhdGEvc2VyaWFsaXplci50cyIsICJzcmMvbW9kZWwvbXV0YXRpb25zLnRzIiwgInNyYy9kYXRhL3dvcmtmbG93LnRzIiwgInNyYy9yZW5kZXIvY2FyZC1tb2RhbC50cyIsICJzcmMvcmVuZGVyL2JvYXJkLWNvbmZpZy1tb2RhbC50cyIsICJzcmMvcmVuZGVyL21vdW50LnRzIiwgInNyYy9pbnRlZ3JhdGlvbi93cml0ZS1iYWNrLnRzIiwgInNyYy9pbnRlZ3JhdGlvbi9zdGFuZGFsb25lLXZpZXcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGFkZEljb24sIFBsdWdpbiwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyByZWdpc3RlclBvc3RQcm9jZXNzb3IgfSBmcm9tICcuL3NyYy9pbnRlZ3JhdGlvbi9wb3N0cHJvY2Vzc29yJztcbmltcG9ydCB7IEZhbmN5S2FuYmFuVmlldywgVklFV19UWVBFX0ZBTkNZX0tBTkJBTiB9IGZyb20gJy4vc3JjL2ludGVncmF0aW9uL3N0YW5kYWxvbmUtdmlldyc7XG5pbXBvcnQgeyBCb2FyZENvbmZpZ01vZGFsIH0gZnJvbSAnLi9zcmMvcmVuZGVyL2JvYXJkLWNvbmZpZy1tb2RhbCc7XG5pbXBvcnQgeyBzZXJpYWxpemVCb2FyZEJsb2NrIH0gZnJvbSAnLi9zcmMvZGF0YS9zZXJpYWxpemVyJztcblxuY29uc3QgRkFOQ1lfS0FOQkFOX0lDT04gPSAnZmFuY3kta2FuYmFuLWljb24nO1xuXG5mdW5jdGlvbiByZWdpc3Rlckljb24oKTogdm9pZCB7XG5cdGFkZEljb24oRkFOQ1lfS0FOQkFOX0lDT04sIGA8ZyB0cmFuc2Zvcm09XCJzY2FsZSg0LjE2NjcpXCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjQ0XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCI+XG48cGF0aCBkPVwiTTguMiAxMUg1LjhDNS4zNTgxNyAxMSA1IDExLjI5ODUgNSAxMS42NjY3VjIyLjMzMzNDNSAyMi43MDE1IDUuMzU4MTcgMjMgNS44IDIzSDguMkM4LjY0MTgzIDIzIDkgMjIuNzAxNSA5IDIyLjMzMzNWMTEuNjY2N0M5IDExLjI5ODUgOC42NDE4MyAxMSA4LjIgMTFaXCIvPlxuPHBhdGggZD1cIk0xMy4yIDExSDEwLjhDMTAuMzU4MiAxMSAxMCAxMS4yOTg1IDEwIDExLjY2NjdWMTguMzMzM0MxMCAxOC43MDE1IDEwLjM1ODIgMTkgMTAuOCAxOUgxMy4yQzEzLjY0MTggMTkgMTQgMTguNzAxNSAxNCAxOC4zMzMzVjExLjY2NjdDMTQgMTEuMjk4NSAxMy42NDE4IDExIDEzLjIgMTFaXCIvPlxuPHBhdGggZD1cIk0xOC4yIDExSDE1LjhDMTUuMzU4MiAxMSAxNSAxMS4yNjg2IDE1IDExLjZWMTkuNEMxNSAxOS43MzE0IDE1LjM1ODIgMjAgMTUuOCAyMEgxOC4yQzE4LjY0MTggMjAgMTkgMTkuNzMxNCAxOSAxOS40VjExLjZDMTkgMTEuMjY4NiAxOC42NDE4IDExIDE4LjIgMTFaXCIvPlxuPHBhdGggZD1cIk0xOC4zMDAxIDguMjAwNkwxNi40MDExIDIuMjA5MjlDMTYuMzE3OSAxLjk3MDAyIDE2LjE4NTMgMS43NTA5OCAxNi4wMTE3IDEuNTY2NTFDMTUuODM4MSAxLjM4MjAzIDE1LjYyNzUgMS4yMzYyNyAxNS4zOTM4IDEuMTM4NzVDMTUuMTYgMS4wNDEyMyAxNC45MDgyIDAuOTk0MTQ1IDE0LjY1NSAxLjAwMDU4QzE0LjQwMTggMS4wMDcwMiAxNC4xNTI4IDEuMDY2ODIgMTMuOTI0MyAxLjE3NjA5TDEyLjc3NTkgMS43MjUwOUMxMi41MzM2IDEuODQwNzEgMTIuMjY4NSAxLjkwMDY4IDEyLjAwMDEgMS45MDA1OUg4Ljg1MDA3QzguNDU3OTggMS45MDA1MiA4LjA3NjU5IDIuMDI4NDYgNy43NjM4NyAyLjI2NDk5QzcuNDUxMTUgMi41MDE1MiA3LjIyNDIyIDIuODMzNjkgNy4xMTc1NyAzLjIxMDk5TDUuNzAwMDcgOC4yMDA2XCIvPlxuPHBhdGggZD1cIk0zIDguMjAwNDRIMjFcIi8+XG48L2c+YCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZhbmN5S2FuYmFuUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcblx0YXN5bmMgb25sb2FkKCkge1xuXHRcdHJlZ2lzdGVySWNvbigpO1xuXHRcdHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRV9GQU5DWV9LQU5CQU4sIChsZWFmKSA9PiBuZXcgRmFuY3lLYW5iYW5WaWV3KGxlYWYpKTtcblxuXHRcdHJlZ2lzdGVyUG9zdFByb2Nlc3Nvcih0aGlzKTtcblxuXHRcdHRoaXMuYWRkUmliYm9uSWNvbihGQU5DWV9LQU5CQU5fSUNPTiwgJ05ldyBGYW5jeSBLYW5iYW4gYm9hcmQnLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm5ld0JvYXJkKCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZENvbW1hbmQoe1xuXHRcdFx0aWQ6ICduZXctYm9hcmQnLFxuXHRcdFx0bmFtZTogJ05ldyBib2FyZCcsXG5cdFx0XHRjYWxsYmFjazogKCkgPT4gdGhpcy5uZXdCb2FyZCgpLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcblx0XHRcdGlkOiAnaW5zZXJ0LWJvYXJkJyxcblx0XHRcdG5hbWU6ICdJbnNlcnQgYm9hcmQnLFxuXHRcdFx0ZWRpdG9yQ2FsbGJhY2s6IChlZGl0b3IpID0+IHtcblx0XHRcdFx0Y29uc3QgdGVtcGxhdGUgPSBzZXJpYWxpemVCb2FyZEJsb2NrKHtcblx0XHRcdFx0XHR0aXRsZTogJ05ldyBCb2FyZCcsXG5cdFx0XHRcdFx0ZmllbGRzOiBbXG5cdFx0XHRcdFx0XHR7IG5hbWU6ICd0aXRsZScsIHR5cGU6ICdUZXh0JywgbGFiZWw6ICdUaXRsZScgfSxcblx0XHRcdFx0XHRcdHsgbmFtZTogJ3N0YXR1cycsIHR5cGU6ICdTZWxlY3QnLCBsYWJlbDogJ1N0YXR1cycsIG9wdGlvbnM6IFsndG9kbycsICdkb2luZycsICdkb25lJ10sIGRlZmF1bHQ6ICd0b2RvJyB9LFxuXHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0dmlld0NvbmZpZzogeyBjb2x1bW5zOiAnc3RhdHVzJyB9LFxuXHRcdFx0XHRcdHJhd1dvcmtmbG93OiAnJyxcblx0XHRcdFx0XHR2ZXJzaW9uOiAxLFxuXHRcdFx0XHRcdGNhcmRzOiBbXSxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2UodGVtcGxhdGUsIGVkaXRvci5nZXRDdXJzb3IoKSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG5cblx0b251bmxvYWQoKSB7XG5cdFx0Ly8gaW50ZW50aW9uYWxseSBlbXB0eSBcdTIwMTQgT2JzaWRpYW4gaGFuZGxlcyBsZWFmIGNsZWFudXBcblx0fVxuXG5cdHByaXZhdGUgbmV3Qm9hcmQoKTogdm9pZCB7XG5cdFx0bmV3IEJvYXJkQ29uZmlnTW9kYWwodGhpcy5hcHAsIG51bGwsIChzY2hlbWEpID0+IHtcblx0XHRcdGNvbnN0IGJhc2VOYW1lID0gc2NoZW1hLnRpdGxlLnRyaW0oKSB8fCAnTmV3IEJvYXJkJztcblx0XHRcdGxldCBmaWxlTmFtZSA9IGAke2Jhc2VOYW1lfS5tZGA7XG5cdFx0XHRsZXQgY291bnRlciA9IDI7XG5cdFx0XHR3aGlsZSAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVOYW1lKSkge1xuXHRcdFx0XHRmaWxlTmFtZSA9IGAke2Jhc2VOYW1lfSAke2NvdW50ZXJ9Lm1kYDtcblx0XHRcdFx0Y291bnRlcisrO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgY29udGVudCA9IHNlcmlhbGl6ZUJvYXJkQmxvY2soeyAuLi5zY2hlbWEsIGNhcmRzOiBbXSB9KTtcblx0XHRcdHZvaWQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGZpbGVOYW1lLCBjb250ZW50KS50aGVuKChmaWxlKSA9PiB7XG5cdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcblx0XHRcdFx0XHR2b2lkIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGZpbGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KS5vcGVuKCk7XG5cdH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IFBsdWdpbiwgTWFya2Rvd25Qb3N0UHJvY2Vzc29yQ29udGV4dCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgcGFyc2VCbG9jayB9IGZyb20gJy4uL2RhdGEvcGFyc2VyJztcbmltcG9ydCB0eXBlIHsgUGFyc2VJc3N1ZSB9IGZyb20gJy4uL2RhdGEvcGFyc2VyJztcbmltcG9ydCB7IG1vdW50Qm9hcmQgfSBmcm9tICcuLi9yZW5kZXIvbW91bnQnO1xuaW1wb3J0IHdyaXRlQmFjayBmcm9tICcuL3dyaXRlLWJhY2snO1xuXG5leHBvcnQgZnVuY3Rpb24gYmxvY2tJbmRleEZyb21Db250ZXh0KGN0eDogTWFya2Rvd25Qb3N0UHJvY2Vzc29yQ29udGV4dCwgZWw6IEhUTUxFbGVtZW50KTogbnVtYmVyIHtcblx0Y29uc3QgaW5mbyA9IGN0eC5nZXRTZWN0aW9uSW5mbyhlbCk7XG5cdGlmICghaW5mbykgcmV0dXJuIDA7XG5cdGNvbnN0IGxpbmVzID0gaW5mby50ZXh0LnNwbGl0KCdcXG4nKTtcblx0bGV0IGNvdW50ID0gMDtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbmZvLmxpbmVTdGFydDsgaSsrKSB7XG5cdFx0aWYgKGxpbmVzW2ldLnRyaW1FbmQoKSA9PT0gJ2BgYGZhbmN5LWthbmJhbicpIGNvdW50Kys7XG5cdH1cblx0cmV0dXJuIGNvdW50O1xufVxuXG5mdW5jdGlvbiByZW5kZXJFcnJvclBhbmVsKFxuXHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxuXHRlcnJvcnM6IFBhcnNlSXNzdWVbXSxcblx0c291cmNlOiBzdHJpbmcsXG5cdG9uR29Ub1NvdXJjZTogKCkgPT4gdm9pZCxcbik6IHZvaWQge1xuXHRjb25zdCBwYW5lbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRwYW5lbC5jbGFzc0xpc3QuYWRkKCdmay1lcnJvci1wYW5lbCcpO1xuXG5cdGZvciAoY29uc3QgZXJyIG9mIGVycm9ycykge1xuXHRcdGNvbnN0IG1zZyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRtc2cuY2xhc3NMaXN0LmFkZCgnZmstZXJyb3InKTtcblx0XHRtc2cudGV4dENvbnRlbnQgPSBlcnIubWVzc2FnZTtcblx0XHRpZiAoZXJyLmhpbnQpIHtcblx0XHRcdGNvbnN0IGhpbnQgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRoaW50LmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsX19oaW50Jyk7XG5cdFx0XHRoaW50LnRleHRDb250ZW50ID0gYCBcdTIwMTQgJHtlcnIuaGludH1gO1xuXHRcdFx0bXNnLmFwcGVuZENoaWxkKGhpbnQpO1xuXHRcdH1cblx0XHRwYW5lbC5hcHBlbmRDaGlsZChtc2cpO1xuXHR9XG5cblx0Y29uc3QgcHJlID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncHJlJyk7XG5cdHByZS5jbGFzc0xpc3QuYWRkKCdmay1lcnJvci1wYW5lbF9fc291cmNlJyk7XG5cdHByZS50ZXh0Q29udGVudCA9IHNvdXJjZTtcblx0cGFuZWwuYXBwZW5kQ2hpbGQocHJlKTtcblxuXHRjb25zdCBidG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0YnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsX19nb3RvJyk7XG5cdGJ0bi50ZXh0Q29udGVudCA9ICdHbyB0byBzb3VyY2UnO1xuXHRidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvbkdvVG9Tb3VyY2UpO1xuXHRwYW5lbC5hcHBlbmRDaGlsZChidG4pO1xuXG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZChwYW5lbCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcldhcm5pbmdCYW5uZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSk6IHZvaWQge1xuXHRjb25zdCBiYW5uZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0YmFubmVyLmNsYXNzTGlzdC5hZGQoJ2ZrLXdhcm5pbmctYmFubmVyJyk7XG5cblx0Y29uc3QgYm9keSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRib2R5LmNsYXNzTGlzdC5hZGQoJ2ZrLXdhcm5pbmctYmFubmVyX19ib2R5Jyk7XG5cdGZvciAoY29uc3QgdyBvZiB3YXJuaW5ncykge1xuXHRcdGNvbnN0IGl0ZW0gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0aXRlbS5jbGFzc0xpc3QuYWRkKCdmay13YXJuaW5nLWJhbm5lcl9faXRlbScpO1xuXHRcdGl0ZW0udGV4dENvbnRlbnQgPSB3Lm1lc3NhZ2U7XG5cdFx0Ym9keS5hcHBlbmRDaGlsZChpdGVtKTtcblx0fVxuXHRiYW5uZXIuYXBwZW5kQ2hpbGQoYm9keSk7XG5cblx0Y29uc3QgZGlzbWlzcyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRkaXNtaXNzLmNsYXNzTGlzdC5hZGQoJ2ZrLXdhcm5pbmctYmFubmVyX19kaXNtaXNzJyk7XG5cdGRpc21pc3MudGV4dENvbnRlbnQgPSAnXHUwMEQ3Jztcblx0ZGlzbWlzcy5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnRGlzbWlzcyB3YXJuaW5ncycpO1xuXHRkaXNtaXNzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gYmFubmVyLnJlbW92ZSgpKTtcblx0YmFubmVyLmFwcGVuZENoaWxkKGRpc21pc3MpO1xuXG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZChiYW5uZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJQb3N0UHJvY2Vzc29yKHBsdWdpbjogUGx1Z2luKTogdm9pZCB7XG5cdHBsdWdpbi5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKCdmYW5jeS1rYW5iYW4nLCAoc291cmNlLCBlbCwgY3R4KSA9PiB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VCbG9jayhzb3VyY2UpO1xuXHRcdGlmICghcmVzdWx0Lm9rKSB7XG5cdFx0XHRyZW5kZXJFcnJvclBhbmVsKGVsLCByZXN1bHQuZXJyb3JzLCBzb3VyY2UsICgpID0+IHtcblx0XHRcdFx0dm9pZCBwbHVnaW4uYXBwLndvcmtzcGFjZS5vcGVuTGlua1RleHQoY3R4LnNvdXJjZVBhdGgsICcnLCBmYWxzZSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBhYnN0cmFjdCA9IHBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGN0eC5zb3VyY2VQYXRoKTtcblx0XHRjb25zdCBmaWxlID0gYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSA/IGFic3RyYWN0IDogbnVsbDtcblxuXHRcdGlmICghZmlsZSkge1xuXHRcdFx0aWYgKHJlc3VsdC53YXJuaW5ncy5sZW5ndGggPiAwKSByZW5kZXJXYXJuaW5nQmFubmVyKGVsLCByZXN1bHQud2FybmluZ3MpO1xuXHRcdFx0Y29uc3QgYm9hcmRXcmFwcGVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRlbC5hcHBlbmRDaGlsZChib2FyZFdyYXBwZXIpO1xuXHRcdFx0bW91bnRCb2FyZChib2FyZFdyYXBwZXIsIHJlc3VsdC5ib2FyZCwgKCkgPT4gUHJvbWlzZS5yZXNvbHZlKCksIHBsdWdpbi5hcHApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHQucmVhZG9ubHkpIHtcblx0XHRcdGNvbnN0IGJhbm5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRcdGJhbm5lci5jbGFzc0xpc3QuYWRkKCdmay1iYW5uZXInLCAnZmstYmFubmVyLS13YXJuaW5nJyk7XG5cdFx0XHRiYW5uZXIudGV4dENvbnRlbnQgPSByZXN1bHQucmVhZG9ubHlSZWFzb24gPz8gJyc7XG5cdFx0XHRlbC5hcHBlbmRDaGlsZChiYW5uZXIpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHQud2FybmluZ3MubGVuZ3RoID4gMCkgcmVuZGVyV2FybmluZ0Jhbm5lcihlbCwgcmVzdWx0Lndhcm5pbmdzKTtcblxuXHRcdGNvbnN0IGJvYXJkV3JhcHBlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGVsLmFwcGVuZENoaWxkKGJvYXJkV3JhcHBlcik7XG5cdFx0Y29uc3QgYmxvY2tJbmRleCA9IGJsb2NrSW5kZXhGcm9tQ29udGV4dChjdHgsIGVsKTtcblx0XHRjb25zdCBzYXZlID0gcmVzdWx0LnJlYWRvbmx5XG5cdFx0XHQ/ICgpID0+IFByb21pc2UucmVzb2x2ZSgpXG5cdFx0XHQ6IChiOiB0eXBlb2YgcmVzdWx0LmJvYXJkKSA9PiB3cml0ZUJhY2socGx1Z2luLmFwcC52YXVsdCwgZmlsZSwgYmxvY2tJbmRleCwgYik7XG5cblx0XHRtb3VudEJvYXJkKGJvYXJkV3JhcHBlciwgcmVzdWx0LmJvYXJkLCBzYXZlLCBwbHVnaW4uYXBwKTtcblx0fSk7XG59XG4iLCAiZXhwb3J0IHR5cGUgRmllbGRUeXBlID0gJ1RleHQnIHwgJ1RleHRhcmVhJyB8ICdEYXRlJyB8ICdOdW1iZXInIHwgJ1NlbGVjdCcgfCAnTGluayc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmllbGREZWZpbml0aW9uIHtcblx0bmFtZTogc3RyaW5nO1xuXHR0eXBlOiBGaWVsZFR5cGU7XG5cdGxhYmVsOiBzdHJpbmc7XG5cdG9wdGlvbnM/OiBzdHJpbmdbXTtcblx0ZGVmYXVsdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3Q29uZmlnIHtcblx0Y29sdW1uczogc3RyaW5nO1xuXHRsYW5lcz86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDYXJkIHtcblx0aWQ6IHN0cmluZztcblx0dmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgY29uc3QgU1VQUE9SVEVEX1ZFUlNJT04gPSAxO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvYXJkU2NoZW1hIHtcblx0dGl0bGU6IHN0cmluZztcblx0ZmllbGRzOiBGaWVsZERlZmluaXRpb25bXTtcblx0dmlld0NvbmZpZzogVmlld0NvbmZpZztcblx0cmF3V29ya2Zsb3c6IHN0cmluZztcblx0dmVyc2lvbjogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJvYXJkIGV4dGVuZHMgQm9hcmRTY2hlbWEge1xuXHRjYXJkczogQ2FyZFtdO1xufVxuIiwgImV4cG9ydCBjb25zdCBXX0ZJRUxEX1RZUEVfREVQUkVDQVRFRCA9ICdXX0ZJRUxEX1RZUEVfREVQUkVDQVRFRCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwcmVjYXRlZEVudHJ5IHtcblx0cmVwbGFjZW1lbnQ6IHN0cmluZztcblx0cmVtb3ZlQXQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IERFUFJFQ0FURURfRklFTERfVFlQRVM6IFJlY29yZDxzdHJpbmcsIERlcHJlY2F0ZWRFbnRyeT4gPSB7XG5cdEZpbGU6IHsgcmVwbGFjZW1lbnQ6ICdMaW5rJywgcmVtb3ZlQXQ6ICcwLjUuMCcgfSxcbn07XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZFNjaGVtYSwgQ2FyZCwgRmllbGREZWZpbml0aW9uLCBGaWVsZFR5cGUgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyBERVBSRUNBVEVEX0ZJRUxEX1RZUEVTLCBXX0ZJRUxEX1RZUEVfREVQUkVDQVRFRCB9IGZyb20gJy4vZGVwcmVjYXRpb25zJztcblxudHlwZSBDb25maWdXYXJuaW5nID0geyBjb2RlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgaGludD86IHN0cmluZyB9O1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb25maWcoY29uZmlnVGV4dDogc3RyaW5nKTogQm9hcmRTY2hlbWEgJiB7IHdhcm5pbmdzOiBDb25maWdXYXJuaW5nW10gfSB7XG5cdGNvbnN0IGxpbmVzID0gY29uZmlnVGV4dC5zcGxpdCgnXFxuJyk7XG5cdGxldCB0aXRsZSA9ICcnO1xuXHRsZXQgcmF3V29ya2Zsb3cgPSAnJztcblx0bGV0IGxhbmVzOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cdGxldCB2ZXJzaW9uID0gMTtcblx0Y29uc3QgZmllbGRzOiBGaWVsZERlZmluaXRpb25bXSA9IFtdO1xuXHRjb25zdCB3YXJuaW5nczogQ29uZmlnV2FybmluZ1tdID0gW107XG5cdGxldCBpbkZpZWxkcyA9IGZhbHNlO1xuXG5cdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuXHRcdGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcblx0XHRpZiAoIXRyaW1tZWQpIGNvbnRpbnVlO1xuXG5cdFx0aWYgKGluRmllbGRzICYmIHRyaW1tZWQuc3RhcnRzV2l0aCgnLSAnKSkge1xuXHRcdFx0Y29uc3QgeyBmaWVsZCwgd2FybmluZyB9ID0gcGFyc2VGaWVsZExpbmUodHJpbW1lZC5zbGljZSgyKSk7XG5cdFx0XHRmaWVsZHMucHVzaChmaWVsZCk7XG5cdFx0XHRpZiAod2FybmluZykgd2FybmluZ3MucHVzaCh3YXJuaW5nKTtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdGluRmllbGRzID0gZmFsc2U7XG5cblx0XHRjb25zdCBjb2xvbklkeCA9IHRyaW1tZWQuaW5kZXhPZignOicpO1xuXHRcdGlmIChjb2xvbklkeCA9PT0gLTEpIGNvbnRpbnVlO1xuXG5cdFx0Y29uc3Qga2V5ID0gdHJpbW1lZC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpO1xuXHRcdGNvbnN0IHZhbHVlID0gdHJpbW1lZC5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKTtcblxuXHRcdGlmIChrZXkgPT09ICd0aXRsZScpIHRpdGxlID0gdmFsdWU7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAndmVyc2lvbicpIHZlcnNpb24gPSBwYXJzZUludCh2YWx1ZSwgMTApIHx8IDE7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAnd29ya2Zsb3cnKSByYXdXb3JrZmxvdyA9IHZhbHVlLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKTtcblx0XHRlbHNlIGlmIChrZXkgPT09ICdsYW5lcycpIGxhbmVzID0gdmFsdWU7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAnZmllbGRzJykgaW5GaWVsZHMgPSB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHR0aXRsZSxcblx0XHRmaWVsZHMsXG5cdFx0cmF3V29ya2Zsb3csXG5cdFx0dmVyc2lvbixcblx0XHR2aWV3Q29uZmlnOiB7IGNvbHVtbnM6ICdzdGF0dXMnLCBsYW5lcyB9LFxuXHRcdHdhcm5pbmdzLFxuXHR9O1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpZWxkTGluZShsaW5lOiBzdHJpbmcpOiB7IGZpZWxkOiBGaWVsZERlZmluaXRpb247IHdhcm5pbmc/OiBDb25maWdXYXJuaW5nIH0ge1xuXHRjb25zdCBrdnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblx0Y29uc3QgcGFydHMgPSBzcGxpdEZpZWxkUGFydHMobGluZSk7XG5cblx0Zm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XG5cdFx0Y29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKTtcblx0XHRpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZTtcblx0XHRjb25zdCBrZXkgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKCk7XG5cdFx0Y29uc3QgdmFsdWUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpO1xuXHRcdGlmIChrZXkpIGt2c1trZXldID0gdmFsdWU7XG5cdH1cblxuXHRpZiAoIWt2c1snbmFtZSddKSB0aHJvdyBuZXcgRXJyb3IoYEZpZWxkIGRlZmluaXRpb24gbWlzc2luZyAnbmFtZSc6ICR7bGluZX1gKTtcblx0aWYgKCFrdnNbJ3R5cGUnXSkgdGhyb3cgbmV3IEVycm9yKGBGaWVsZCBkZWZpbml0aW9uIG1pc3NpbmcgJ3R5cGUnOiAke2xpbmV9YCk7XG5cblx0Y29uc3QgcmF3VHlwZSA9IGt2c1sndHlwZSddO1xuXHRjb25zdCBkZXByZWNhdGlvbiA9IERFUFJFQ0FURURfRklFTERfVFlQRVNbcmF3VHlwZV07XG5cdGNvbnN0IHR5cGU6IEZpZWxkVHlwZSA9IGRlcHJlY2F0aW9uID8gKGRlcHJlY2F0aW9uLnJlcGxhY2VtZW50IGFzIEZpZWxkVHlwZSkgOiAocmF3VHlwZSBhcyBGaWVsZFR5cGUpO1xuXHRjb25zdCB3YXJuaW5nOiBDb25maWdXYXJuaW5nIHwgdW5kZWZpbmVkID0gZGVwcmVjYXRpb24gPyB7XG5cdFx0Y29kZTogV19GSUVMRF9UWVBFX0RFUFJFQ0FURUQsXG5cdFx0bWVzc2FnZTogYEZpZWxkIHR5cGUgJyR7cmF3VHlwZX0nIGlzIGRlcHJlY2F0ZWQsIHVzZSAnJHtkZXByZWNhdGlvbi5yZXBsYWNlbWVudH0nIGluc3RlYWQgKHdpbGwgYmUgcmVtb3ZlZCBpbiAke2RlcHJlY2F0aW9uLnJlbW92ZUF0fSlgLFxuXHRcdGhpbnQ6IGBSZXBsYWNlICd0eXBlOiAke3Jhd1R5cGV9JyB3aXRoICd0eXBlOiAke2RlcHJlY2F0aW9uLnJlcGxhY2VtZW50fScgaW4geW91ciBib2FyZCBjb25maWdgLFxuXHR9IDogdW5kZWZpbmVkO1xuXG5cdGNvbnN0IGZpZWxkOiBGaWVsZERlZmluaXRpb24gPSB7XG5cdFx0bmFtZToga3ZzWyduYW1lJ10sXG5cdFx0dHlwZSxcblx0XHRsYWJlbDoga3ZzWydsYWJlbCddID8/IGt2c1snbmFtZSddLFxuXHR9O1xuXG5cdGlmIChrdnNbJ29wdGlvbnMnXSAhPT0gdW5kZWZpbmVkKSBmaWVsZC5vcHRpb25zID0ga3ZzWydvcHRpb25zJ10uc3BsaXQoJ3wnKTtcblx0aWYgKGt2c1snZGVmYXVsdCddICE9PSB1bmRlZmluZWQpIGZpZWxkLmRlZmF1bHQgPSBrdnNbJ2RlZmF1bHQnXTtcblxuXHRyZXR1cm4geyBmaWVsZCwgd2FybmluZyB9O1xufVxuXG5mdW5jdGlvbiBzcGxpdEZpZWxkUGFydHMobGluZTogc3RyaW5nKTogc3RyaW5nW10ge1xuXHQvLyBTcGxpdCBvbiBjb21tYXMgYnV0IG5vdCB3aXRoaW4gdmFsdWVzIFx1MjAxNCBmaWVsZCB2YWx1ZXMgZG9uJ3QgY29udGFpbiBjb21tYXMgcGVyIHNwZWMsXG5cdC8vIHNvIGEgc2ltcGxlIHNwbGl0IGlzIHNhZmUgaGVyZS5cblx0cmV0dXJuIGxpbmUuc3BsaXQoJywnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29uY2lsZUNhcmRzKGZpZWxkczogRmllbGREZWZpbml0aW9uW10sIGNhcmRzOiBDYXJkW10pOiBDYXJkW10ge1xuXHRyZXR1cm4gY2FyZHMubWFwKGNhcmQgPT4ge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHsgLi4uY2FyZC52YWx1ZXMgfTtcblx0XHRmb3IgKGNvbnN0IGZpZWxkIG9mIGZpZWxkcykge1xuXHRcdFx0aWYgKCEoZmllbGQubmFtZSBpbiB2YWx1ZXMpKSB7XG5cdFx0XHRcdHZhbHVlc1tmaWVsZC5uYW1lXSA9IGZpZWxkLmRlZmF1bHQgPz8gJyc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7IC4uLmNhcmQsIHZhbHVlcyB9O1xuXHR9KTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkLCBGaWVsZERlZmluaXRpb24gfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyBTVVBQT1JURURfVkVSU0lPTiB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHBhcnNlQ29uZmlnLCByZWNvbmNpbGVDYXJkcyB9IGZyb20gJy4vc2NoZW1hJztcbmV4cG9ydCB7IFdfRklFTERfVFlQRV9ERVBSRUNBVEVEIH0gZnJvbSAnLi9kZXByZWNhdGlvbnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlSXNzdWUge1xuXHRjb2RlOiBzdHJpbmc7XG5cdG1lc3NhZ2U6IHN0cmluZztcblx0bGluZT86IG51bWJlcjtcblx0aGludD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IEVfTk9fREVMSU1JVEVSUyA9ICdFX05PX0RFTElNSVRFUlMnO1xuZXhwb3J0IGNvbnN0IEVfTk9fVElUTEUgPSAnRV9OT19USVRMRSc7XG5leHBvcnQgY29uc3QgRV9OT19TVEFUVVNfRklFTEQgPSAnRV9OT19TVEFUVVNfRklFTEQnO1xuZXhwb3J0IGNvbnN0IFdfUk9XX01BTEZPUk1FRCA9ICdXX1JPV19NQUxGT1JNRUQnO1xuXG5leHBvcnQgdHlwZSBQYXJzZVJlc3VsdCA9XG5cdHwgeyBvazogdHJ1ZTsgYm9hcmQ6IEJvYXJkOyByZWFkb25seTogYm9vbGVhbjsgcmVhZG9ubHlSZWFzb24/OiBzdHJpbmc7IHdhcm5pbmdzOiBQYXJzZUlzc3VlW10gfVxuXHR8IHsgb2s6IGZhbHNlOyBlcnJvcnM6IFBhcnNlSXNzdWVbXTsgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSB9O1xuXG4vLyBTcGxpdHMgYSBtYXJrZG93biB0YWJsZSByb3cgb24gdW5lc2NhcGVkIHBpcGVzIG9ubHkuXG4vLyBTdHJpcHMgdGhlIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHBpcGUgZGVsaW1pdGVycyBvZiB0aGUgcm93LlxuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0Um93KGxpbmU6IHN0cmluZyk6IHN0cmluZ1tdIHtcblx0Y29uc3QgY2VsbHM6IHN0cmluZ1tdID0gW107XG5cdGxldCBjdXJyZW50ID0gJyc7XG5cdGxldCBpID0gMDtcblxuXHQvLyBTa2lwIHRoZSBsZWFkaW5nICd8J1xuXHRpZiAobGluZVswXSA9PT0gJ3wnKSBpID0gMTtcblxuXHR3aGlsZSAoaSA8IGxpbmUubGVuZ3RoKSB7XG5cdFx0aWYgKGxpbmVbaV0gPT09ICdcXFxcJyAmJiAobGluZVtpICsgMV0gPT09ICd8JyB8fCBsaW5lW2kgKyAxXSA9PT0gJ1xcXFwnKSkge1xuXHRcdFx0Y3VycmVudCArPSBsaW5lW2ldICsgbGluZVtpICsgMV07XG5cdFx0XHRpICs9IDI7XG5cdFx0fSBlbHNlIGlmIChsaW5lW2ldID09PSAnfCcpIHtcblx0XHRcdGNlbGxzLnB1c2goY3VycmVudCk7XG5cdFx0XHRjdXJyZW50ID0gJyc7XG5cdFx0XHRpKys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN1cnJlbnQgKz0gbGluZVtpXTtcblx0XHRcdGkrKztcblx0XHR9XG5cdH1cblxuXHQvLyBUaGUgdHJhaWxpbmcgJ3wnIGNhdXNlcyBhbiBlbXB0eSBzdHJpbmcgYXQgdGhlIGVuZCBcdTIwMTQgZHJvcCBpdFxuXHRpZiAoY3VycmVudCAhPT0gJycpIGNlbGxzLnB1c2goY3VycmVudCk7XG5cblx0cmV0dXJuIGNlbGxzO1xufVxuXG4vLyBVbmVzY2FwZXMgYSBzaW5nbGUgY2VsbCB2YWx1ZTogPGJyPiBcdTIxOTIgbmV3bGluZSwgXFx8IFx1MjE5MiB8LCBcXFxcIFx1MjE5MiBcXC4gVHJpbXMgd2hpdGVzcGFjZS5cbmV4cG9ydCBmdW5jdGlvbiB1bmVzY2FwZUNlbGwoY2VsbDogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIGNlbGxcblx0XHQudHJpbSgpXG5cdFx0LnJlcGxhY2UoLzxiclxcLz8+L2dpLCAnXFxuJylcblx0XHQucmVwbGFjZSgvXFxcXFt8XS9nLCAnfCcpXG5cdFx0LnJlcGxhY2UoL1xcXFxcXFxcL2csICdcXFxcJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRhYmxlKHRhYmxlVGV4dDogc3RyaW5nLCBmaWVsZHM6IEZpZWxkRGVmaW5pdGlvbltdKTogeyBjYXJkczogQ2FyZFtdOyB3YXJuaW5nczogUGFyc2VJc3N1ZVtdIH0ge1xuXHRjb25zdCBsaW5lcyA9IHRhYmxlVGV4dC5zcGxpdCgnXFxuJykuZmlsdGVyKGwgPT4gbC50cmltKCkuc3RhcnRzV2l0aCgnfCcpKTtcblx0aWYgKGxpbmVzLmxlbmd0aCA8IDIpIHJldHVybiB7IGNhcmRzOiBbXSwgd2FybmluZ3M6IFtdIH07XG5cblx0Y29uc3QgaGVhZGVyQ2VsbHMgPSBzcGxpdFJvdyhsaW5lc1swXSkubWFwKGMgPT4gdW5lc2NhcGVDZWxsKGMpLnRvTG93ZXJDYXNlKCkpO1xuXHQvLyBsaW5lc1sxXSBpcyB0aGUgc2VwYXJhdG9yIHJvdyBcdTIwMTQgc2tpcCBpdFxuXHRjb25zdCBkYXRhTGluZXMgPSBsaW5lcy5zbGljZSgyKTtcblxuXHQvLyBCdWlsZCBsYWJlbCBcdTIxOTIgZmllbGQgbmFtZSBtYXAgKGNhc2UtaW5zZW5zaXRpdmUpXG5cdGNvbnN0IGxhYmVsVG9GaWVsZCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cdGZvciAoY29uc3QgZmllbGQgb2YgZmllbGRzKSB7XG5cdFx0bGFiZWxUb0ZpZWxkLnNldChmaWVsZC5sYWJlbC50b0xvd2VyQ2FzZSgpLCBmaWVsZC5uYW1lKTtcblx0fVxuXG5cdGNvbnN0IGNhcmRzOiBDYXJkW10gPSBbXTtcblx0Y29uc3Qgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSA9IFtdO1xuXG5cdGZvciAobGV0IHJvd0lkeCA9IDA7IHJvd0lkeCA8IGRhdGFMaW5lcy5sZW5ndGg7IHJvd0lkeCsrKSB7XG5cdFx0Y29uc3QgbGluZSA9IGRhdGFMaW5lc1tyb3dJZHhdO1xuXHRcdGNvbnN0IGNlbGxzID0gc3BsaXRSb3cobGluZSkubWFwKHVuZXNjYXBlQ2VsbCk7XG5cblx0XHRpZiAoY2VsbHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHR3YXJuaW5ncy5wdXNoKHtcblx0XHRcdFx0Y29kZTogV19ST1dfTUFMRk9STUVELFxuXHRcdFx0XHRtZXNzYWdlOiBgUm93ICR7cm93SWR4ICsgMX0gY291bGQgbm90IGJlIHBhcnNlZCBhbmQgd2FzIHNraXBwZWRgLFxuXHRcdFx0XHRsaW5lOiByb3dJZHggKyAxLFxuXHRcdFx0fSk7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRjb25zdCBpZCA9IGhlYWRlckNlbGxzWzBdID09PSAnX2lkJyA/IChjZWxsc1swXSA/PyAnJykgOiAnJztcblx0XHRjb25zdCBzdGFydElkeCA9IGhlYWRlckNlbGxzWzBdID09PSAnX2lkJyA/IDEgOiAwO1xuXG5cdFx0Y29uc3QgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cdFx0Zm9yIChsZXQgaSA9IHN0YXJ0SWR4OyBpIDwgaGVhZGVyQ2VsbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGNvbnN0IGxhYmVsID0gaGVhZGVyQ2VsbHNbaV07XG5cdFx0XHRjb25zdCBmaWVsZE5hbWUgPSBsYWJlbFRvRmllbGQuZ2V0KGxhYmVsKSA/PyBsYWJlbDtcblx0XHRcdHZhbHVlc1tmaWVsZE5hbWVdID0gY2VsbHNbaV0gPz8gJyc7XG5cdFx0fVxuXG5cdFx0Y2FyZHMucHVzaCh7IGlkLCB2YWx1ZXMgfSk7XG5cdH1cblxuXHRyZXR1cm4geyBjYXJkcywgd2FybmluZ3MgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQmxvY2soYmxvY2tUZXh0OiBzdHJpbmcpOiBQYXJzZVJlc3VsdCB7XG5cdHRyeSB7XG5cdFx0Y29uc3QgcGFydHMgPSBibG9ja1RleHQuc3BsaXQoL14tLS0kL20pO1xuXHRcdGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRvazogZmFsc2UsXG5cdFx0XHRcdGVycm9yczogW3sgY29kZTogRV9OT19ERUxJTUlURVJTLCBtZXNzYWdlOiAnQmxvY2sgbXVzdCBjb250YWluIHR3byAtLS0gZGVsaW1pdGVycyBzZXBhcmF0aW5nIGNvbmZpZyBmcm9tIHRhYmxlJyB9XSxcblx0XHRcdFx0d2FybmluZ3M6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCBjb25maWdUZXh0ID0gcGFydHNbMV0udHJpbSgpO1xuXHRcdGNvbnN0IHRhYmxlVGV4dCA9IHBhcnRzLnNsaWNlKDIpLmpvaW4oJy0tLScpO1xuXG5cdFx0Y29uc3QgeyB3YXJuaW5nczogY29uZmlnV2FybmluZ3MsIC4uLnNjaGVtYSB9ID0gcGFyc2VDb25maWcoY29uZmlnVGV4dCk7XG5cdFx0aWYgKCFzY2hlbWEudGl0bGUpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdG9rOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3JzOiBbeyBjb2RlOiBFX05PX1RJVExFLCBtZXNzYWdlOiAnQm9hcmQgY29uZmlnIGlzIG1pc3NpbmcgcmVxdWlyZWQgZmllbGQ6IHRpdGxlJyB9XSxcblx0XHRcdFx0d2FybmluZ3M6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCBjb2x1bW5zRmllbGQgPSBzY2hlbWEuZmllbGRzLmZpbmQoZiA9PiBmLm5hbWUgPT09IHNjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnMpO1xuXHRcdGlmICghY29sdW1uc0ZpZWxkKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRvazogZmFsc2UsXG5cdFx0XHRcdGVycm9yczogW3tcblx0XHRcdFx0XHRjb2RlOiBFX05PX1NUQVRVU19GSUVMRCxcblx0XHRcdFx0XHRtZXNzYWdlOiBgQ29sdW1ucyBmaWVsZCBcIiR7c2NoZW1hLnZpZXdDb25maWcuY29sdW1uc31cIiBpcyBub3QgZGVmaW5lZCBpbiBmaWVsZHNgLFxuXHRcdFx0XHRcdGhpbnQ6ICdBZGQgYSBmaWVsZCB3aXRoIHRoYXQgbmFtZSwgb3IgdXBkYXRlIHRoZSBjb2x1bW5zIHNldHRpbmcgdG8gbWF0Y2ggYW4gZXhpc3RpbmcgZmllbGQnLFxuXHRcdFx0XHR9XSxcblx0XHRcdFx0d2FybmluZ3M6IFtdLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRjb25zdCB7IGNhcmRzOiByYXdDYXJkcywgd2FybmluZ3M6IHRhYmxlV2FybmluZ3MgfSA9IHBhcnNlVGFibGUodGFibGVUZXh0LCBzY2hlbWEuZmllbGRzKTtcblx0XHRjb25zdCB3YXJuaW5nczogUGFyc2VJc3N1ZVtdID0gWy4uLmNvbmZpZ1dhcm5pbmdzLCAuLi50YWJsZVdhcm5pbmdzXTtcblx0XHRjb25zdCBjYXJkcyA9IHJlY29uY2lsZUNhcmRzKHNjaGVtYS5maWVsZHMsIHJhd0NhcmRzKTtcblx0XHRjb25zdCBib2FyZDogQm9hcmQgPSB7IC4uLnNjaGVtYSwgY2FyZHMgfTtcblxuXHRcdGlmIChzY2hlbWEudmVyc2lvbiA+IFNVUFBPUlRFRF9WRVJTSU9OKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRvazogdHJ1ZSxcblx0XHRcdFx0Ym9hcmQsXG5cdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxuXHRcdFx0XHRyZWFkb25seVJlYXNvbjogYFRoaXMgYm9hcmQgd2FzIGNyZWF0ZWQgd2l0aCB2ZXJzaW9uICR7c2NoZW1hLnZlcnNpb259IG9mIHRoZSBGYW5jeSBLYW5iYW4gZm9ybWF0LiBVcGRhdGUgdGhlIHBsdWdpbiB0byBlZGl0IGl0LmAsXG5cdFx0XHRcdHdhcm5pbmdzLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4geyBvazogdHJ1ZSwgYm9hcmQsIHJlYWRvbmx5OiBmYWxzZSwgd2FybmluZ3MgfTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG9rOiBmYWxzZSxcblx0XHRcdGVycm9yczogW3sgY29kZTogJ0VfVU5FWFBFQ1RFRCcsIG1lc3NhZ2U6IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKSB9XSxcblx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHR9O1xuXHR9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBDYXJkLCBGaWVsZERlZmluaXRpb24gfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDYXJkKGNhcmQ6IENhcmQsIGZpZWxkczogRmllbGREZWZpbml0aW9uW10pOiBIVE1MRWxlbWVudCB7XG5cdGNvbnN0IGNvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY2FyZCcpO1xuXHRjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY2FyZC0tZHJhZ2dhYmxlJyk7XG5cdGNvbnRhaW5lci5kYXRhc2V0LmNhcmRJZCA9IGNhcmQuaWQ7XG5cblx0Y29uc3QgdGl0bGVGaWVsZCA9IGZpZWxkcy5maW5kKGYgPT4gZi5uYW1lICE9PSAnX2lkJyk7XG5cblx0Y29uc3QgdGl0bGUgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0dGl0bGUuY2xhc3NMaXN0LmFkZCgnZmstY2FyZF9fdGl0bGUnKTtcblx0dGl0bGUudGV4dENvbnRlbnQgPSBjYXJkLnZhbHVlc1t0aXRsZUZpZWxkPy5uYW1lID8/ICcnXSA/PyAnJztcblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblxuXHRyZXR1cm4gY29udGFpbmVyO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQ2FyZCwgRmllbGREZWZpbml0aW9uIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgcmVuZGVyQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDb2x1bW4oXG5cdG5hbWU6IHN0cmluZyxcblx0bGFiZWw6IHN0cmluZyxcblx0Y2FyZHM6IENhcmRbXSxcblx0ZmllbGRzOiBGaWVsZERlZmluaXRpb25bXSxcbik6IEhUTUxFbGVtZW50IHtcblx0Y29uc3QgY29udGFpbmVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW4nKTtcblx0Y29udGFpbmVyLmRhdGFzZXQuY29sdW1uVmFsdWUgPSBuYW1lO1xuXG5cdGNvbnN0IGhlYWRlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRoZWFkZXIuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX19oZWFkZXInKTtcblxuXHRjb25zdCB0aXRsZSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dGl0bGUuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX190aXRsZScpO1xuXHR0aXRsZS50ZXh0Q29udGVudCA9IGxhYmVsO1xuXG5cdGNvbnN0IGNvdW50ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRjb3VudC5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW5fX2NvdW50Jyk7XG5cdGNvdW50LnRleHRDb250ZW50ID0gU3RyaW5nKGNhcmRzLmxlbmd0aCk7XG5cblx0aGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblx0aGVhZGVyLmFwcGVuZENoaWxkKGNvdW50KTtcblxuXHRjb25zdCBjYXJkc0NvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjYXJkc0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdmay1jb2x1bW5fX2NhcmRzJyk7XG5cblx0Zm9yIChjb25zdCBjYXJkIG9mIGNhcmRzKSB7XG5cdFx0Y2FyZHNDb250YWluZXIuYXBwZW5kQ2hpbGQocmVuZGVyQ2FyZChjYXJkLCBmaWVsZHMpKTtcblx0fVxuXG5cdGNvbnN0IGFkZEJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRhZGRCdG4uY2xhc3NMaXN0LmFkZCgnZmstY29sX19hZGQtYnRuJyk7XG5cdGFkZEJ0bi50ZXh0Q29udGVudCA9ICcrIEFkZCBjYXJkJztcblxuXHRjb250YWluZXIuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGNhcmRzQ29udGFpbmVyKTtcblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGFkZEJ0bik7XG5cblx0cmV0dXJuIGNvbnRhaW5lcjtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgcmVuZGVyQ29sdW1uIH0gZnJvbSAnLi9jb2x1bW4nO1xuXG5mdW5jdGlvbiBjYXBpdGFsaXNlKHM6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzLmxlbmd0aCA9PT0gMCA/IHMgOiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQm9hcmQoYm9hcmQ6IEJvYXJkKTogSFRNTEVsZW1lbnQge1xuXHRjb25zdCB3cmFwcGVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdHdyYXBwZXIuY2xhc3NMaXN0LmFkZCgnZmstYm9hcmQnKTtcblxuXHRjb25zdCBoZWFkZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0aGVhZGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWJvYXJkX19oZWFkZXInKTtcblxuXHRjb25zdCBzZXR0aW5nc0J0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRzZXR0aW5nc0J0bi5jbGFzc0xpc3QuYWRkKCdmay1ib2FyZF9fc2V0dGluZ3MnKTtcblx0c2V0dGluZ3NCdG4udGV4dENvbnRlbnQgPSAnXHUyNjk5Jztcblx0c2V0dGluZ3NCdG4udGl0bGUgPSAnQm9hcmQgc2V0dGluZ3MnO1xuXHRoZWFkZXIuYXBwZW5kQ2hpbGQoc2V0dGluZ3NCdG4pO1xuXG5cdGNvbnN0IHRpdGxlRWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHRpdGxlRWwuY2xhc3NMaXN0LmFkZCgnZmstYm9hcmRfX3RpdGxlJyk7XG5cdHRpdGxlRWwudGV4dENvbnRlbnQgPSBib2FyZC50aXRsZTtcblx0aGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlRWwpO1xuXG5cdHdyYXBwZXIuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcblxuXHRjb25zdCBjb2x1bW5zQ29udGFpbmVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGNvbHVtbnNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstYm9hcmRfX2NvbHVtbnMnKTtcblxuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLmZpZWxkcy5maW5kKGYgPT4gZi5uYW1lID09PSBib2FyZC52aWV3Q29uZmlnLmNvbHVtbnMpO1xuXG5cdGlmIChjb2x1bW5GaWVsZD8ub3B0aW9ucykge1xuXHRcdGZvciAoY29uc3Qgb3B0aW9uIG9mIGNvbHVtbkZpZWxkLm9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IGNhcmRzID0gYm9hcmQuY2FyZHMuZmlsdGVyKGMgPT4gYy52YWx1ZXNbY29sdW1uRmllbGQubmFtZV0gPT09IG9wdGlvbik7XG5cdFx0XHRjb2x1bW5zQ29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvbHVtbihvcHRpb24sIGNhcGl0YWxpc2Uob3B0aW9uKSwgY2FyZHMsIGJvYXJkLmZpZWxkcykpO1xuXHRcdH1cblx0fVxuXG5cdHdyYXBwZXIuYXBwZW5kQ2hpbGQoY29sdW1uc0NvbnRhaW5lcik7XG5cdHJldHVybiB3cmFwcGVyO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQm9hcmQsIENhcmQgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVDZWxsKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gdmFsdWVcblx0XHQucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKVxuXHRcdC5yZXBsYWNlKC9cXHwvZywgJ1xcXFx8Jylcblx0XHQucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUlkKCk6IHN0cmluZyB7XG5cdGNvbnN0IGNoYXJzID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG5cdGxldCBpZCA9ICcnO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IDg7IGkrKykge1xuXHRcdGlkICs9IGNoYXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCldO1xuXHR9XG5cdHJldHVybiBpZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUJvYXJkKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdGNvbnN0IGNvbmZpZyA9IHNlcmlhbGl6ZUNvbmZpZyhib2FyZCk7XG5cdGNvbnN0IHRhYmxlID0gc2VyaWFsaXplVGFibGUoYm9hcmQpO1xuXHRyZXR1cm4gYC0tLVxcbiR7Y29uZmlnfVxcbi0tLVxcblxcbiR7dGFibGV9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUJvYXJkQmxvY2soYm9hcmQ6IEJvYXJkKTogc3RyaW5nIHtcblx0cmV0dXJuIGBcXGBcXGBcXGBmYW5jeS1rYW5iYW5cXG4ke3NlcmlhbGl6ZUJvYXJkKGJvYXJkKX1cXG5cXGBcXGBcXGBcXG5gO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVDb25maWcoYm9hcmQ6IEJvYXJkKTogc3RyaW5nIHtcblx0Y29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cdGxpbmVzLnB1c2goYHZlcnNpb246IDFgKTtcblx0bGluZXMucHVzaChgdGl0bGU6ICR7Ym9hcmQudGl0bGV9YCk7XG5cdGxpbmVzLnB1c2goJ2ZpZWxkczonKTtcblx0Zm9yIChjb25zdCBmaWVsZCBvZiBib2FyZC5maWVsZHMpIHtcblx0XHRsZXQgbGluZSA9IGAgIC0gbmFtZTogJHtmaWVsZC5uYW1lfSwgdHlwZTogJHtmaWVsZC50eXBlfSwgbGFiZWw6ICR7ZmllbGQubGFiZWx9YDtcblx0XHRpZiAoZmllbGQub3B0aW9ucyAhPT0gdW5kZWZpbmVkKSBsaW5lICs9IGAsIG9wdGlvbnM6ICR7ZmllbGQub3B0aW9ucy5qb2luKCd8Jyl9YDtcblx0XHRpZiAoZmllbGQuZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSBsaW5lICs9IGAsIGRlZmF1bHQ6ICR7ZmllbGQuZGVmYXVsdH1gO1xuXHRcdGxpbmVzLnB1c2gobGluZSk7XG5cdH1cblx0aWYgKGJvYXJkLnZpZXdDb25maWcubGFuZXMpIGxpbmVzLnB1c2goYGxhbmVzOiAke2JvYXJkLnZpZXdDb25maWcubGFuZXN9YCk7XG5cdGlmIChib2FyZC5yYXdXb3JrZmxvdykgbGluZXMucHVzaChgd29ya2Zsb3c6ICR7Ym9hcmQucmF3V29ya2Zsb3d9YCk7XG5cdHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplVGFibGUoYm9hcmQ6IEJvYXJkKTogc3RyaW5nIHtcblx0Y29uc3Qgc2NoZW1hRmllbGROYW1lcyA9IG5ldyBTZXQoYm9hcmQuZmllbGRzLm1hcChmID0+IGYubmFtZSkpO1xuXG5cdC8vIENvbGxlY3Qgb3JwaGFuZWQga2V5cyBmcm9tIGFsbCBjYXJkcyAoa2V5cyBub3QgaW4gdGhlIGN1cnJlbnQgc2NoZW1hKVxuXHRjb25zdCBvcnBoYW5lZEtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Zm9yIChjb25zdCBjYXJkIG9mIGJvYXJkLmNhcmRzKSB7XG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY2FyZC52YWx1ZXMpKSB7XG5cdFx0XHRpZiAoIXNjaGVtYUZpZWxkTmFtZXMuaGFzKGtleSkpIG9ycGhhbmVkS2V5cy5hZGQoa2V5KTtcblx0XHR9XG5cdH1cblxuXHRjb25zdCBzY2hlbWFMYWJlbHMgPSBib2FyZC5maWVsZHMubWFwKGYgPT4gZi5sYWJlbCk7XG5cdGNvbnN0IGFsbExhYmVscyA9IFsnX2lkJywgLi4uc2NoZW1hTGFiZWxzLCAuLi5vcnBoYW5lZEtleXNdO1xuXG5cdGNvbnN0IGhlYWRlciAgICA9IGB8ICR7YWxsTGFiZWxzLmpvaW4oJyB8ICcpfSB8YDtcblx0Y29uc3Qgc2VwYXJhdG9yID0gYHwgJHthbGxMYWJlbHMubWFwKCgpID0+ICctLS0nKS5qb2luKCcgfCAnKX0gfGA7XG5cblx0Y29uc3Qgc2VlbklkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXHRjb25zdCByb3dzID0gYm9hcmQuY2FyZHMubWFwKGNhcmQgPT4gc2VyaWFsaXplUm93KGNhcmQsIGJvYXJkLCBvcnBoYW5lZEtleXMsIHNlZW5JZHMpKTtcblxuXHRyZXR1cm4gW2hlYWRlciwgc2VwYXJhdG9yLCAuLi5yb3dzXS5qb2luKCdcXG4nKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplUm93KGNhcmQ6IENhcmQsIGJvYXJkOiBCb2FyZCwgb3JwaGFuZWRLZXlzOiBTZXQ8c3RyaW5nPiwgc2VlbklkczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuXHRsZXQgaWQgPSBjYXJkLmlkIHx8IGdlbmVyYXRlSWQoKTtcblx0aWYgKHNlZW5JZHMuaGFzKGlkKSkgaWQgPSBnZW5lcmF0ZUlkKCk7XG5cdHNlZW5JZHMuYWRkKGlkKTtcblx0Y29uc3Qgc2NoZW1hQ2VsbHMgPSBib2FyZC5maWVsZHMubWFwKGYgPT4gZXNjYXBlQ2VsbChjYXJkLnZhbHVlc1tmLm5hbWVdID8/ICcnKSk7XG5cdGNvbnN0IG9ycGhhbkNlbGxzID0gWy4uLm9ycGhhbmVkS2V5c10ubWFwKGtleSA9PiBlc2NhcGVDZWxsKGNhcmQudmFsdWVzW2tleV0gPz8gJycpKTtcblx0Y29uc3QgY2VsbHMgPSBbaWQsIC4uLnNjaGVtYUNlbGxzLCAuLi5vcnBoYW5DZWxsc107XG5cdHJldHVybiBgfCAke2NlbGxzLmpvaW4oJyB8ICcpfSB8YDtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkIH0gZnJvbSAnLi9ib2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZUlkIH0gZnJvbSAnLi4vZGF0YS9zZXJpYWxpemVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFkZENhcmQoYm9hcmQ6IEJvYXJkLCBjb2x1bW5WYWx1ZTogc3RyaW5nKTogQm9hcmQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucztcblx0Y29uc3QgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cdGZvciAoY29uc3QgZmllbGQgb2YgYm9hcmQuZmllbGRzKSB7XG5cdFx0dmFsdWVzW2ZpZWxkLm5hbWVdID0gZmllbGQubmFtZSA9PT0gY29sdW1uRmllbGQgPyBjb2x1bW5WYWx1ZSA6IChmaWVsZC5kZWZhdWx0ID8/ICcnKTtcblx0fVxuXHRjb25zdCBuZXdDYXJkOiBDYXJkID0geyBpZDogZ2VuZXJhdGVJZCgpLCB2YWx1ZXMgfTtcblx0cmV0dXJuIHsgLi4uYm9hcmQsIGNhcmRzOiBbLi4uYm9hcmQuY2FyZHMsIG5ld0NhcmRdIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVDYXJkKGJvYXJkOiBCb2FyZCwgY2FyZElkOiBzdHJpbmcpOiBCb2FyZCB7XG5cdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogYm9hcmQuY2FyZHMuZmlsdGVyKGNhcmQgPT4gY2FyZC5pZCAhPT0gY2FyZElkKSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVvcmRlckNhcmQoXG5cdGJvYXJkOiBCb2FyZCxcblx0Y2FyZElkOiBzdHJpbmcsXG5cdHRvQ29sdW1uVmFsdWU6IHN0cmluZyxcblx0aW5zZXJ0QmVmb3JlSWQ6IHN0cmluZyB8IG51bGwsXG4pOiBCb2FyZCB7XG5cdGNvbnN0IGNvbHVtbkZpZWxkID0gYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zO1xuXHRjb25zdCBkcmFnZ2VkID0gYm9hcmQuY2FyZHMuZmluZChjID0+IGMuaWQgPT09IGNhcmRJZCk7XG5cdGlmICghZHJhZ2dlZCkgcmV0dXJuIGJvYXJkO1xuXG5cdGNvbnN0IHVwZGF0ZWRDYXJkID0geyAuLi5kcmFnZ2VkLCB2YWx1ZXM6IHsgLi4uZHJhZ2dlZC52YWx1ZXMsIFtjb2x1bW5GaWVsZF06IHRvQ29sdW1uVmFsdWUgfSB9O1xuXHRjb25zdCByZW1haW5pbmcgPSBib2FyZC5jYXJkcy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjYXJkSWQpO1xuXG5cdGlmIChpbnNlcnRCZWZvcmVJZCA9PT0gbnVsbCkge1xuXHRcdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogWy4uLnJlbWFpbmluZywgdXBkYXRlZENhcmRdIH07XG5cdH1cblxuXHRjb25zdCB0YXJnZXRJZHggPSByZW1haW5pbmcuZmluZEluZGV4KGMgPT4gYy5pZCA9PT0gaW5zZXJ0QmVmb3JlSWQpO1xuXHRpZiAodGFyZ2V0SWR4ID09PSAtMSkge1xuXHRcdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogWy4uLnJlbWFpbmluZywgdXBkYXRlZENhcmRdIH07XG5cdH1cblxuXHRjb25zdCBuZXdDYXJkcyA9IFsuLi5yZW1haW5pbmddO1xuXHRuZXdDYXJkcy5zcGxpY2UodGFyZ2V0SWR4LCAwLCB1cGRhdGVkQ2FyZCk7XG5cdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogbmV3Q2FyZHMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNhcmQoYm9hcmQ6IEJvYXJkLCBjb2x1bW5WYWx1ZTogc3RyaW5nLCB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBCb2FyZCB7XG5cdGNvbnN0IGNvbHVtbkZpZWxkID0gYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zO1xuXHRjb25zdCBjYXJkVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cdGZvciAoY29uc3QgZmllbGQgb2YgYm9hcmQuZmllbGRzKSB7XG5cdFx0aWYgKGZpZWxkLm5hbWUgPT09IGNvbHVtbkZpZWxkKSB7XG5cdFx0XHRjYXJkVmFsdWVzW2ZpZWxkLm5hbWVdID0gY29sdW1uVmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhcmRWYWx1ZXNbZmllbGQubmFtZV0gPSB2YWx1ZXNbZmllbGQubmFtZV0gPz8gZmllbGQuZGVmYXVsdCA/PyAnJztcblx0XHR9XG5cdH1cblx0Y29uc3QgbmV3Q2FyZDogQ2FyZCA9IHsgaWQ6IGdlbmVyYXRlSWQoKSwgdmFsdWVzOiBjYXJkVmFsdWVzIH07XG5cdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogWy4uLmJvYXJkLmNhcmRzLCBuZXdDYXJkXSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQ2FyZChib2FyZDogQm9hcmQsIGNhcmRJZDogc3RyaW5nLCB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBCb2FyZCB7XG5cdHJldHVybiB7XG5cdFx0Li4uYm9hcmQsXG5cdFx0Y2FyZHM6IGJvYXJkLmNhcmRzLm1hcChjYXJkID0+XG5cdFx0XHRjYXJkLmlkID09PSBjYXJkSWRcblx0XHRcdFx0PyB7IC4uLmNhcmQsIHZhbHVlczogeyAuLi5jYXJkLnZhbHVlcywgLi4udmFsdWVzIH0gfVxuXHRcdFx0XHQ6IGNhcmQsXG5cdFx0KSxcblx0fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUNhcmRGaWVsZChib2FyZDogQm9hcmQsIGNhcmRJZDogc3RyaW5nLCBmaWVsZE5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IEJvYXJkIHtcblx0cmV0dXJuIHtcblx0XHQuLi5ib2FyZCxcblx0XHRjYXJkczogYm9hcmQuY2FyZHMubWFwKGNhcmQgPT5cblx0XHRcdGNhcmQuaWQgPT09IGNhcmRJZFxuXHRcdFx0XHQ/IHsgLi4uY2FyZCwgdmFsdWVzOiB7IC4uLmNhcmQudmFsdWVzLCBbZmllbGROYW1lXTogdmFsdWUgfSB9XG5cdFx0XHRcdDogY2FyZCxcblx0XHQpLFxuXHR9O1xufVxuIiwgImV4cG9ydCB0eXBlIFdvcmtmbG93TWFwID0gTWFwPHN0cmluZywgU2V0PHN0cmluZz4+O1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VXb3JrZmxvdyh3b3JrZmxvd1N0cmluZzogc3RyaW5nIHwgdW5kZWZpbmVkLCBzdGF0dXNPcHRpb25zOiBzdHJpbmdbXSk6IFdvcmtmbG93TWFwIHtcblx0Y29uc3QgbWFwOiBXb3JrZmxvd01hcCA9IG5ldyBNYXAoKTtcblxuXHRpZiAoIXdvcmtmbG93U3RyaW5nIHx8ICF3b3JrZmxvd1N0cmluZy50cmltKCkpIHtcblx0XHRmb3IgKGNvbnN0IGZyb20gb2Ygc3RhdHVzT3B0aW9ucykge1xuXHRcdFx0bWFwLnNldChmcm9tLCBuZXcgU2V0KHN0YXR1c09wdGlvbnMuZmlsdGVyKHMgPT4gcyAhPT0gZnJvbSkpKTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hcDtcblx0fVxuXG5cdGZvciAoY29uc3QgcGFpciBvZiB3b3JrZmxvd1N0cmluZy5zcGxpdCgnLCcpKSB7XG5cdFx0Y29uc3QgW2Zyb20sIHRvXSA9IHBhaXIuc3BsaXQoLy0+fFx1MjE5Mi8pLm1hcChzID0+IHMudHJpbSgpKTtcblx0XHRpZiAoIWZyb20gfHwgIXRvKSBjb250aW51ZTtcblx0XHRpZiAoIW1hcC5oYXMoZnJvbSkpIG1hcC5zZXQoZnJvbSwgbmV3IFNldCgpKTtcblx0XHRtYXAuZ2V0KGZyb20pIS5hZGQodG8pO1xuXHR9XG5cblx0cmV0dXJuIG1hcDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHJhbnNpdGlvbkFsbG93ZWQobWFwOiBXb3JrZmxvd01hcCwgZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogYm9vbGVhbiB7XG5cdGlmIChmcm9tID09PSB0bykgcmV0dXJuIGZhbHNlO1xuXHRyZXR1cm4gbWFwLmdldChmcm9tKT8uaGFzKHRvKSA/PyBmYWxzZTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIE1vZGFsIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCwgRmllbGREZWZpbml0aW9uIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5leHBvcnQgY2xhc3MgQ2FyZE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuXHRwcml2YXRlIHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdGFwcDogQXBwLFxuXHRcdHByaXZhdGUgYm9hcmQ6IEJvYXJkLFxuXHRcdHByaXZhdGUgY2FyZDogQ2FyZCB8IG51bGwsXG5cdFx0cHJpdmF0ZSBjb2x1bW5WYWx1ZTogc3RyaW5nLFxuXHRcdHByaXZhdGUgb25Db25maXJtOiAodmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSA9PiB2b2lkLFxuXHRcdHByaXZhdGUgb25EZWxldGU/OiAoKSA9PiB2b2lkLFxuXHQpIHtcblx0XHRzdXBlcihhcHApO1xuXHR9XG5cblx0b25PcGVuKCk6IHZvaWQge1xuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xuXHRcdHRoaXMudGl0bGVFbC50ZXh0Q29udGVudCA9IHRoaXMuY2FyZCA/ICdFZGl0IGNhcmQnIDogJ0FkZCBjYXJkJztcblxuXHRcdGNvbnN0IGNvbHVtbkZpZWxkID0gdGhpcy5ib2FyZC52aWV3Q29uZmlnLmNvbHVtbnM7XG5cdFx0Y29uc3QgZWRpdGFibGVGaWVsZHMgPSB0aGlzLmJvYXJkLmZpZWxkcy5maWx0ZXIoXG5cdFx0XHRmID0+IGYubmFtZSAhPT0gJ19pZCcgJiYgZi5uYW1lICE9PSBjb2x1bW5GaWVsZCxcblx0XHQpO1xuXG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBlZGl0YWJsZUZpZWxkcykge1xuXHRcdFx0dGhpcy5yZW5kZXJGaWVsZChjb250ZW50RWwsIGZpZWxkKTtcblx0XHR9XG5cblx0XHRjb25zdCBmb290ZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRmb290ZXIuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZm9vdGVyJyk7XG5cblx0XHRpZiAodGhpcy5vbkRlbGV0ZSkge1xuXHRcdFx0Y29uc3QgZGVsZXRlQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0XHRkZWxldGVCdG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZGVsZXRlJyk7XG5cdFx0XHRkZWxldGVCdG4udGV4dENvbnRlbnQgPSAnRGVsZXRlJztcblx0XHRcdGRlbGV0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFx0dGhpcy5vbkRlbGV0ZSEoKTtcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0fSk7XG5cdFx0XHRmb290ZXIuYXBwZW5kQ2hpbGQoZGVsZXRlQnRuKTtcblx0XHR9XG5cblx0XHRjb25zdCBzYXZlQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0c2F2ZUJ0bi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1zYXZlJyk7XG5cdFx0c2F2ZUJ0bi50ZXh0Q29udGVudCA9ICdTYXZlJztcblx0XHRzYXZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWVzID0geyAuLi50aGlzLnZhbHVlcyB9O1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0dGhpcy5jb250YWluZXJFbD8ucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLm9uQ29uZmlybSh2YWx1ZXMpO1xuXHRcdH0pO1xuXHRcdGZvb3Rlci5hcHBlbmRDaGlsZChzYXZlQnRuKTtcblx0XHRjb250ZW50RWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcblxuXHRcdGNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignaW5wdXQsIHRleHRhcmVhLCBzZWxlY3QnKT8uZm9jdXMoKTtcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyRmllbGQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgZmllbGQ6IEZpZWxkRGVmaW5pdGlvbik6IHZvaWQge1xuXHRcdGNvbnN0IGluaXRpYWxWYWx1ZSA9IHRoaXMuY2FyZFxuXHRcdFx0PyAodGhpcy5jYXJkLnZhbHVlc1tmaWVsZC5uYW1lXSA/PyAnJylcblx0XHRcdDogKGZpZWxkLmRlZmF1bHQgPz8gJycpO1xuXHRcdHRoaXMudmFsdWVzW2ZpZWxkLm5hbWVdID0gaW5pdGlhbFZhbHVlO1xuXG5cdFx0Y29uc3Qgd3JhcHBlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHdyYXBwZXIuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZmllbGQnKTtcblxuXHRcdGNvbnN0IGxhYmVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcblx0XHRsYWJlbC50ZXh0Q29udGVudCA9IGZpZWxkLmxhYmVsO1xuXHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQobGFiZWwpO1xuXG5cdFx0Y29uc3Qgb25DaGFuZ2UgPSAodmFsdWU6IHN0cmluZykgPT4geyB0aGlzLnZhbHVlc1tmaWVsZC5uYW1lXSA9IHZhbHVlOyB9O1xuXG5cdFx0aWYgKGZpZWxkLnR5cGUgPT09ICdTZWxlY3QnICYmIGZpZWxkLm9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IHNlbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuXHRcdFx0c2VsLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0XHRmb3IgKGNvbnN0IG9wdCBvZiBmaWVsZC5vcHRpb25zKSB7XG5cdFx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdFx0by52YWx1ZSA9IG9wdDtcblx0XHRcdFx0by50ZXh0Q29udGVudCA9IG9wdDtcblx0XHRcdFx0aWYgKG9wdCA9PT0gaW5pdGlhbFZhbHVlKSBvLnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdFx0c2VsLmFwcGVuZENoaWxkKG8pO1xuXHRcdFx0fVxuXHRcdFx0c2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IG9uQ2hhbmdlKHNlbC52YWx1ZSkpO1xuXHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChzZWwpO1xuXHRcdH0gZWxzZSBpZiAoZmllbGQudHlwZSA9PT0gJ1RleHRhcmVhJykge1xuXHRcdFx0Y29uc3QgdGEgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuXHRcdFx0dGEuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRcdHRhLnZhbHVlID0gaW5pdGlhbFZhbHVlO1xuXHRcdFx0dGEucm93cyA9IDQ7XG5cdFx0XHR0YS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IG9uQ2hhbmdlKHRhLnZhbHVlKSk7XG5cdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKHRhKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRcdGlucC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dCcpO1xuXHRcdFx0aW5wLnR5cGUgPSBmaWVsZC50eXBlID09PSAnRGF0ZScgPyAnZGF0ZSdcblx0XHRcdFx0OiBmaWVsZC50eXBlID09PSAnTnVtYmVyJyA/ICdudW1iZXInXG5cdFx0XHRcdDogJ3RleHQnO1xuXHRcdFx0aW5wLnZhbHVlID0gaW5pdGlhbFZhbHVlO1xuXHRcdFx0aW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4gb25DaGFuZ2UoaW5wLnZhbHVlKSk7XG5cdFx0XHRpbnAuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG5cdFx0XHRcdGlmIChlLmtleSA9PT0gJ0VudGVyJykge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlcyA9IHsgLi4udGhpcy52YWx1ZXMgfTtcblx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJFbD8ucmVtb3ZlKCk7XG5cdFx0XHRcdFx0dGhpcy5vbkNvbmZpcm0odmFsdWVzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKGlucCk7XG5cdFx0fVxuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHdyYXBwZXIpO1xuXHR9XG5cblx0b25DbG9zZSgpOiB2b2lkIHtcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuXHR9XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgQm9hcmRTY2hlbWEsIEZpZWxkRGVmaW5pdGlvbiwgRmllbGRUeXBlIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5mdW5jdGlvbiBkZXJpdmVGaWVsZE5hbWUobGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBsYWJlbC50b0xvd2VyQ2FzZSgpLnRyaW0oKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csICdfJykucmVwbGFjZSgvXl8rfF8rJC9nLCAnJyk7XG59XG5cbmNvbnN0IEZJRUxEX1RZUEVTOiBGaWVsZFR5cGVbXSA9IFsnVGV4dCcsICdUZXh0YXJlYScsICdEYXRlJywgJ051bWJlcicsICdTZWxlY3QnLCAnTGluayddO1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQTogQm9hcmRTY2hlbWEgPSB7XG5cdHRpdGxlOiAnTmV3IEJvYXJkJyxcblx0ZmllbGRzOiBbXG5cdFx0eyBuYW1lOiAndGl0bGUnLCB0eXBlOiAnVGV4dCcsIGxhYmVsOiAnVGl0bGUnIH0sXG5cdFx0eyBuYW1lOiAnc3RhdHVzJywgdHlwZTogJ1NlbGVjdCcsIGxhYmVsOiAnU3RhdHVzJywgb3B0aW9uczogWyd0b2RvJywgJ2RvaW5nJywgJ2RvbmUnXSwgZGVmYXVsdDogJ3RvZG8nIH0sXG5cdF0sXG5cdHZpZXdDb25maWc6IHsgY29sdW1uczogJ3N0YXR1cycgfSxcblx0cmF3V29ya2Zsb3c6ICcnLFxuXHR2ZXJzaW9uOiAxLFxufTtcblxuZXhwb3J0IGNsYXNzIEJvYXJkQ29uZmlnTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG5cdHByaXZhdGUgc2NoZW1hOiBCb2FyZFNjaGVtYTtcblx0cHJpdmF0ZSBlcnJvckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIGZpZWxkTGlzdEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG5cdGNvbnN0cnVjdG9yKFxuXHRcdGFwcDogQXBwLFxuXHRcdGluaXRpYWw6IEJvYXJkU2NoZW1hIHwgbnVsbCxcblx0XHRwcml2YXRlIG9uQ29uZmlybTogKHNjaGVtYTogQm9hcmRTY2hlbWEpID0+IHZvaWQsXG5cdCkge1xuXHRcdHN1cGVyKGFwcCk7XG5cdFx0dGhpcy5zY2hlbWEgPSBpbml0aWFsXG5cdFx0XHQ/IHsgLi4uaW5pdGlhbCwgZmllbGRzOiBpbml0aWFsLmZpZWxkcy5tYXAoZiA9PiAoeyAuLi5mIH0pKSB9XG5cdFx0XHQ6IHsgLi4uREVGQVVMVF9TQ0hFTUEsIGZpZWxkczogREVGQVVMVF9TQ0hFTUEuZmllbGRzLm1hcChmID0+ICh7IC4uLmYgfSkpIH07XG5cdH1cblxuXHRvbk9wZW4oKTogdm9pZCB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XG5cdFx0dGhpcy50aXRsZUVsLnRleHRDb250ZW50ID0gdGhpcy5zY2hlbWEudGl0bGUgPT09ICdOZXcgQm9hcmQnICYmICF0aGlzLnNjaGVtYS5maWVsZHMubGVuZ3RoXG5cdFx0XHQ/ICdOZXcgYm9hcmQnXG5cdFx0XHQ6ICdCb2FyZCBzZXR0aW5ncyc7XG5cblx0XHR0aGlzLnJlbmRlclRpdGxlSW5wdXQoY29udGVudEVsKTtcblx0XHR0aGlzLnJlbmRlckZpZWxkc1NlY3Rpb24oY29udGVudEVsKTtcblx0XHR0aGlzLnJlbmRlclZpZXdDb25maWcoY29udGVudEVsKTtcblx0XHR0aGlzLnJlbmRlcldvcmtmbG93KGNvbnRlbnRFbCk7XG5cblx0XHR0aGlzLmVycm9yRWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0dGhpcy5lcnJvckVsLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWVycm9yJyk7XG5cdFx0Y29udGVudEVsLmFwcGVuZENoaWxkKHRoaXMuZXJyb3JFbCk7XG5cblx0XHRjb25zdCBzYXZlQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0c2F2ZUJ0bi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1zYXZlJyk7XG5cdFx0c2F2ZUJ0bi50ZXh0Q29udGVudCA9ICdTYXZlJztcblx0XHRzYXZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5zdWJtaXQoKSk7XG5cdFx0Y29udGVudEVsLmFwcGVuZENoaWxkKHNhdmVCdG4pO1xuXG5cdFx0Y29udGVudEVsLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCdpbnB1dCcpPy5mb2N1cygpO1xuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJUaXRsZUlucHV0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcblx0XHRjb25zdCB3cmFwID0gdGhpcy5maWVsZChjb250YWluZXIsICdCb2FyZCB0aXRsZScpO1xuXHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0aW5wLnR5cGUgPSAndGV4dCc7XG5cdFx0aW5wLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0aW5wLnZhbHVlID0gdGhpcy5zY2hlbWEudGl0bGU7XG5cdFx0aW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4geyB0aGlzLnNjaGVtYS50aXRsZSA9IGlucC52YWx1ZTsgfSk7XG5cdFx0d3JhcC5hcHBlbmRDaGlsZChpbnApO1xuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJGaWVsZHNTZWN0aW9uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcblx0XHRjb25zdCBzZWN0aW9uID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0c2VjdGlvbi5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1zZWN0aW9uJyk7XG5cblx0XHRjb25zdCBoZWFkaW5nID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdGhlYWRpbmcuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2VjdGlvbi1sYWJlbCcpO1xuXHRcdGhlYWRpbmcudGV4dENvbnRlbnQgPSAnRmllbGRzJztcblx0XHRzZWN0aW9uLmFwcGVuZENoaWxkKGhlYWRpbmcpO1xuXG5cdFx0dGhpcy5maWVsZExpc3RFbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHRoaXMuZmllbGRMaXN0RWwuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZmllbGQtbGlzdCcpO1xuXHRcdHNlY3Rpb24uYXBwZW5kQ2hpbGQodGhpcy5maWVsZExpc3RFbCk7XG5cblx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cblx0XHRjb25zdCBhZGRCdG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0XHRhZGRCdG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtYWRkLWZpZWxkJyk7XG5cdFx0YWRkQnRuLnRleHRDb250ZW50ID0gJysgQWRkIGZpZWxkJztcblx0XHRhZGRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNjaGVtYS5maWVsZHMucHVzaCh7IG5hbWU6ICcnLCB0eXBlOiAnVGV4dCcsIGxhYmVsOiAnJyB9KTtcblx0XHRcdHRoaXMucmVyZW5kZXJGaWVsZExpc3QoKTtcblx0XHRcdHRoaXMucmVmcmVzaFZpZXdDb25maWcoKTtcblx0XHR9KTtcblx0XHRzZWN0aW9uLmFwcGVuZENoaWxkKGFkZEJ0bik7XG5cblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoc2VjdGlvbik7XG5cdH1cblxuXHRwcml2YXRlIHJlcmVuZGVyRmllbGRMaXN0KCk6IHZvaWQge1xuXHRcdGlmICghdGhpcy5maWVsZExpc3RFbCkgcmV0dXJuO1xuXHRcdHRoaXMuZmllbGRMaXN0RWwuaW5uZXJIVE1MID0gJyc7XG5cdFx0dGhpcy5zY2hlbWEuZmllbGRzLmZvckVhY2goKGYsIGlkeCkgPT4ge1xuXHRcdFx0dGhpcy5maWVsZExpc3RFbCEuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJGaWVsZFJvdyhmLCBpZHgpKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlckZpZWxkUm93KGZpZWxkOiBGaWVsZERlZmluaXRpb24sIGlkeDogbnVtYmVyKTogSFRNTEVsZW1lbnQge1xuXHRcdGNvbnN0IHRvdGFsID0gdGhpcy5zY2hlbWEuZmllbGRzLmxlbmd0aDtcblx0XHRjb25zdCByb3cgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRyb3cuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtZmllbGQtcm93Jyk7XG5cblx0XHRjb25zdCBpc05ldyA9IGZpZWxkLm5hbWUgPT09ICcnO1xuXG5cdFx0Y29uc3QgbGFiZWxJbnAgPSB0aGlzLmZpeGVkSW5wdXQocm93LCAnTGFiZWwnLCBmaWVsZC5sYWJlbCwgJ2ZrLWNvbC1sYWJlbCcpO1xuXHRcdGlmICghaXNOZXcpIGxhYmVsSW5wLnRpdGxlID0gYGlkOiAke2ZpZWxkLm5hbWV9YDtcblx0XHRsYWJlbElucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdGZpZWxkLmxhYmVsID0gbGFiZWxJbnAudmFsdWU7XG5cdFx0XHRpZiAoaXNOZXcpIHtcblx0XHRcdFx0ZmllbGQubmFtZSA9IGRlcml2ZUZpZWxkTmFtZShsYWJlbElucC52YWx1ZSk7XG5cdFx0XHRcdGxhYmVsSW5wLnRpdGxlID0gZmllbGQubmFtZSA/IGBpZDogJHtmaWVsZC5uYW1lfWAgOiAnJztcblx0XHRcdFx0dGhpcy5yZWZyZXNoVmlld0NvbmZpZygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Y29uc3QgdHlwZVNlbGVjdCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpO1xuXHRcdHR5cGVTZWxlY3QuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQtc20nLCAnZmstY29sLXR5cGUnKTtcblx0XHRmb3IgKGNvbnN0IHQgb2YgRklFTERfVFlQRVMpIHtcblx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdG8udmFsdWUgPSB0O1xuXHRcdFx0by50ZXh0Q29udGVudCA9IHQ7XG5cdFx0XHRpZiAodCA9PT0gZmllbGQudHlwZSkgby5zZWxlY3RlZCA9IHRydWU7XG5cdFx0XHR0eXBlU2VsZWN0LmFwcGVuZENoaWxkKG8pO1xuXHRcdH1cblx0XHRyb3cuYXBwZW5kQ2hpbGQodHlwZVNlbGVjdCk7XG5cblx0XHRjb25zdCBpc1NlbGVjdCA9IGZpZWxkLnR5cGUgPT09ICdTZWxlY3QnO1xuXG5cdFx0Y29uc3Qgb3B0aW9uc0lucCA9IHRoaXMuZml4ZWRJbnB1dChyb3csICdhLCBiLCBjJywgKGZpZWxkLm9wdGlvbnMgPz8gW10pLmpvaW4oJywgJyksICdmay1jb2wtb3B0aW9ucycpO1xuXHRcdG9wdGlvbnNJbnAuZGlzYWJsZWQgPSAhaXNTZWxlY3Q7XG5cdFx0b3B0aW9uc0lucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdGZpZWxkLm9wdGlvbnMgPSBvcHRpb25zSW5wLnZhbHVlLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IGRlZmF1bHRJbnAgPSB0aGlzLmZpeGVkSW5wdXQocm93LCAnRGVmYXVsdCcsIGZpZWxkLmRlZmF1bHQgPz8gJycsICdmay1jb2wtZGVmYXVsdCcpO1xuXHRcdGRlZmF1bHRJbnAuZGlzYWJsZWQgPSAhaXNTZWxlY3Q7XG5cdFx0ZGVmYXVsdElucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdGZpZWxkLmRlZmF1bHQgPSBkZWZhdWx0SW5wLnZhbHVlIHx8IHVuZGVmaW5lZDtcblx0XHR9KTtcblxuXHRcdHR5cGVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0ZmllbGQudHlwZSA9IHR5cGVTZWxlY3QudmFsdWUgYXMgRmllbGRUeXBlO1xuXHRcdFx0Y29uc3Qgbm93U2VsZWN0ID0gZmllbGQudHlwZSA9PT0gJ1NlbGVjdCc7XG5cdFx0XHRvcHRpb25zSW5wLmRpc2FibGVkID0gIW5vd1NlbGVjdDtcblx0XHRcdGRlZmF1bHRJbnAuZGlzYWJsZWQgPSAhbm93U2VsZWN0O1xuXHRcdFx0aWYgKCFub3dTZWxlY3QpIHtcblx0XHRcdFx0ZmllbGQub3B0aW9ucyA9IHVuZGVmaW5lZDtcblx0XHRcdFx0ZmllbGQuZGVmYXVsdCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0b3B0aW9uc0lucC52YWx1ZSA9ICcnO1xuXHRcdFx0XHRkZWZhdWx0SW5wLnZhbHVlID0gJyc7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBSZW9yZGVyIC8gcmVtb3ZlIGNvbnRyb2xzXG5cdFx0Y29uc3QgY29udHJvbHMgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRjb250cm9scy5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1yb3ctY29udHJvbHMnKTtcblxuXHRcdGNvbnN0IHVwQnRuID0gdGhpcy5pY29uQnRuKGNvbnRyb2xzLCAnXHUyMTkxJywgaWR4ID09PSAwKTtcblx0XHR1cEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFt0aGlzLnNjaGVtYS5maWVsZHNbaWR4IC0gMV0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHhdXSA9XG5cdFx0XHRcdFt0aGlzLnNjaGVtYS5maWVsZHNbaWR4XSwgdGhpcy5zY2hlbWEuZmllbGRzW2lkeCAtIDFdXTtcblx0XHRcdHRoaXMucmVyZW5kZXJGaWVsZExpc3QoKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IGRvd25CdG4gPSB0aGlzLmljb25CdG4oY29udHJvbHMsICdcdTIxOTMnLCBpZHggPT09IHRvdGFsIC0gMSk7XG5cdFx0ZG93bkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdFt0aGlzLnNjaGVtYS5maWVsZHNbaWR4XSwgdGhpcy5zY2hlbWEuZmllbGRzW2lkeCArIDFdXSA9XG5cdFx0XHRcdFt0aGlzLnNjaGVtYS5maWVsZHNbaWR4ICsgMV0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHhdXTtcblx0XHRcdHRoaXMucmVyZW5kZXJGaWVsZExpc3QoKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJlbW92ZUJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MDBENycsIHRvdGFsIDw9IDEpO1xuXHRcdHJlbW92ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuc2NoZW1hLmZpZWxkcy5zcGxpY2UoaWR4LCAxKTtcblx0XHRcdHRoaXMucmVyZW5kZXJGaWVsZExpc3QoKTtcblx0XHRcdHRoaXMucmVmcmVzaFZpZXdDb25maWcoKTtcblx0XHR9KTtcblxuXHRcdHJvdy5hcHBlbmRDaGlsZChjb250cm9scyk7XG5cdFx0cmV0dXJuIHJvdztcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyVmlld0NvbmZpZyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgc2VjdGlvbiA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHNlY3Rpb24uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2VjdGlvbicpO1xuXG5cdFx0Y29uc3QgY29sV3JhcCA9IHRoaXMuZmllbGQoc2VjdGlvbiwgJ0NvbHVtbnMgZmllbGQnKTtcblx0XHRjb25zdCBjb2xTZWxlY3QgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblx0XHRjb2xTZWxlY3QuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRjb2xTZWxlY3QuZGF0YXNldC5yb2xlID0gJ2NvbHVtbnMnO1xuXHRcdHRoaXMucG9wdWxhdGVGaWVsZFNlbGVjdChjb2xTZWxlY3QsIHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucyk7XG5cdFx0Y29sU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHsgdGhpcy5zY2hlbWEudmlld0NvbmZpZy5jb2x1bW5zID0gY29sU2VsZWN0LnZhbHVlOyB9KTtcblx0XHRjb2xXcmFwLmFwcGVuZENoaWxkKGNvbFNlbGVjdCk7XG5cblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoc2VjdGlvbik7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlcldvcmtmbG93KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcblx0XHRjb25zdCB3cmFwID0gdGhpcy5maWVsZChjb250YWluZXIsICdXb3JrZmxvdyAob3B0aW9uYWwpJyk7XG5cdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRpbnAudHlwZSA9ICd0ZXh0Jztcblx0XHRpbnAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRpbnAucGxhY2Vob2xkZXIgPSAndG9kb1x1MjE5MmRvaW5nLCBkb2luZ1x1MjE5MmRvbmUnO1xuXHRcdGlucC52YWx1ZSA9IHRoaXMuc2NoZW1hLnJhd1dvcmtmbG93ID8/ICcnO1xuXHRcdGlucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHsgdGhpcy5zY2hlbWEucmF3V29ya2Zsb3cgPSBpbnAudmFsdWU7IH0pO1xuXHRcdHdyYXAuYXBwZW5kQ2hpbGQoaW5wKTtcblx0fVxuXG5cdHByaXZhdGUgcmVmcmVzaFZpZXdDb25maWcoKTogdm9pZCB7XG5cdFx0Y29uc3QgY29sU2VsZWN0ID0gdGhpcy5jb250ZW50RWwucXVlcnlTZWxlY3RvcjxIVE1MU2VsZWN0RWxlbWVudD4oJ1tkYXRhLXJvbGU9XCJjb2x1bW5zXCJdJyk7XG5cdFx0aWYgKGNvbFNlbGVjdCkgdGhpcy5wb3B1bGF0ZUZpZWxkU2VsZWN0KGNvbFNlbGVjdCwgdGhpcy5zY2hlbWEudmlld0NvbmZpZy5jb2x1bW5zKTtcblx0fVxuXG5cdHByaXZhdGUgcG9wdWxhdGVGaWVsZFNlbGVjdChzZWxlY3Q6IEhUTUxTZWxlY3RFbGVtZW50LCBjdXJyZW50OiBzdHJpbmcpOiB2b2lkIHtcblx0XHRjb25zdCBleGlzdGluZyA9IEFycmF5LmZyb20oc2VsZWN0Lm9wdGlvbnMpLm1hcChvID0+IG8udmFsdWUpLmZpbHRlcih2ID0+IHYpO1xuXHRcdGNvbnN0IG5hbWVzID0gdGhpcy5zY2hlbWEuZmllbGRzLm1hcChmID0+IGYubmFtZSkuZmlsdGVyKG4gPT4gbik7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG5cdFx0XHRpZiAoIWV4aXN0aW5nLmluY2x1ZGVzKG5hbWUpKSB7XG5cdFx0XHRcdGNvbnN0IG8gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcblx0XHRcdFx0by52YWx1ZSA9IG5hbWU7XG5cdFx0XHRcdG8udGV4dENvbnRlbnQgPSBuYW1lO1xuXHRcdFx0XHRzZWxlY3QuYXBwZW5kQ2hpbGQobyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChjdXJyZW50KSBzZWxlY3QudmFsdWUgPSBjdXJyZW50O1xuXHR9XG5cblx0cHJpdmF0ZSBzdWJtaXQoKTogdm9pZCB7XG5cdFx0Y29uc3QgZXJyb3IgPSB0aGlzLnZhbGlkYXRlKCk7XG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRpZiAodGhpcy5lcnJvckVsKSB0aGlzLmVycm9yRWwudGV4dENvbnRlbnQgPSBlcnJvcjtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5vbkNvbmZpcm0odGhpcy5zY2hlbWEpO1xuXHRcdHRoaXMuY2xvc2UoKTtcblx0fVxuXG5cdHByaXZhdGUgdmFsaWRhdGUoKTogc3RyaW5nIHwgbnVsbCB7XG5cdFx0aWYgKCF0aGlzLnNjaGVtYS50aXRsZS50cmltKCkpIHJldHVybiAnQm9hcmQgdGl0bGUgaXMgcmVxdWlyZWQuJztcblx0XHRpZiAodGhpcy5zY2hlbWEuZmllbGRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdBdCBsZWFzdCBvbmUgZmllbGQgaXMgcmVxdWlyZWQuJztcblx0XHRjb25zdCBuYW1lcyA9IHRoaXMuc2NoZW1hLmZpZWxkcy5tYXAoZiA9PiBmLm5hbWUudHJpbSgpKTtcblx0XHRpZiAobmFtZXMuc29tZShuID0+ICFuKSkgcmV0dXJuICdBbGwgZmllbGQgbmFtZXMgbXVzdCBiZSBub24tZW1wdHkuJztcblx0XHRpZiAobmV3IFNldChuYW1lcykuc2l6ZSAhPT0gbmFtZXMubGVuZ3RoKSByZXR1cm4gJ0ZpZWxkIG5hbWVzIG11c3QgYmUgdW5pcXVlLic7XG5cdFx0Zm9yIChjb25zdCBmIG9mIHRoaXMuc2NoZW1hLmZpZWxkcykge1xuXHRcdFx0aWYgKGYudHlwZSA9PT0gJ1NlbGVjdCcgJiYgKCFmLm9wdGlvbnMgfHwgZi5vcHRpb25zLmxlbmd0aCA9PT0gMCkpIHtcblx0XHRcdFx0cmV0dXJuIGBTZWxlY3QgZmllbGQgXCIke2YubmFtZX1cIiBtdXN0IGhhdmUgYXQgbGVhc3Qgb25lIG9wdGlvbi5gO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIXRoaXMuc2NoZW1hLmZpZWxkcy5zb21lKGYgPT4gZi5uYW1lID09PSB0aGlzLnNjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnMpKSB7XG5cdFx0XHRyZXR1cm4gJ0NvbHVtbnMgZmllbGQgbXVzdCBtYXRjaCBhbiBleGlzdGluZyBmaWVsZCBuYW1lLic7XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0cHJpdmF0ZSBmaWVsZChjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuXHRcdGNvbnN0IHdyYXAgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR3cmFwLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZpZWxkJyk7XG5cdFx0Y29uc3QgbGJsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcblx0XHRsYmwudGV4dENvbnRlbnQgPSBsYWJlbDtcblx0XHR3cmFwLmFwcGVuZENoaWxkKGxibCk7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHdyYXApO1xuXHRcdHJldHVybiB3cmFwO1xuXHR9XG5cblx0cHJpdmF0ZSBzbWFsbElucHV0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHBsYWNlaG9sZGVyOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBIVE1MSW5wdXRFbGVtZW50IHtcblx0XHRjb25zdCBpbnAgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuXHRcdGlucC50eXBlID0gJ3RleHQnO1xuXHRcdGlucC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dC1zbScpO1xuXHRcdGlucC5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xuXHRcdGlucC52YWx1ZSA9IHZhbHVlO1xuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChpbnApO1xuXHRcdHJldHVybiBpbnA7XG5cdH1cblxuXHRwcml2YXRlIGZpeGVkSW5wdXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgcGxhY2Vob2xkZXI6IHN0cmluZywgdmFsdWU6IHN0cmluZywgY2xzOiBzdHJpbmcpOiBIVE1MSW5wdXRFbGVtZW50IHtcblx0XHRjb25zdCBpbnAgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuXHRcdGlucC50eXBlID0gJ3RleHQnO1xuXHRcdGlucC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dC1zbScsIGNscyk7XG5cdFx0aW5wLnBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXI7XG5cdFx0aW5wLnZhbHVlID0gdmFsdWU7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGlucCk7XG5cdFx0cmV0dXJuIGlucDtcblx0fVxuXG5cdHByaXZhdGUgaWNvbkJ0bihjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCBkaXNhYmxlZDogYm9vbGVhbik6IEhUTUxCdXR0b25FbGVtZW50IHtcblx0XHRjb25zdCBidG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0XHRidG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaWNvbi1idG4nKTtcblx0XHRidG4udGV4dENvbnRlbnQgPSBsYWJlbDtcblx0XHRidG4uZGlzYWJsZWQgPSBkaXNhYmxlZDtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoYnRuKTtcblx0XHRyZXR1cm4gYnRuO1xuXHR9XG5cblx0b25DbG9zZSgpOiB2b2lkIHtcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuXHR9XG59XG4iLCAiaW1wb3J0IHsgQXBwIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgeyBCb2FyZCB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHJlbmRlckJvYXJkIH0gZnJvbSAnLi9ib2FyZCc7XG5pbXBvcnQgeyByZW9yZGVyQ2FyZCwgZGVsZXRlQ2FyZCwgY3JlYXRlQ2FyZCwgdXBkYXRlQ2FyZCB9IGZyb20gJy4uL21vZGVsL211dGF0aW9ucyc7XG5pbXBvcnQgeyBwYXJzZVdvcmtmbG93LCBpc1RyYW5zaXRpb25BbGxvd2VkIH0gZnJvbSAnLi4vZGF0YS93b3JrZmxvdyc7XG5pbXBvcnQgeyBDYXJkTW9kYWwgfSBmcm9tICcuL2NhcmQtbW9kYWwnO1xuaW1wb3J0IHsgQm9hcmRDb25maWdNb2RhbCB9IGZyb20gJy4vYm9hcmQtY29uZmlnLW1vZGFsJztcbmltcG9ydCB7IHJlY29uY2lsZUNhcmRzIH0gZnJvbSAnLi4vZGF0YS9zY2hlbWEnO1xuXG5leHBvcnQgdHlwZSBTYXZlRm4gPSAoYm9hcmQ6IEJvYXJkKSA9PiBQcm9taXNlPHZvaWQ+O1xuXG5leHBvcnQgZnVuY3Rpb24gbW91bnRCb2FyZChlbDogSFRNTEVsZW1lbnQsIGJvYXJkOiBCb2FyZCwgc2F2ZTogU2F2ZUZuLCBhcHA/OiBBcHApOiB2b2lkIHtcblx0d2hpbGUgKGVsLmZpcnN0Q2hpbGQpIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuXG5cdGNvbnN0IGRpc3BhdGNoID0gKG5ld0JvYXJkOiBCb2FyZCk6IHZvaWQgPT4ge1xuXHRcdHZvaWQgc2F2ZShuZXdCb2FyZCkudGhlbigoKSA9PiBtb3VudEJvYXJkKGVsLCBuZXdCb2FyZCwgc2F2ZSwgYXBwKSk7XG5cdH07XG5cblx0Y29uc3QgYm9hcmRFbCA9IHJlbmRlckJvYXJkKGJvYXJkKTtcblx0YXR0YWNoRHJhZ0Ryb3AoYm9hcmRFbCwgYm9hcmQsIGRpc3BhdGNoKTtcblx0YXR0YWNoQ2FyZEFjdGlvbnMoYm9hcmRFbCwgYm9hcmQsIGRpc3BhdGNoLCBhcHApO1xuXHRlbC5hcHBlbmRDaGlsZChib2FyZEVsKTtcbn1cblxuZnVuY3Rpb24gYXR0YWNoQ2FyZEFjdGlvbnMoYm9hcmRFbDogSFRNTEVsZW1lbnQsIGJvYXJkOiBCb2FyZCwgZGlzcGF0Y2g6IChiOiBCb2FyZCkgPT4gdm9pZCwgYXBwPzogQXBwKTogdm9pZCB7XG5cdGJvYXJkRWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuXHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuXG5cdFx0Y29uc3Qgc2V0dGluZ3NCdG4gPSB0YXJnZXQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1ib2FyZF9fc2V0dGluZ3MnKTtcblx0XHRpZiAoc2V0dGluZ3NCdG4gJiYgYXBwKSB7XG5cdFx0XHRuZXcgQm9hcmRDb25maWdNb2RhbChhcHAsIGJvYXJkLCAoc2NoZW1hKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHJlY29uY2lsZWRDYXJkcyA9IHJlY29uY2lsZUNhcmRzKHNjaGVtYS5maWVsZHMsIGJvYXJkLmNhcmRzKTtcblx0XHRcdFx0ZGlzcGF0Y2goeyAuLi5zY2hlbWEsIGNhcmRzOiByZWNvbmNpbGVkQ2FyZHMgfSk7XG5cdFx0XHR9KS5vcGVuKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWRkQnRuID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sX19hZGQtYnRuJyk7XG5cdFx0aWYgKGFkZEJ0bikge1xuXHRcdFx0Y29uc3QgY29sID0gYWRkQnRuLmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sdW1uJyk7XG5cdFx0XHRjb25zdCBjb2x1bW5WYWx1ZSA9IGNvbD8uZGF0YXNldC5jb2x1bW5WYWx1ZSA/PyAnJztcblx0XHRcdGlmIChhcHApIHtcblx0XHRcdFx0bmV3IENhcmRNb2RhbChhcHAsIGJvYXJkLCBudWxsLCBjb2x1bW5WYWx1ZSwgKHZhbHVlcykgPT4ge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGNyZWF0ZUNhcmQoYm9hcmQsIGNvbHVtblZhbHVlLCB2YWx1ZXMpKTtcblx0XHRcdFx0fSkub3BlbigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGlzcGF0Y2goY3JlYXRlQ2FyZChib2FyZCwgY29sdW1uVmFsdWUsIHt9KSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FyZEVsID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY2FyZCcpO1xuXHRcdGlmIChjYXJkRWwpIHtcblx0XHRcdGNvbnN0IGNhcmRJZCA9IGNhcmRFbC5kYXRhc2V0LmNhcmRJZCA/PyAnJztcblx0XHRcdGNvbnN0IGNhcmQgPSBib2FyZC5jYXJkcy5maW5kKGMgPT4gYy5pZCA9PT0gY2FyZElkKSA/PyBudWxsO1xuXHRcdFx0Y29uc3QgY29sdW1uVmFsdWUgPSBjYXJkRWwuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5may1jb2x1bW4nKT8uZGF0YXNldC5jb2x1bW5WYWx1ZSA/PyAnJztcblx0XHRcdGlmIChhcHAgJiYgY2FyZCkge1xuXHRcdFx0XHRuZXcgQ2FyZE1vZGFsKGFwcCwgYm9hcmQsIGNhcmQsIGNvbHVtblZhbHVlLCAodmFsdWVzKSA9PiB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2godXBkYXRlQ2FyZChib2FyZCwgY2FyZElkLCB2YWx1ZXMpKTtcblx0XHRcdFx0fSwgKCkgPT4ge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGRlbGV0ZUNhcmQoYm9hcmQsIGNhcmRJZCkpO1xuXHRcdFx0XHR9KS5vcGVuKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5zZXJ0QmVmb3JlSWQoY2xpZW50WTogbnVtYmVyLCBjb2w6IEhUTUxFbGVtZW50KTogc3RyaW5nIHwgbnVsbCB7XG5cdGNvbnN0IGNhcmRzID0gQXJyYXkuZnJvbShjb2wucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5may1jYXJkOm5vdCguZmstY2FyZC0tZHJhZ2dpbmcpJykpO1xuXHRmb3IgKGNvbnN0IGNhcmQgb2YgY2FyZHMpIHtcblx0XHRjb25zdCByZWN0ID0gY2FyZC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRpZiAoY2xpZW50WSA8IHJlY3QudG9wICsgcmVjdC5oZWlnaHQgLyAyKSByZXR1cm4gY2FyZC5kYXRhc2V0LmNhcmRJZCA/PyBudWxsO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVEcm9wSW5kaWNhdG9yKGNvbDogSFRNTEVsZW1lbnQsIGluc2VydEJlZm9yZUlkOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG5cdGNvbC5xdWVyeVNlbGVjdG9yQWxsKCcuZmstZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcblx0Y29uc3QgaW5kaWNhdG9yID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGluZGljYXRvci5jbGFzc0xpc3QuYWRkKCdmay1kcm9wLWluZGljYXRvcicpO1xuXHRjb25zdCBjYXJkc0VsID0gY29sLnF1ZXJ5U2VsZWN0b3IoJy5may1jb2x1bW5fX2NhcmRzJyk7XG5cdGlmICghY2FyZHNFbCkgcmV0dXJuO1xuXHRpZiAoaW5zZXJ0QmVmb3JlSWQgPT09IG51bGwpIHtcblx0XHRjYXJkc0VsLmFwcGVuZENoaWxkKGluZGljYXRvcik7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gY2FyZHNFbC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1jYXJkLWlkPVwiJHtpbnNlcnRCZWZvcmVJZH1cIl1gKTtcblx0XHRpZiAodGFyZ2V0KSBjYXJkc0VsLmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldCk7XG5cdFx0ZWxzZSBjYXJkc0VsLmFwcGVuZENoaWxkKGluZGljYXRvcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2xlYXJEcm9wU3RhdGUoYm9hcmRFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcblx0Ym9hcmRFbC5xdWVyeVNlbGVjdG9yQWxsKCcuZmstY2FyZC0tZHJhZ2dpbmcnKS5mb3JFYWNoKGMgPT4gYy5jbGFzc0xpc3QucmVtb3ZlKCdmay1jYXJkLS1kcmFnZ2luZycpKTtcblx0Ym9hcmRFbC5xdWVyeVNlbGVjdG9yQWxsKCcuZmstY29sdW1uLS1kcmFnLW92ZXInKS5mb3JFYWNoKGMgPT4gYy5jbGFzc0xpc3QucmVtb3ZlKCdmay1jb2x1bW4tLWRyYWctb3ZlcicpKTtcblx0Ym9hcmRFbC5xdWVyeVNlbGVjdG9yQWxsKCcuZmstZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbn1cblxuZnVuY3Rpb24gYXR0YWNoRHJhZ0Ryb3AoYm9hcmRFbDogSFRNTEVsZW1lbnQsIGJvYXJkOiBCb2FyZCwgZGlzcGF0Y2g6IChiOiBCb2FyZCkgPT4gdm9pZCk6IHZvaWQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLmZpZWxkcy5maW5kKGYgPT4gZi5uYW1lID09PSBib2FyZC52aWV3Q29uZmlnLmNvbHVtbnMpO1xuXHRjb25zdCBzdGF0dXNPcHRpb25zID0gY29sdW1uRmllbGQ/Lm9wdGlvbnMgPz8gW107XG5cdGNvbnN0IHdvcmtmbG93TWFwID0gcGFyc2VXb3JrZmxvdyhib2FyZC5yYXdXb3JrZmxvdyB8fCB1bmRlZmluZWQsIHN0YXR1c09wdGlvbnMpO1xuXG5cdGxldCBkcmFnZ2luZ0NhcmRJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cdGxldCBjdXJyZW50Q29sOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRsZXQgaW5zZXJ0QmVmb3JlSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG5cdGJvYXJkRWwuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCAoZSkgPT4ge1xuXHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuXHRcdGlmICh0YXJnZXQuY2xvc2VzdCgnYnV0dG9uJykpIHJldHVybjtcblx0XHRjb25zdCBjYXJkID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY2FyZCcpO1xuXHRcdGlmICghY2FyZCkgcmV0dXJuO1xuXG5cdFx0Y29uc3Qgc3RhcnRYID0gZS5jbGllbnRYO1xuXHRcdGNvbnN0IHN0YXJ0WSA9IGUuY2xpZW50WTtcblx0XHRsZXQgZHJhZ1N0YXJ0ZWQgPSBmYWxzZTtcblxuXHRcdGNvbnN0IG9uTW92ZSA9IChldjogUG9pbnRlckV2ZW50KSA9PiB7XG5cdFx0XHRpZiAoIWRyYWdTdGFydGVkKSB7XG5cdFx0XHRcdGNvbnN0IGR4ID0gZXYuY2xpZW50WCAtIHN0YXJ0WDtcblx0XHRcdFx0Y29uc3QgZHkgPSBldi5jbGllbnRZIC0gc3RhcnRZO1xuXHRcdFx0XHRpZiAoZHggKiBkeCArIGR5ICogZHkgPCAyNSkgcmV0dXJuO1xuXHRcdFx0XHRkcmFnU3RhcnRlZCA9IHRydWU7XG5cdFx0XHRcdGRyYWdnaW5nQ2FyZElkID0gY2FyZC5kYXRhc2V0LmNhcmRJZCA/PyBudWxsO1xuXHRcdFx0XHRjYXJkLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmQtLWRyYWdnaW5nJyk7XG5cdFx0XHR9XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgYmVsb3cgPSBhY3RpdmVEb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGV2LmNsaWVudFgsIGV2LmNsaWVudFkpO1xuXHRcdFx0Y29uc3QgY29sID0gYmVsb3c/LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sdW1uJykgPz8gbnVsbDtcblx0XHRcdGlmIChjb2wgIT09IGN1cnJlbnRDb2wpIHtcblx0XHRcdFx0Y3VycmVudENvbD8uY2xhc3NMaXN0LnJlbW92ZSgnZmstY29sdW1uLS1kcmFnLW92ZXInKTtcblx0XHRcdFx0Y3VycmVudENvbD8ucXVlcnlTZWxlY3RvckFsbCgnLmZrLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG5cdFx0XHRcdGN1cnJlbnRDb2wgPSBjb2w7XG5cdFx0XHRcdGNvbD8uY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uLS1kcmFnLW92ZXInKTtcblx0XHRcdH1cblx0XHRcdGlmIChjb2wpIHtcblx0XHRcdFx0aW5zZXJ0QmVmb3JlSWQgPSBnZXRJbnNlcnRCZWZvcmVJZChldi5jbGllbnRZLCBjb2wpO1xuXHRcdFx0XHR1cGRhdGVEcm9wSW5kaWNhdG9yKGNvbCwgaW5zZXJ0QmVmb3JlSWQpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRjb25zdCBvblVwID0gKCkgPT4ge1xuXHRcdFx0YWN0aXZlRG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBvbk1vdmUpO1xuXHRcdFx0YWN0aXZlRG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgb25VcCk7XG5cdFx0XHRpZiAoIWRyYWdTdGFydGVkKSByZXR1cm47XG5cdFx0XHRjb25zdCBjb2wgPSBjdXJyZW50Q29sO1xuXHRcdFx0Y2xlYXJEcm9wU3RhdGUoYm9hcmRFbCk7XG5cdFx0XHRpZiAoY29sICYmIGRyYWdnaW5nQ2FyZElkKSB7XG5cdFx0XHRcdGNvbnN0IHRvVmFsdWUgPSBjb2wuZGF0YXNldC5jb2x1bW5WYWx1ZSA/PyAnJztcblx0XHRcdFx0Y29uc3QgZHJhZ2dlZENhcmQgPSBib2FyZC5jYXJkcy5maW5kKGMgPT4gYy5pZCA9PT0gZHJhZ2dpbmdDYXJkSWQpO1xuXHRcdFx0XHRjb25zdCBmcm9tVmFsdWUgPSBkcmFnZ2VkQ2FyZD8udmFsdWVzW2JvYXJkLnZpZXdDb25maWcuY29sdW1uc10gPz8gJyc7XG5cdFx0XHRcdGlmIChmcm9tVmFsdWUgPT09IHRvVmFsdWUgfHwgaXNUcmFuc2l0aW9uQWxsb3dlZCh3b3JrZmxvd01hcCwgZnJvbVZhbHVlLCB0b1ZhbHVlKSkge1xuXHRcdFx0XHRcdGRpc3BhdGNoKHJlb3JkZXJDYXJkKGJvYXJkLCBkcmFnZ2luZ0NhcmRJZCwgdG9WYWx1ZSwgaW5zZXJ0QmVmb3JlSWQpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZHJhZ2dpbmdDYXJkSWQgPSBudWxsO1xuXHRcdFx0Y3VycmVudENvbCA9IG51bGw7XG5cdFx0XHRpbnNlcnRCZWZvcmVJZCA9IG51bGw7XG5cdFx0fTtcblxuXHRcdGFjdGl2ZURvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgb25Nb3ZlKTtcblx0XHRhY3RpdmVEb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCBvblVwKTtcblx0fSk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBWYXVsdCwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgdHlwZSB7IEJvYXJkIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuaW1wb3J0IHsgc2VyaWFsaXplQm9hcmQgfSBmcm9tICcuLi9kYXRhL3NlcmlhbGl6ZXInO1xuXG5leHBvcnQgdHlwZSBCbG9ja0xvY2F0aW9uID0geyBzdGFydDogbnVtYmVyOyBlbmQ6IG51bWJlciB9O1xuXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlQmxvY2soZmlsZUNvbnRlbnQ6IHN0cmluZywgYmxvY2tJbmRleDogbnVtYmVyKTogQmxvY2tMb2NhdGlvbiB8IG51bGwge1xuXHRjb25zdCByZWdleCA9IC9eYGBgZmFuY3kta2FuYmFuJFtcXHNcXFNdKj9eYGBgJC9nbTtcblx0bGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXHRsZXQgY291bnQgPSAwO1xuXG5cdHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKGZpbGVDb250ZW50KSkgIT09IG51bGwpIHtcblx0XHRpZiAoY291bnQgPT09IGJsb2NrSW5kZXgpIHtcblx0XHRcdHJldHVybiB7IHN0YXJ0OiBtYXRjaC5pbmRleCwgZW5kOiBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCB9O1xuXHRcdH1cblx0XHRjb3VudCsrO1xuXHR9XG5cblx0cmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaEJsb2NrKFxuXHRmaWxlQ29udGVudDogc3RyaW5nLFxuXHRzdGFydDogbnVtYmVyLFxuXHRlbmQ6IG51bWJlcixcblx0bmV3QmxvY2tUZXh0OiBzdHJpbmcsXG4pOiBzdHJpbmcge1xuXHRyZXR1cm4gZmlsZUNvbnRlbnQuc2xpY2UoMCwgc3RhcnQpICsgbmV3QmxvY2tUZXh0ICsgZmlsZUNvbnRlbnQuc2xpY2UoZW5kKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gd3JpdGVCYWNrKFxuXHR2YXVsdDogVmF1bHQsXG5cdGZpbGU6IFRGaWxlLFxuXHRibG9ja0luZGV4OiBudW1iZXIsXG5cdGJvYXJkOiBCb2FyZCxcbik6IFByb21pc2U8dm9pZD4ge1xuXHRjb25zdCBuZXdCbG9ja1RleHQgPSAnYGBgZmFuY3kta2FuYmFuXFxuJyArIHNlcmlhbGl6ZUJvYXJkKGJvYXJkKSArICdcXG5gYGAnO1xuXG5cdGF3YWl0IHZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcblx0XHRjb25zdCBsb2NhdGlvbiA9IGxvY2F0ZUJsb2NrKGNvbnRlbnQsIGJsb2NrSW5kZXgpO1xuXHRcdGlmICghbG9jYXRpb24pIHJldHVybiBjb250ZW50O1xuXHRcdHJldHVybiBwYXRjaEJsb2NrKGNvbnRlbnQsIGxvY2F0aW9uLnN0YXJ0LCBsb2NhdGlvbi5lbmQsIG5ld0Jsb2NrVGV4dCk7XG5cdH0pO1xufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgcGFyc2VCbG9jayB9IGZyb20gJy4uL2RhdGEvcGFyc2VyJztcbmltcG9ydCB7IGxvY2F0ZUJsb2NrIH0gZnJvbSAnLi93cml0ZS1iYWNrJztcbmltcG9ydCB3cml0ZUJhY2sgZnJvbSAnLi93cml0ZS1iYWNrJztcbmltcG9ydCB7IG1vdW50Qm9hcmQgfSBmcm9tICcuLi9yZW5kZXIvbW91bnQnO1xuXG5leHBvcnQgY29uc3QgVklFV19UWVBFX0ZBTkNZX0tBTkJBTiA9ICdmYW5jeS1rYW5iYW4tdmlldyc7XG5cbmV4cG9ydCBjb25zdCBCT0FSRF9URU1QTEFURSA9IGBcXGBcXGBcXGBmYW5jeS1rYW5iYW5cbi0tLVxudGl0bGU6IE5ldyBCb2FyZFxuZmllbGRzOlxuICAtIG5hbWU6IHRpdGxlLCB0eXBlOiBUZXh0LCBsYWJlbDogVGl0bGVcbiAgLSBuYW1lOiBzdGF0dXMsIHR5cGU6IFNlbGVjdCwgb3B0aW9uczogdG9kb3xkb2luZ3xkb25lLCBsYWJlbDogU3RhdHVzLCBkZWZhdWx0OiB0b2RvXG4tLS1cblxufCBfaWQgfCBUaXRsZSB8IFN0YXR1cyB8XG58LS0tLS18LS0tLS0tLXwtLS0tLS0tLXxcblxcYFxcYFxcYGA7XG5cbmV4cG9ydCBjbGFzcyBGYW5jeUthbmJhblZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG5cdHByaXZhdGUgYm9hcmRUaXRsZSA9ICdGYW5jeSBLYW5iYW4nO1xuXG5cdGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYpIHtcblx0XHRzdXBlcihsZWFmKTtcblx0fVxuXG5cdGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIFZJRVdfVFlQRV9GQU5DWV9LQU5CQU47XG5cdH1cblxuXHRnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xuXHRcdHJldHVybiB0aGlzLmJvYXJkVGl0bGU7XG5cdH1cblxuXHRnZXRJY29uKCk6IHN0cmluZyB7XG5cdFx0cmV0dXJuICdsYXlvdXQta2FuYmFuJztcblx0fVxuXG5cdGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcblxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuXHRcdGlmICghZmlsZSkge1xuXHRcdFx0Y29uc3QgZXJyID0gY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyBjbHM6ICdmay1lcnJvcicgfSk7XG5cdFx0XHRlcnIudGV4dENvbnRlbnQgPSAnTm8gZmlsZSBpcyBvcGVuLic7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG5cdFx0Y29uc3QgbG9jYXRpb24gPSBsb2NhdGVCbG9jayhjb250ZW50LCAwKTtcblx0XHRpZiAoIWxvY2F0aW9uKSB7XG5cdFx0XHRjb25zdCBlcnIgPSBjb250ZW50RWwuY3JlYXRlRWwoJ3AnLCB7IGNsczogJ2ZrLWVycm9yJyB9KTtcblx0XHRcdGVyci50ZXh0Q29udGVudCA9ICdObyBmYW5jeS1rYW5iYW4gYmxvY2sgZm91bmQgaW4gdGhpcyBmaWxlLic7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgYmxvY2tUZXh0ID0gY29udGVudC5zbGljZShsb2NhdGlvbi5zdGFydCwgbG9jYXRpb24uZW5kKTtcblx0XHRjb25zdCBpbm5lciA9IGJsb2NrVGV4dC5yZXBsYWNlKC9eYGBgZmFuY3kta2FuYmFuXFxuLywgJycpLnJlcGxhY2UoL1xcbmBgYCQvLCAnJyk7XG5cdFx0Y29uc3QgcmVzdWx0ID0gcGFyc2VCbG9jayhpbm5lcik7XG5cblx0XHRpZiAoIXJlc3VsdC5vaykge1xuXHRcdFx0Y29uc3QgZXJyID0gY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyBjbHM6ICdmay1lcnJvcicgfSk7XG5cdFx0XHRlcnIudGV4dENvbnRlbnQgPSByZXN1bHQuZXJyb3JzLm1hcChlID0+IGUubWVzc2FnZSkuam9pbignOyAnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLmJvYXJkVGl0bGUgPSByZXN1bHQuYm9hcmQudGl0bGU7XG5cdFx0Y29uc3Qgc2F2ZSA9IChib2FyZDogdHlwZW9mIHJlc3VsdC5ib2FyZCkgPT4gd3JpdGVCYWNrKHRoaXMuYXBwLnZhdWx0LCBmaWxlLCAwLCBib2FyZCk7XG5cdFx0bW91bnRCb2FyZChjb250ZW50RWwsIHJlc3VsdC5ib2FyZCwgc2F2ZSwgdGhpcy5hcHApO1xuXHR9XG5cblx0YXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuXHR9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUF1Qzs7O0FDQ3ZDLElBQUFDLG1CQUFzQjs7O0FDbUJmLElBQU0sb0JBQW9COzs7QUNwQjFCLElBQU0sMEJBQTBCO0FBT2hDLElBQU0seUJBQTBEO0FBQUEsRUFDdEUsTUFBTSxFQUFFLGFBQWEsUUFBUSxVQUFVLFFBQVE7QUFDaEQ7OztBQ0pPLFNBQVMsWUFBWSxZQUFpRTtBQUM1RixRQUFNLFFBQVEsV0FBVyxNQUFNLElBQUk7QUFDbkMsTUFBSSxRQUFRO0FBQ1osTUFBSSxjQUFjO0FBQ2xCLE1BQUk7QUFDSixNQUFJLFVBQVU7QUFDZCxRQUFNLFNBQTRCLENBQUM7QUFDbkMsUUFBTSxXQUE0QixDQUFDO0FBQ25DLE1BQUksV0FBVztBQUVmLGFBQVcsUUFBUSxPQUFPO0FBQ3pCLFVBQU0sVUFBVSxLQUFLLEtBQUs7QUFDMUIsUUFBSSxDQUFDLFFBQVM7QUFFZCxRQUFJLFlBQVksUUFBUSxXQUFXLElBQUksR0FBRztBQUN6QyxZQUFNLEVBQUUsT0FBTyxRQUFRLElBQUksZUFBZSxRQUFRLE1B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QUFNLEtBQUssU0FBUztBQUFBLElBQy9CLENBQUM7QUFFRCxTQUFLLFdBQVc7QUFBQSxNQUNmLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLGdCQUFnQixDQUFDLFdBQVc7QUFDM0IsY0FBTSxXQUFXLG9CQUFvQjtBQUFBLFVBQ3BDLE9BQU87QUFBQSxVQUNQLFFBQVE7QUFBQSxZQUNQLEVBQUUsTUFBTSxTQUFTLE1BQU0sUUFBUSxPQUFPLFFBQVE7QUFBQSxZQUM5QyxFQUFFLE1BQU0sVUFBVSxNQUFNLFVBQVUsT0FBTyxVQUFVLFNBQVMsQ0FBQyxRQUFRLFNBQVMsTUFBTSxHQUFHLFNBQVMsT0FBTztBQUFBLFVBQ3hHO0FBQUEsVUFDQSxZQUFZLEVBQUUsU0FBUyxTQUFTO0FBQUEsVUFDaEMsYUFBYTtBQUFBLFVBQ2IsU0FBUztBQUFBLFVBQ1QsT0FBTyxDQUFDO0FBQUEsUUFDVCxDQUFDO0FBQ0QsZUFBTyxhQUFhLFVBQVUsT0FBTyxVQUFVLENBQUM7QUFBQSxNQUNqRDtBQUFBLElBQ0QsQ0FBQztBQUFBLEVBQ0Y7QUFBQSxFQUVBLFdBQVc7QUFBQSxFQUVYO0FBQUEsRUFFUSxXQUFpQjtBQUN4QixRQUFJLGlCQUFpQixLQUFLLEtBQUssTUFBTSxDQUFDLFdBQVc7QUFDaEQsWUFBTSxXQUFXLE9BQU8sTUFBTSxLQUFLLEtBQUs7QUFDeEMsVUFBSSxXQUFXLEdBQUcsUUFBUTtBQUMxQixVQUFJLFVBQVU7QUFDZCxhQUFPLEtBQUssSUFBSSxNQUFNLHNCQUFzQixRQUFRLEdBQUc7QUFDdEQsbUJBQVcsR0FBRyxRQUFRLElBQUksT0FBTztBQUNqQztBQUFBLE1BQ0Q7QUFDQSxZQUFNLFVBQVUsb0JBQW9CLEVBQUUsR0FBRyxRQUFRLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFDNUQsV0FBSyxLQUFLLElBQUksTUFBTSxPQUFPLFVBQVUsT0FBTyxFQUFFLEtBQUssQ0FBQyxTQUFTO0FBQzVELFlBQUksZ0JBQWdCLHdCQUFPO0FBQzFCLGVBQUssS0FBSyxJQUFJLFVBQVUsUUFBUSxJQUFJLEVBQUUsU0FBUyxJQUFJO0FBQUEsUUFDcEQ7QUFBQSxNQUNELENBQUM7QUFBQSxJQUNGLENBQUMsRUFBRSxLQUFLO0FBQUEsRUFDVDtBQUNEOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJib2FyZFdyYXBwZXIiLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
