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

// src/data/schema.ts
function parseConfig(configText) {
  const lines = configText.split("\n");
  let title = "";
  let rawWorkflow = "";
  let lanes;
  let version = 1;
  const fields = [];
  let inFields = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (inFields && trimmed.startsWith("- ")) {
      fields.push(parseFieldLine(trimmed.slice(2)));
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
    viewConfig: { columns: "status", lanes }
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
  const field = {
    name: kvs["name"],
    type: kvs["type"],
    label: (_a = kvs["label"]) != null ? _a : kvs["name"]
  };
  if (kvs["options"] !== void 0) field.options = kvs["options"].split("|");
  if (kvs["default"] !== void 0) field.default = kvs["default"];
  return field;
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
    const schema = parseConfig(configText);
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
    const { cards: rawCards, warnings } = parseTable(tableText, schema.fields);
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
var FIELD_TYPES = ["Text", "Textarea", "Date", "Number", "Select", "File"];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyIsICJzcmMvaW50ZWdyYXRpb24vcG9zdHByb2Nlc3Nvci50cyIsICJzcmMvbW9kZWwvYm9hcmQudHMiLCAic3JjL2RhdGEvc2NoZW1hLnRzIiwgInNyYy9kYXRhL3BhcnNlci50cyIsICJzcmMvcmVuZGVyL2NhcmQudHMiLCAic3JjL3JlbmRlci9jb2x1bW4udHMiLCAic3JjL3JlbmRlci9ib2FyZC50cyIsICJzcmMvZGF0YS9zZXJpYWxpemVyLnRzIiwgInNyYy9tb2RlbC9tdXRhdGlvbnMudHMiLCAic3JjL2RhdGEvd29ya2Zsb3cudHMiLCAic3JjL3JlbmRlci9jYXJkLW1vZGFsLnRzIiwgInNyYy9yZW5kZXIvYm9hcmQtY29uZmlnLW1vZGFsLnRzIiwgInNyYy9yZW5kZXIvbW91bnQudHMiLCAic3JjL2ludGVncmF0aW9uL3dyaXRlLWJhY2sudHMiLCAic3JjL2ludGVncmF0aW9uL3N0YW5kYWxvbmUtdmlldy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgYWRkSWNvbiwgUGx1Z2luLCBURmlsZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IHJlZ2lzdGVyUG9zdFByb2Nlc3NvciB9IGZyb20gJy4vc3JjL2ludGVncmF0aW9uL3Bvc3Rwcm9jZXNzb3InO1xuaW1wb3J0IHsgRmFuY3lLYW5iYW5WaWV3LCBWSUVXX1RZUEVfRkFOQ1lfS0FOQkFOIH0gZnJvbSAnLi9zcmMvaW50ZWdyYXRpb24vc3RhbmRhbG9uZS12aWV3JztcbmltcG9ydCB7IEJvYXJkQ29uZmlnTW9kYWwgfSBmcm9tICcuL3NyYy9yZW5kZXIvYm9hcmQtY29uZmlnLW1vZGFsJztcbmltcG9ydCB7IHNlcmlhbGl6ZUJvYXJkQmxvY2sgfSBmcm9tICcuL3NyYy9kYXRhL3NlcmlhbGl6ZXInO1xuXG5jb25zdCBGQU5DWV9LQU5CQU5fSUNPTiA9ICdmYW5jeS1rYW5iYW4taWNvbic7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVySWNvbigpOiB2b2lkIHtcblx0YWRkSWNvbihGQU5DWV9LQU5CQU5fSUNPTiwgYDxnIHRyYW5zZm9ybT1cInNjYWxlKDQuMTY2NylcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNDRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj5cbjxwYXRoIGQ9XCJNOC4yIDExSDUuOEM1LjM1ODE3IDExIDUgMTEuMjk4NSA1IDExLjY2NjdWMjIuMzMzM0M1IDIyLjcwMTUgNS4zNTgxNyAyMyA1LjggMjNIOC4yQzguNjQxODMgMjMgOSAyMi43MDE1IDkgMjIuMzMzM1YxMS42NjY3QzkgMTEuMjk4NSA4LjY0MTgzIDExIDguMiAxMVpcIi8+XG48cGF0aCBkPVwiTTEzLjIgMTFIMTAuOEMxMC4zNTgyIDExIDEwIDExLjI5ODUgMTAgMTEuNjY2N1YxOC4zMzMzQzEwIDE4LjcwMTUgMTAuMzU4MiAxOSAxMC44IDE5SDEzLjJDMTMuNjQxOCAxOSAxNCAxOC43MDE1IDE0IDE4LjMzMzNWMTEuNjY2N0MxNCAxMS4yOTg1IDEzLjY0MTggMTEgMTMuMiAxMVpcIi8+XG48cGF0aCBkPVwiTTE4LjIgMTFIMTUuOEMxNS4zNTgyIDExIDE1IDExLjI2ODYgMTUgMTEuNlYxOS40QzE1IDE5LjczMTQgMTUuMzU4MiAyMCAxNS44IDIwSDE4LjJDMTguNjQxOCAyMCAxOSAxOS43MzE0IDE5IDE5LjRWMTEuNkMxOSAxMS4yNjg2IDE4LjY0MTggMTEgMTguMiAxMVpcIi8+XG48cGF0aCBkPVwiTTE4LjMwMDEgOC4yMDA2TDE2LjQwMTEgMi4yMDkyOUMxNi4zMTc5IDEuOTcwMDIgMTYuMTg1MyAxLjc1MDk4IDE2LjAxMTcgMS41NjY1MUMxNS44MzgxIDEuMzgyMDMgMTUuNjI3NSAxLjIzNjI3IDE1LjM5MzggMS4xMzg3NUMxNS4xNiAxLjA0MTIzIDE0LjkwODIgMC45OTQxNDUgMTQuNjU1IDEuMDAwNThDMTQuNDAxOCAxLjAwNzAyIDE0LjE1MjggMS4wNjY4MiAxMy45MjQzIDEuMTc2MDlMMTIuNzc1OSAxLjcyNTA5QzEyLjUzMzYgMS44NDA3MSAxMi4yNjg1IDEuOTAwNjggMTIuMDAwMSAxLjkwMDU5SDguODUwMDdDOC40NTc5OCAxLjkwMDUyIDguMDc2NTkgMi4wMjg0NiA3Ljc2Mzg3IDIuMjY0OTlDNy40NTExNSAyLjUwMTUyIDcuMjI0MjIgMi44MzM2OSA3LjExNzU3IDMuMjEwOTlMNS43MDAwNyA4LjIwMDZcIi8+XG48cGF0aCBkPVwiTTMgOC4yMDA0NEgyMVwiLz5cbjwvZz5gKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmFuY3lLYW5iYW5QbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuXHRhc3luYyBvbmxvYWQoKSB7XG5cdFx0cmVnaXN0ZXJJY29uKCk7XG5cdFx0dGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX0ZBTkNZX0tBTkJBTiwgKGxlYWYpID0+IG5ldyBGYW5jeUthbmJhblZpZXcobGVhZikpO1xuXG5cdFx0cmVnaXN0ZXJQb3N0UHJvY2Vzc29yKHRoaXMpO1xuXG5cdFx0dGhpcy5hZGRSaWJib25JY29uKEZBTkNZX0tBTkJBTl9JQ09OLCAnTmV3IEZhbmN5IEthbmJhbiBib2FyZCcsICgpID0+IHtcblx0XHRcdHRoaXMubmV3Qm9hcmQoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XG5cdFx0XHRpZDogJ25ldy1ib2FyZCcsXG5cdFx0XHRuYW1lOiAnTmV3IGJvYXJkJyxcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB0aGlzLm5ld0JvYXJkKCksXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZENvbW1hbmQoe1xuXHRcdFx0aWQ6ICdpbnNlcnQtYm9hcmQnLFxuXHRcdFx0bmFtZTogJ0luc2VydCBib2FyZCcsXG5cdFx0XHRlZGl0b3JDYWxsYmFjazogKGVkaXRvcikgPT4ge1xuXHRcdFx0XHRjb25zdCB0ZW1wbGF0ZSA9IHNlcmlhbGl6ZUJvYXJkQmxvY2soe1xuXHRcdFx0XHRcdHRpdGxlOiAnTmV3IEJvYXJkJyxcblx0XHRcdFx0XHRmaWVsZHM6IFtcblx0XHRcdFx0XHRcdHsgbmFtZTogJ3RpdGxlJywgdHlwZTogJ1RleHQnLCBsYWJlbDogJ1RpdGxlJyB9LFxuXHRcdFx0XHRcdFx0eyBuYW1lOiAnc3RhdHVzJywgdHlwZTogJ1NlbGVjdCcsIGxhYmVsOiAnU3RhdHVzJywgb3B0aW9uczogWyd0b2RvJywgJ2RvaW5nJywgJ2RvbmUnXSwgZGVmYXVsdDogJ3RvZG8nIH0sXG5cdFx0XHRcdFx0XSxcblx0XHRcdFx0XHR2aWV3Q29uZmlnOiB7IGNvbHVtbnM6ICdzdGF0dXMnIH0sXG5cdFx0XHRcdFx0cmF3V29ya2Zsb3c6ICcnLFxuXHRcdFx0XHRcdHZlcnNpb246IDEsXG5cdFx0XHRcdFx0Y2FyZHM6IFtdLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZWRpdG9yLnJlcGxhY2VSYW5nZSh0ZW1wbGF0ZSwgZWRpdG9yLmdldEN1cnNvcigpKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cblxuXHRvbnVubG9hZCgpIHtcblx0XHQvLyBpbnRlbnRpb25hbGx5IGVtcHR5IFx1MjAxNCBPYnNpZGlhbiBoYW5kbGVzIGxlYWYgY2xlYW51cFxuXHR9XG5cblx0cHJpdmF0ZSBuZXdCb2FyZCgpOiB2b2lkIHtcblx0XHRuZXcgQm9hcmRDb25maWdNb2RhbCh0aGlzLmFwcCwgbnVsbCwgKHNjaGVtYSkgPT4ge1xuXHRcdFx0Y29uc3QgYmFzZU5hbWUgPSBzY2hlbWEudGl0bGUudHJpbSgpIHx8ICdOZXcgQm9hcmQnO1xuXHRcdFx0bGV0IGZpbGVOYW1lID0gYCR7YmFzZU5hbWV9Lm1kYDtcblx0XHRcdGxldCBjb3VudGVyID0gMjtcblx0XHRcdHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZU5hbWUpKSB7XG5cdFx0XHRcdGZpbGVOYW1lID0gYCR7YmFzZU5hbWV9ICR7Y291bnRlcn0ubWRgO1xuXHRcdFx0XHRjb3VudGVyKys7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBjb250ZW50ID0gc2VyaWFsaXplQm9hcmRCbG9jayh7IC4uLnNjaGVtYSwgY2FyZHM6IFtdIH0pO1xuXHRcdFx0dm9pZCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZU5hbWUsIGNvbnRlbnQpLnRoZW4oKGZpbGUpID0+IHtcblx0XHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuXHRcdFx0XHRcdHZvaWQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pLm9wZW4oKTtcblx0fVxufVxuIiwgImltcG9ydCB0eXBlIHsgUGx1Z2luLCBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBwYXJzZUJsb2NrIH0gZnJvbSAnLi4vZGF0YS9wYXJzZXInO1xuaW1wb3J0IHR5cGUgeyBQYXJzZUlzc3VlIH0gZnJvbSAnLi4vZGF0YS9wYXJzZXInO1xuaW1wb3J0IHsgbW91bnRCb2FyZCB9IGZyb20gJy4uL3JlbmRlci9tb3VudCc7XG5pbXBvcnQgd3JpdGVCYWNrIGZyb20gJy4vd3JpdGUtYmFjayc7XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9ja0luZGV4RnJvbUNvbnRleHQoY3R4OiBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0LCBlbDogSFRNTEVsZW1lbnQpOiBudW1iZXIge1xuXHRjb25zdCBpbmZvID0gY3R4LmdldFNlY3Rpb25JbmZvKGVsKTtcblx0aWYgKCFpbmZvKSByZXR1cm4gMDtcblx0Y29uc3QgbGluZXMgPSBpbmZvLnRleHQuc3BsaXQoJ1xcbicpO1xuXHRsZXQgY291bnQgPSAwO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8ubGluZVN0YXJ0OyBpKyspIHtcblx0XHRpZiAobGluZXNbaV0udHJpbUVuZCgpID09PSAnYGBgZmFuY3kta2FuYmFuJykgY291bnQrKztcblx0fVxuXHRyZXR1cm4gY291bnQ7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckVycm9yUGFuZWwoXG5cdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG5cdGVycm9yczogUGFyc2VJc3N1ZVtdLFxuXHRzb3VyY2U6IHN0cmluZyxcblx0b25Hb1RvU291cmNlOiAoKSA9PiB2b2lkLFxuKTogdm9pZCB7XG5cdGNvbnN0IHBhbmVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdHBhbmVsLmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsJyk7XG5cblx0Zm9yIChjb25zdCBlcnIgb2YgZXJyb3JzKSB7XG5cdFx0Y29uc3QgbXNnID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdG1zZy5jbGFzc0xpc3QuYWRkKCdmay1lcnJvcicpO1xuXHRcdG1zZy50ZXh0Q29udGVudCA9IGVyci5tZXNzYWdlO1xuXHRcdGlmIChlcnIuaGludCkge1xuXHRcdFx0Y29uc3QgaGludCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdGhpbnQuY2xhc3NMaXN0LmFkZCgnZmstZXJyb3ItcGFuZWxfX2hpbnQnKTtcblx0XHRcdGhpbnQudGV4dENvbnRlbnQgPSBgIFx1MjAxNCAke2Vyci5oaW50fWA7XG5cdFx0XHRtc2cuYXBwZW5kQ2hpbGQoaGludCk7XG5cdFx0fVxuXHRcdHBhbmVsLmFwcGVuZENoaWxkKG1zZyk7XG5cdH1cblxuXHRjb25zdCBwcmUgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwcmUnKTtcblx0cHJlLmNsYXNzTGlzdC5hZGQoJ2ZrLWVycm9yLXBhbmVsX19zb3VyY2UnKTtcblx0cHJlLnRleHRDb250ZW50ID0gc291cmNlO1xuXHRwYW5lbC5hcHBlbmRDaGlsZChwcmUpO1xuXG5cdGNvbnN0IGJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRidG4uY2xhc3NMaXN0LmFkZCgnZmstZXJyb3ItcGFuZWxfX2dvdG8nKTtcblx0YnRuLnRleHRDb250ZW50ID0gJ0dvIHRvIHNvdXJjZSc7XG5cdGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG9uR29Ub1NvdXJjZSk7XG5cdHBhbmVsLmFwcGVuZENoaWxkKGJ0bik7XG5cblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHBhbmVsKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyV2FybmluZ0Jhbm5lcihjb250YWluZXI6IEhUTUxFbGVtZW50LCB3YXJuaW5nczogUGFyc2VJc3N1ZVtdKTogdm9pZCB7XG5cdGNvbnN0IGJhbm5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRiYW5uZXIuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXInKTtcblxuXHRjb25zdCBib2R5ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGJvZHkuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXJfX2JvZHknKTtcblx0Zm9yIChjb25zdCB3IG9mIHdhcm5pbmdzKSB7XG5cdFx0Y29uc3QgaXRlbSA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRpdGVtLmNsYXNzTGlzdC5hZGQoJ2ZrLXdhcm5pbmctYmFubmVyX19pdGVtJyk7XG5cdFx0aXRlbS50ZXh0Q29udGVudCA9IHcubWVzc2FnZTtcblx0XHRib2R5LmFwcGVuZENoaWxkKGl0ZW0pO1xuXHR9XG5cdGJhbm5lci5hcHBlbmRDaGlsZChib2R5KTtcblxuXHRjb25zdCBkaXNtaXNzID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdGRpc21pc3MuY2xhc3NMaXN0LmFkZCgnZmstd2FybmluZy1iYW5uZXJfX2Rpc21pc3MnKTtcblx0ZGlzbWlzcy50ZXh0Q29udGVudCA9ICdcdTAwRDcnO1xuXHRkaXNtaXNzLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdEaXNtaXNzIHdhcm5pbmdzJyk7XG5cdGRpc21pc3MuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBiYW5uZXIucmVtb3ZlKCkpO1xuXHRiYW5uZXIuYXBwZW5kQ2hpbGQoZGlzbWlzcyk7XG5cblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGJhbm5lcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlclBvc3RQcm9jZXNzb3IocGx1Z2luOiBQbHVnaW4pOiB2b2lkIHtcblx0cGx1Z2luLnJlZ2lzdGVyTWFya2Rvd25Db2RlQmxvY2tQcm9jZXNzb3IoJ2ZhbmN5LWthbmJhbicsIChzb3VyY2UsIGVsLCBjdHgpID0+IHtcblx0XHRjb25zdCByZXN1bHQgPSBwYXJzZUJsb2NrKHNvdXJjZSk7XG5cdFx0aWYgKCFyZXN1bHQub2spIHtcblx0XHRcdHJlbmRlckVycm9yUGFuZWwoZWwsIHJlc3VsdC5lcnJvcnMsIHNvdXJjZSwgKCkgPT4ge1xuXHRcdFx0XHR2b2lkIHBsdWdpbi5hcHAud29ya3NwYWNlLm9wZW5MaW5rVGV4dChjdHguc291cmNlUGF0aCwgJycsIGZhbHNlKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGFic3RyYWN0ID0gcGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY3R4LnNvdXJjZVBhdGgpO1xuXHRcdGNvbnN0IGZpbGUgPSBhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlID8gYWJzdHJhY3QgOiBudWxsO1xuXG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRpZiAocmVzdWx0Lndhcm5pbmdzLmxlbmd0aCA+IDApIHJlbmRlcldhcm5pbmdCYW5uZXIoZWwsIHJlc3VsdC53YXJuaW5ncyk7XG5cdFx0XHRjb25zdCBib2FyZFdyYXBwZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdGVsLmFwcGVuZENoaWxkKGJvYXJkV3JhcHBlcik7XG5cdFx0XHRtb3VudEJvYXJkKGJvYXJkV3JhcHBlciwgcmVzdWx0LmJvYXJkLCAoKSA9PiBQcm9taXNlLnJlc29sdmUoKSwgcGx1Z2luLmFwcCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdC5yZWFkb25seSkge1xuXHRcdFx0Y29uc3QgYmFubmVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdFx0YmFubmVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWJhbm5lcicsICdmay1iYW5uZXItLXdhcm5pbmcnKTtcblx0XHRcdGJhbm5lci50ZXh0Q29udGVudCA9IHJlc3VsdC5yZWFkb25seVJlYXNvbiA/PyAnJztcblx0XHRcdGVsLmFwcGVuZENoaWxkKGJhbm5lcik7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdC53YXJuaW5ncy5sZW5ndGggPiAwKSByZW5kZXJXYXJuaW5nQmFubmVyKGVsLCByZXN1bHQud2FybmluZ3MpO1xuXG5cdFx0Y29uc3QgYm9hcmRXcmFwcGVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZWwuYXBwZW5kQ2hpbGQoYm9hcmRXcmFwcGVyKTtcblx0XHRjb25zdCBibG9ja0luZGV4ID0gYmxvY2tJbmRleEZyb21Db250ZXh0KGN0eCwgZWwpO1xuXHRcdGNvbnN0IHNhdmUgPSByZXN1bHQucmVhZG9ubHlcblx0XHRcdD8gKCkgPT4gUHJvbWlzZS5yZXNvbHZlKClcblx0XHRcdDogKGI6IHR5cGVvZiByZXN1bHQuYm9hcmQpID0+IHdyaXRlQmFjayhwbHVnaW4uYXBwLnZhdWx0LCBmaWxlLCBibG9ja0luZGV4LCBiKTtcblxuXHRcdG1vdW50Qm9hcmQoYm9hcmRXcmFwcGVyLCByZXN1bHQuYm9hcmQsIHNhdmUsIHBsdWdpbi5hcHApO1xuXHR9KTtcbn1cbiIsICJleHBvcnQgdHlwZSBGaWVsZFR5cGUgPSAnVGV4dCcgfCAnVGV4dGFyZWEnIHwgJ0RhdGUnIHwgJ051bWJlcicgfCAnU2VsZWN0JyB8ICdGaWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBGaWVsZERlZmluaXRpb24ge1xuXHRuYW1lOiBzdHJpbmc7XG5cdHR5cGU6IEZpZWxkVHlwZTtcblx0bGFiZWw6IHN0cmluZztcblx0b3B0aW9ucz86IHN0cmluZ1tdO1xuXHRkZWZhdWx0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXdDb25maWcge1xuXHRjb2x1bW5zOiBzdHJpbmc7XG5cdGxhbmVzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENhcmQge1xuXHRpZDogc3RyaW5nO1xuXHR2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBjb25zdCBTVVBQT1JURURfVkVSU0lPTiA9IDE7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9hcmRTY2hlbWEge1xuXHR0aXRsZTogc3RyaW5nO1xuXHRmaWVsZHM6IEZpZWxkRGVmaW5pdGlvbltdO1xuXHR2aWV3Q29uZmlnOiBWaWV3Q29uZmlnO1xuXHRyYXdXb3JrZmxvdzogc3RyaW5nO1xuXHR2ZXJzaW9uOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9hcmQgZXh0ZW5kcyBCb2FyZFNjaGVtYSB7XG5cdGNhcmRzOiBDYXJkW107XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZFNjaGVtYSwgQ2FyZCwgRmllbGREZWZpbml0aW9uLCBGaWVsZFR5cGUgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbmZpZyhjb25maWdUZXh0OiBzdHJpbmcpOiBCb2FyZFNjaGVtYSB7XG5cdGNvbnN0IGxpbmVzID0gY29uZmlnVGV4dC5zcGxpdCgnXFxuJyk7XG5cdGxldCB0aXRsZSA9ICcnO1xuXHRsZXQgcmF3V29ya2Zsb3cgPSAnJztcblx0bGV0IGxhbmVzOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cdGxldCB2ZXJzaW9uID0gMTtcblx0Y29uc3QgZmllbGRzOiBGaWVsZERlZmluaXRpb25bXSA9IFtdO1xuXHRsZXQgaW5GaWVsZHMgPSBmYWxzZTtcblxuXHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XG5cdFx0aWYgKCF0cmltbWVkKSBjb250aW51ZTtcblxuXHRcdGlmIChpbkZpZWxkcyAmJiB0cmltbWVkLnN0YXJ0c1dpdGgoJy0gJykpIHtcblx0XHRcdGZpZWxkcy5wdXNoKHBhcnNlRmllbGRMaW5lKHRyaW1tZWQuc2xpY2UoMikpKTtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdGluRmllbGRzID0gZmFsc2U7XG5cblx0XHRjb25zdCBjb2xvbklkeCA9IHRyaW1tZWQuaW5kZXhPZignOicpO1xuXHRcdGlmIChjb2xvbklkeCA9PT0gLTEpIGNvbnRpbnVlO1xuXG5cdFx0Y29uc3Qga2V5ID0gdHJpbW1lZC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpO1xuXHRcdGNvbnN0IHZhbHVlID0gdHJpbW1lZC5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKTtcblxuXHRcdGlmIChrZXkgPT09ICd0aXRsZScpIHRpdGxlID0gdmFsdWU7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAndmVyc2lvbicpIHZlcnNpb24gPSBwYXJzZUludCh2YWx1ZSwgMTApIHx8IDE7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAnd29ya2Zsb3cnKSByYXdXb3JrZmxvdyA9IHZhbHVlLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKTtcblx0XHRlbHNlIGlmIChrZXkgPT09ICdsYW5lcycpIGxhbmVzID0gdmFsdWU7XG5cdFx0ZWxzZSBpZiAoa2V5ID09PSAnZmllbGRzJykgaW5GaWVsZHMgPSB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHR0aXRsZSxcblx0XHRmaWVsZHMsXG5cdFx0cmF3V29ya2Zsb3csXG5cdFx0dmVyc2lvbixcblx0XHR2aWV3Q29uZmlnOiB7IGNvbHVtbnM6ICdzdGF0dXMnLCBsYW5lcyB9LFxuXHR9O1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpZWxkTGluZShsaW5lOiBzdHJpbmcpOiBGaWVsZERlZmluaXRpb24ge1xuXHRjb25zdCBrdnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblx0Y29uc3QgcGFydHMgPSBzcGxpdEZpZWxkUGFydHMobGluZSk7XG5cblx0Zm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XG5cdFx0Y29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKTtcblx0XHRpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZTtcblx0XHRjb25zdCBrZXkgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKCk7XG5cdFx0Y29uc3QgdmFsdWUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpO1xuXHRcdGlmIChrZXkpIGt2c1trZXldID0gdmFsdWU7XG5cdH1cblxuXHRpZiAoIWt2c1snbmFtZSddKSB0aHJvdyBuZXcgRXJyb3IoYEZpZWxkIGRlZmluaXRpb24gbWlzc2luZyAnbmFtZSc6ICR7bGluZX1gKTtcblx0aWYgKCFrdnNbJ3R5cGUnXSkgdGhyb3cgbmV3IEVycm9yKGBGaWVsZCBkZWZpbml0aW9uIG1pc3NpbmcgJ3R5cGUnOiAke2xpbmV9YCk7XG5cblx0Y29uc3QgZmllbGQ6IEZpZWxkRGVmaW5pdGlvbiA9IHtcblx0XHRuYW1lOiBrdnNbJ25hbWUnXSxcblx0XHR0eXBlOiBrdnNbJ3R5cGUnXSBhcyBGaWVsZFR5cGUsXG5cdFx0bGFiZWw6IGt2c1snbGFiZWwnXSA/PyBrdnNbJ25hbWUnXSxcblx0fTtcblxuXHRpZiAoa3ZzWydvcHRpb25zJ10gIT09IHVuZGVmaW5lZCkgZmllbGQub3B0aW9ucyA9IGt2c1snb3B0aW9ucyddLnNwbGl0KCd8Jyk7XG5cdGlmIChrdnNbJ2RlZmF1bHQnXSAhPT0gdW5kZWZpbmVkKSBmaWVsZC5kZWZhdWx0ID0ga3ZzWydkZWZhdWx0J107XG5cblx0cmV0dXJuIGZpZWxkO1xufVxuXG5mdW5jdGlvbiBzcGxpdEZpZWxkUGFydHMobGluZTogc3RyaW5nKTogc3RyaW5nW10ge1xuXHQvLyBTcGxpdCBvbiBjb21tYXMgYnV0IG5vdCB3aXRoaW4gdmFsdWVzIFx1MjAxNCBmaWVsZCB2YWx1ZXMgZG9uJ3QgY29udGFpbiBjb21tYXMgcGVyIHNwZWMsXG5cdC8vIHNvIGEgc2ltcGxlIHNwbGl0IGlzIHNhZmUgaGVyZS5cblx0cmV0dXJuIGxpbmUuc3BsaXQoJywnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29uY2lsZUNhcmRzKGZpZWxkczogRmllbGREZWZpbml0aW9uW10sIGNhcmRzOiBDYXJkW10pOiBDYXJkW10ge1xuXHRyZXR1cm4gY2FyZHMubWFwKGNhcmQgPT4ge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHsgLi4uY2FyZC52YWx1ZXMgfTtcblx0XHRmb3IgKGNvbnN0IGZpZWxkIG9mIGZpZWxkcykge1xuXHRcdFx0aWYgKCEoZmllbGQubmFtZSBpbiB2YWx1ZXMpKSB7XG5cdFx0XHRcdHZhbHVlc1tmaWVsZC5uYW1lXSA9IGZpZWxkLmRlZmF1bHQgPz8gJyc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7IC4uLmNhcmQsIHZhbHVlcyB9O1xuXHR9KTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkLCBGaWVsZERlZmluaXRpb24gfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyBTVVBQT1JURURfVkVSU0lPTiB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHBhcnNlQ29uZmlnLCByZWNvbmNpbGVDYXJkcyB9IGZyb20gJy4vc2NoZW1hJztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZUlzc3VlIHtcblx0Y29kZTogc3RyaW5nO1xuXHRtZXNzYWdlOiBzdHJpbmc7XG5cdGxpbmU/OiBudW1iZXI7XG5cdGhpbnQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBFX05PX0RFTElNSVRFUlMgPSAnRV9OT19ERUxJTUlURVJTJztcbmV4cG9ydCBjb25zdCBFX05PX1RJVExFID0gJ0VfTk9fVElUTEUnO1xuZXhwb3J0IGNvbnN0IEVfTk9fU1RBVFVTX0ZJRUxEID0gJ0VfTk9fU1RBVFVTX0ZJRUxEJztcbmV4cG9ydCBjb25zdCBXX1JPV19NQUxGT1JNRUQgPSAnV19ST1dfTUFMRk9STUVEJztcblxuZXhwb3J0IHR5cGUgUGFyc2VSZXN1bHQgPVxuXHR8IHsgb2s6IHRydWU7IGJvYXJkOiBCb2FyZDsgcmVhZG9ubHk6IGJvb2xlYW47IHJlYWRvbmx5UmVhc29uPzogc3RyaW5nOyB3YXJuaW5nczogUGFyc2VJc3N1ZVtdIH1cblx0fCB7IG9rOiBmYWxzZTsgZXJyb3JzOiBQYXJzZUlzc3VlW107IHdhcm5pbmdzOiBQYXJzZUlzc3VlW10gfTtcblxuLy8gU3BsaXRzIGEgbWFya2Rvd24gdGFibGUgcm93IG9uIHVuZXNjYXBlZCBwaXBlcyBvbmx5LlxuLy8gU3RyaXBzIHRoZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBwaXBlIGRlbGltaXRlcnMgb2YgdGhlIHJvdy5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdFJvdyhsaW5lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG5cdGNvbnN0IGNlbGxzOiBzdHJpbmdbXSA9IFtdO1xuXHRsZXQgY3VycmVudCA9ICcnO1xuXHRsZXQgaSA9IDA7XG5cblx0Ly8gU2tpcCB0aGUgbGVhZGluZyAnfCdcblx0aWYgKGxpbmVbMF0gPT09ICd8JykgaSA9IDE7XG5cblx0d2hpbGUgKGkgPCBsaW5lLmxlbmd0aCkge1xuXHRcdGlmIChsaW5lW2ldID09PSAnXFxcXCcgJiYgKGxpbmVbaSArIDFdID09PSAnfCcgfHwgbGluZVtpICsgMV0gPT09ICdcXFxcJykpIHtcblx0XHRcdGN1cnJlbnQgKz0gbGluZVtpXSArIGxpbmVbaSArIDFdO1xuXHRcdFx0aSArPSAyO1xuXHRcdH0gZWxzZSBpZiAobGluZVtpXSA9PT0gJ3wnKSB7XG5cdFx0XHRjZWxscy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0Y3VycmVudCA9ICcnO1xuXHRcdFx0aSsrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50ICs9IGxpbmVbaV07XG5cdFx0XHRpKys7XG5cdFx0fVxuXHR9XG5cblx0Ly8gVGhlIHRyYWlsaW5nICd8JyBjYXVzZXMgYW4gZW1wdHkgc3RyaW5nIGF0IHRoZSBlbmQgXHUyMDE0IGRyb3AgaXRcblx0aWYgKGN1cnJlbnQgIT09ICcnKSBjZWxscy5wdXNoKGN1cnJlbnQpO1xuXG5cdHJldHVybiBjZWxscztcbn1cblxuLy8gVW5lc2NhcGVzIGEgc2luZ2xlIGNlbGwgdmFsdWU6IDxicj4gXHUyMTkyIG5ld2xpbmUsIFxcfCBcdTIxOTIgfCwgXFxcXCBcdTIxOTIgXFwuIFRyaW1zIHdoaXRlc3BhY2UuXG5leHBvcnQgZnVuY3Rpb24gdW5lc2NhcGVDZWxsKGNlbGw6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBjZWxsXG5cdFx0LnRyaW0oKVxuXHRcdC5yZXBsYWNlKC88YnJcXC8/Pi9naSwgJ1xcbicpXG5cdFx0LnJlcGxhY2UoL1xcXFxbfF0vZywgJ3wnKVxuXHRcdC5yZXBsYWNlKC9cXFxcXFxcXC9nLCAnXFxcXCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUYWJsZSh0YWJsZVRleHQ6IHN0cmluZywgZmllbGRzOiBGaWVsZERlZmluaXRpb25bXSk6IHsgY2FyZHM6IENhcmRbXTsgd2FybmluZ3M6IFBhcnNlSXNzdWVbXSB9IHtcblx0Y29uc3QgbGluZXMgPSB0YWJsZVRleHQuc3BsaXQoJ1xcbicpLmZpbHRlcihsID0+IGwudHJpbSgpLnN0YXJ0c1dpdGgoJ3wnKSk7XG5cdGlmIChsaW5lcy5sZW5ndGggPCAyKSByZXR1cm4geyBjYXJkczogW10sIHdhcm5pbmdzOiBbXSB9O1xuXG5cdGNvbnN0IGhlYWRlckNlbGxzID0gc3BsaXRSb3cobGluZXNbMF0pLm1hcChjID0+IHVuZXNjYXBlQ2VsbChjKS50b0xvd2VyQ2FzZSgpKTtcblx0Ly8gbGluZXNbMV0gaXMgdGhlIHNlcGFyYXRvciByb3cgXHUyMDE0IHNraXAgaXRcblx0Y29uc3QgZGF0YUxpbmVzID0gbGluZXMuc2xpY2UoMik7XG5cblx0Ly8gQnVpbGQgbGFiZWwgXHUyMTkyIGZpZWxkIG5hbWUgbWFwIChjYXNlLWluc2Vuc2l0aXZlKVxuXHRjb25zdCBsYWJlbFRvRmllbGQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGZpZWxkcykge1xuXHRcdGxhYmVsVG9GaWVsZC5zZXQoZmllbGQubGFiZWwudG9Mb3dlckNhc2UoKSwgZmllbGQubmFtZSk7XG5cdH1cblxuXHRjb25zdCBjYXJkczogQ2FyZFtdID0gW107XG5cdGNvbnN0IHdhcm5pbmdzOiBQYXJzZUlzc3VlW10gPSBbXTtcblxuXHRmb3IgKGxldCByb3dJZHggPSAwOyByb3dJZHggPCBkYXRhTGluZXMubGVuZ3RoOyByb3dJZHgrKykge1xuXHRcdGNvbnN0IGxpbmUgPSBkYXRhTGluZXNbcm93SWR4XTtcblx0XHRjb25zdCBjZWxscyA9IHNwbGl0Um93KGxpbmUpLm1hcCh1bmVzY2FwZUNlbGwpO1xuXG5cdFx0aWYgKGNlbGxzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0d2FybmluZ3MucHVzaCh7XG5cdFx0XHRcdGNvZGU6IFdfUk9XX01BTEZPUk1FRCxcblx0XHRcdFx0bWVzc2FnZTogYFJvdyAke3Jvd0lkeCArIDF9IGNvdWxkIG5vdCBiZSBwYXJzZWQgYW5kIHdhcyBza2lwcGVkYCxcblx0XHRcdFx0bGluZTogcm93SWR4ICsgMSxcblx0XHRcdH0pO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaWQgPSBoZWFkZXJDZWxsc1swXSA9PT0gJ19pZCcgPyAoY2VsbHNbMF0gPz8gJycpIDogJyc7XG5cdFx0Y29uc3Qgc3RhcnRJZHggPSBoZWFkZXJDZWxsc1swXSA9PT0gJ19pZCcgPyAxIDogMDtcblxuXHRcdGNvbnN0IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRcdGZvciAobGV0IGkgPSBzdGFydElkeDsgaSA8IGhlYWRlckNlbGxzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb25zdCBsYWJlbCA9IGhlYWRlckNlbGxzW2ldO1xuXHRcdFx0Y29uc3QgZmllbGROYW1lID0gbGFiZWxUb0ZpZWxkLmdldChsYWJlbCkgPz8gbGFiZWw7XG5cdFx0XHR2YWx1ZXNbZmllbGROYW1lXSA9IGNlbGxzW2ldID8/ICcnO1xuXHRcdH1cblxuXHRcdGNhcmRzLnB1c2goeyBpZCwgdmFsdWVzIH0pO1xuXHR9XG5cblx0cmV0dXJuIHsgY2FyZHMsIHdhcm5pbmdzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUJsb2NrKGJsb2NrVGV4dDogc3RyaW5nKTogUGFyc2VSZXN1bHQge1xuXHR0cnkge1xuXHRcdGNvbnN0IHBhcnRzID0gYmxvY2tUZXh0LnNwbGl0KC9eLS0tJC9tKTtcblx0XHRpZiAocGFydHMubGVuZ3RoIDwgMykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcnM6IFt7IGNvZGU6IEVfTk9fREVMSU1JVEVSUywgbWVzc2FnZTogJ0Jsb2NrIG11c3QgY29udGFpbiB0d28gLS0tIGRlbGltaXRlcnMgc2VwYXJhdGluZyBjb25maWcgZnJvbSB0YWJsZScgfV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29uZmlnVGV4dCA9IHBhcnRzWzFdLnRyaW0oKTtcblx0XHRjb25zdCB0YWJsZVRleHQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCctLS0nKTtcblxuXHRcdGNvbnN0IHNjaGVtYSA9IHBhcnNlQ29uZmlnKGNvbmZpZ1RleHQpO1xuXHRcdGlmICghc2NoZW1hLnRpdGxlKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRvazogZmFsc2UsXG5cdFx0XHRcdGVycm9yczogW3sgY29kZTogRV9OT19USVRMRSwgbWVzc2FnZTogJ0JvYXJkIGNvbmZpZyBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZScgfV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29sdW1uc0ZpZWxkID0gc2NoZW1hLmZpZWxkcy5maW5kKGYgPT4gZi5uYW1lID09PSBzY2hlbWEudmlld0NvbmZpZy5jb2x1bW5zKTtcblx0XHRpZiAoIWNvbHVtbnNGaWVsZCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IGZhbHNlLFxuXHRcdFx0XHRlcnJvcnM6IFt7XG5cdFx0XHRcdFx0Y29kZTogRV9OT19TVEFUVVNfRklFTEQsXG5cdFx0XHRcdFx0bWVzc2FnZTogYENvbHVtbnMgZmllbGQgXCIke3NjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnN9XCIgaXMgbm90IGRlZmluZWQgaW4gZmllbGRzYCxcblx0XHRcdFx0XHRoaW50OiAnQWRkIGEgZmllbGQgd2l0aCB0aGF0IG5hbWUsIG9yIHVwZGF0ZSB0aGUgY29sdW1ucyBzZXR0aW5nIHRvIG1hdGNoIGFuIGV4aXN0aW5nIGZpZWxkJyxcblx0XHRcdFx0fV0sXG5cdFx0XHRcdHdhcm5pbmdzOiBbXSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgeyBjYXJkczogcmF3Q2FyZHMsIHdhcm5pbmdzIH0gPSBwYXJzZVRhYmxlKHRhYmxlVGV4dCwgc2NoZW1hLmZpZWxkcyk7XG5cdFx0Y29uc3QgY2FyZHMgPSByZWNvbmNpbGVDYXJkcyhzY2hlbWEuZmllbGRzLCByYXdDYXJkcyk7XG5cdFx0Y29uc3QgYm9hcmQ6IEJvYXJkID0geyAuLi5zY2hlbWEsIGNhcmRzIH07XG5cblx0XHRpZiAoc2NoZW1hLnZlcnNpb24gPiBTVVBQT1JURURfVkVSU0lPTikge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b2s6IHRydWUsXG5cdFx0XHRcdGJvYXJkLFxuXHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcblx0XHRcdFx0cmVhZG9ubHlSZWFzb246IGBUaGlzIGJvYXJkIHdhcyBjcmVhdGVkIHdpdGggdmVyc2lvbiAke3NjaGVtYS52ZXJzaW9ufSBvZiB0aGUgRmFuY3kgS2FuYmFuIGZvcm1hdC4gVXBkYXRlIHRoZSBwbHVnaW4gdG8gZWRpdCBpdC5gLFxuXHRcdFx0XHR3YXJuaW5ncyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHsgb2s6IHRydWUsIGJvYXJkLCByZWFkb25seTogZmFsc2UsIHdhcm5pbmdzIH07XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdHJldHVybiB7XG5cdFx0XHRvazogZmFsc2UsXG5cdFx0XHRlcnJvcnM6IFt7IGNvZGU6ICdFX1VORVhQRUNURUQnLCBtZXNzYWdlOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycikgfV0sXG5cdFx0XHR3YXJuaW5nczogW10sXG5cdFx0fTtcblx0fVxufVxuIiwgImltcG9ydCB0eXBlIHsgQ2FyZCwgRmllbGREZWZpbml0aW9uIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ2FyZChjYXJkOiBDYXJkLCBmaWVsZHM6IEZpZWxkRGVmaW5pdGlvbltdKTogSFRNTEVsZW1lbnQge1xuXHRjb25zdCBjb250YWluZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0Y29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmQnKTtcblx0Y29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmQtLWRyYWdnYWJsZScpO1xuXHRjb250YWluZXIuZGF0YXNldC5jYXJkSWQgPSBjYXJkLmlkO1xuXG5cdGNvbnN0IHRpdGxlRmllbGQgPSBmaWVsZHMuZmluZChmID0+IGYubmFtZSAhPT0gJ19pZCcpO1xuXG5cdGNvbnN0IHRpdGxlID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdHRpdGxlLmNsYXNzTGlzdC5hZGQoJ2ZrLWNhcmRfX3RpdGxlJyk7XG5cdHRpdGxlLnRleHRDb250ZW50ID0gY2FyZC52YWx1ZXNbdGl0bGVGaWVsZD8ubmFtZSA/PyAnJ10gPz8gJyc7XG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aXRsZSk7XG5cblx0cmV0dXJuIGNvbnRhaW5lcjtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IENhcmQsIEZpZWxkRGVmaW5pdGlvbiB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHJlbmRlckNhcmQgfSBmcm9tICcuL2NhcmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29sdW1uKFxuXHRuYW1lOiBzdHJpbmcsXG5cdGxhYmVsOiBzdHJpbmcsXG5cdGNhcmRzOiBDYXJkW10sXG5cdGZpZWxkczogRmllbGREZWZpbml0aW9uW10sXG4pOiBIVE1MRWxlbWVudCB7XG5cdGNvbnN0IGNvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uJyk7XG5cdGNvbnRhaW5lci5kYXRhc2V0LmNvbHVtblZhbHVlID0gbmFtZTtcblxuXHRjb25zdCBoZWFkZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0aGVhZGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWNvbHVtbl9faGVhZGVyJyk7XG5cblx0Y29uc3QgdGl0bGUgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHRpdGxlLmNsYXNzTGlzdC5hZGQoJ2ZrLWNvbHVtbl9fdGl0bGUnKTtcblx0dGl0bGUudGV4dENvbnRlbnQgPSBsYWJlbDtcblxuXHRjb25zdCBjb3VudCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0Y291bnQuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX19jb3VudCcpO1xuXHRjb3VudC50ZXh0Q29udGVudCA9IFN0cmluZyhjYXJkcy5sZW5ndGgpO1xuXG5cdGhlYWRlci5hcHBlbmRDaGlsZCh0aXRsZSk7XG5cdGhlYWRlci5hcHBlbmRDaGlsZChjb3VudCk7XG5cblx0Y29uc3QgY2FyZHNDb250YWluZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0Y2FyZHNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZmstY29sdW1uX19jYXJkcycpO1xuXG5cdGZvciAoY29uc3QgY2FyZCBvZiBjYXJkcykge1xuXHRcdGNhcmRzQ29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNhcmQoY2FyZCwgZmllbGRzKSk7XG5cdH1cblxuXHRjb25zdCBhZGRCdG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0YWRkQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLWNvbF9fYWRkLWJ0bicpO1xuXHRhZGRCdG4udGV4dENvbnRlbnQgPSAnKyBBZGQgY2FyZCc7XG5cblx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGhlYWRlcik7XG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZChjYXJkc0NvbnRhaW5lcik7XG5cdGNvbnRhaW5lci5hcHBlbmRDaGlsZChhZGRCdG4pO1xuXG5cdHJldHVybiBjb250YWluZXI7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZCB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHJlbmRlckNvbHVtbiB9IGZyb20gJy4vY29sdW1uJztcblxuZnVuY3Rpb24gY2FwaXRhbGlzZShzOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gcy5sZW5ndGggPT09IDAgPyBzIDogc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckJvYXJkKGJvYXJkOiBCb2FyZCk6IEhUTUxFbGVtZW50IHtcblx0Y29uc3Qgd3JhcHBlciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHR3cmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWJvYXJkJyk7XG5cblx0Y29uc3QgaGVhZGVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGhlYWRlci5jbGFzc0xpc3QuYWRkKCdmay1ib2FyZF9faGVhZGVyJyk7XG5cblx0Y29uc3Qgc2V0dGluZ3NCdG4gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcblx0c2V0dGluZ3NCdG4uY2xhc3NMaXN0LmFkZCgnZmstYm9hcmRfX3NldHRpbmdzJyk7XG5cdHNldHRpbmdzQnRuLnRleHRDb250ZW50ID0gJ1x1MjY5OSc7XG5cdHNldHRpbmdzQnRuLnRpdGxlID0gJ0JvYXJkIHNldHRpbmdzJztcblx0aGVhZGVyLmFwcGVuZENoaWxkKHNldHRpbmdzQnRuKTtcblxuXHRjb25zdCB0aXRsZUVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHR0aXRsZUVsLmNsYXNzTGlzdC5hZGQoJ2ZrLWJvYXJkX190aXRsZScpO1xuXHR0aXRsZUVsLnRleHRDb250ZW50ID0gYm9hcmQudGl0bGU7XG5cdGhlYWRlci5hcHBlbmRDaGlsZCh0aXRsZUVsKTtcblxuXHR3cmFwcGVyLmFwcGVuZENoaWxkKGhlYWRlcik7XG5cblx0Y29uc3QgY29sdW1uc0NvbnRhaW5lciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRjb2x1bW5zQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2ZrLWJvYXJkX19jb2x1bW5zJyk7XG5cblx0Y29uc3QgY29sdW1uRmllbGQgPSBib2FyZC5maWVsZHMuZmluZChmID0+IGYubmFtZSA9PT0gYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zKTtcblxuXHRpZiAoY29sdW1uRmllbGQ/Lm9wdGlvbnMpIHtcblx0XHRmb3IgKGNvbnN0IG9wdGlvbiBvZiBjb2x1bW5GaWVsZC5vcHRpb25zKSB7XG5cdFx0XHRjb25zdCBjYXJkcyA9IGJvYXJkLmNhcmRzLmZpbHRlcihjID0+IGMudmFsdWVzW2NvbHVtbkZpZWxkLm5hbWVdID09PSBvcHRpb24pO1xuXHRcdFx0Y29sdW1uc0NvbnRhaW5lci5hcHBlbmRDaGlsZChyZW5kZXJDb2x1bW4ob3B0aW9uLCBjYXBpdGFsaXNlKG9wdGlvbiksIGNhcmRzLCBib2FyZC5maWVsZHMpKTtcblx0XHR9XG5cdH1cblxuXHR3cmFwcGVyLmFwcGVuZENoaWxkKGNvbHVtbnNDb250YWluZXIpO1xuXHRyZXR1cm4gd3JhcHBlcjtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEJvYXJkLCBDYXJkIH0gZnJvbSAnLi4vbW9kZWwvYm9hcmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlQ2VsbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHZhbHVlXG5cdFx0LnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcblx0XHQucmVwbGFjZSgvXFx8L2csICdcXFxcfCcpXG5cdFx0LnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVJZCgpOiBzdHJpbmcge1xuXHRjb25zdCBjaGFycyA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuXHRsZXQgaWQgPSAnJztcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHtcblx0XHRpZCArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXTtcblx0fVxuXHRyZXR1cm4gaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVCb2FyZChib2FyZDogQm9hcmQpOiBzdHJpbmcge1xuXHRjb25zdCBjb25maWcgPSBzZXJpYWxpemVDb25maWcoYm9hcmQpO1xuXHRjb25zdCB0YWJsZSA9IHNlcmlhbGl6ZVRhYmxlKGJvYXJkKTtcblx0cmV0dXJuIGAtLS1cXG4ke2NvbmZpZ31cXG4tLS1cXG5cXG4ke3RhYmxlfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVCb2FyZEJsb2NrKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdHJldHVybiBgXFxgXFxgXFxgZmFuY3kta2FuYmFuXFxuJHtzZXJpYWxpemVCb2FyZChib2FyZCl9XFxuXFxgXFxgXFxgXFxuYDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplQ29uZmlnKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXHRsaW5lcy5wdXNoKGB2ZXJzaW9uOiAxYCk7XG5cdGxpbmVzLnB1c2goYHRpdGxlOiAke2JvYXJkLnRpdGxlfWApO1xuXHRsaW5lcy5wdXNoKCdmaWVsZHM6Jyk7XG5cdGZvciAoY29uc3QgZmllbGQgb2YgYm9hcmQuZmllbGRzKSB7XG5cdFx0bGV0IGxpbmUgPSBgICAtIG5hbWU6ICR7ZmllbGQubmFtZX0sIHR5cGU6ICR7ZmllbGQudHlwZX0sIGxhYmVsOiAke2ZpZWxkLmxhYmVsfWA7XG5cdFx0aWYgKGZpZWxkLm9wdGlvbnMgIT09IHVuZGVmaW5lZCkgbGluZSArPSBgLCBvcHRpb25zOiAke2ZpZWxkLm9wdGlvbnMuam9pbignfCcpfWA7XG5cdFx0aWYgKGZpZWxkLmRlZmF1bHQgIT09IHVuZGVmaW5lZCkgbGluZSArPSBgLCBkZWZhdWx0OiAke2ZpZWxkLmRlZmF1bHR9YDtcblx0XHRsaW5lcy5wdXNoKGxpbmUpO1xuXHR9XG5cdGlmIChib2FyZC52aWV3Q29uZmlnLmxhbmVzKSBsaW5lcy5wdXNoKGBsYW5lczogJHtib2FyZC52aWV3Q29uZmlnLmxhbmVzfWApO1xuXHRpZiAoYm9hcmQucmF3V29ya2Zsb3cpIGxpbmVzLnB1c2goYHdvcmtmbG93OiAke2JvYXJkLnJhd1dvcmtmbG93fWApO1xuXHRyZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVRhYmxlKGJvYXJkOiBCb2FyZCk6IHN0cmluZyB7XG5cdGNvbnN0IHNjaGVtYUZpZWxkTmFtZXMgPSBuZXcgU2V0KGJvYXJkLmZpZWxkcy5tYXAoZiA9PiBmLm5hbWUpKTtcblxuXHQvLyBDb2xsZWN0IG9ycGhhbmVkIGtleXMgZnJvbSBhbGwgY2FyZHMgKGtleXMgbm90IGluIHRoZSBjdXJyZW50IHNjaGVtYSlcblx0Y29uc3Qgb3JwaGFuZWRLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdGZvciAoY29uc3QgY2FyZCBvZiBib2FyZC5jYXJkcykge1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNhcmQudmFsdWVzKSkge1xuXHRcdFx0aWYgKCFzY2hlbWFGaWVsZE5hbWVzLmhhcyhrZXkpKSBvcnBoYW5lZEtleXMuYWRkKGtleSk7XG5cdFx0fVxuXHR9XG5cblx0Y29uc3Qgc2NoZW1hTGFiZWxzID0gYm9hcmQuZmllbGRzLm1hcChmID0+IGYubGFiZWwpO1xuXHRjb25zdCBhbGxMYWJlbHMgPSBbJ19pZCcsIC4uLnNjaGVtYUxhYmVscywgLi4ub3JwaGFuZWRLZXlzXTtcblxuXHRjb25zdCBoZWFkZXIgICAgPSBgfCAke2FsbExhYmVscy5qb2luKCcgfCAnKX0gfGA7XG5cdGNvbnN0IHNlcGFyYXRvciA9IGB8ICR7YWxsTGFiZWxzLm1hcCgoKSA9PiAnLS0tJykuam9pbignIHwgJyl9IHxgO1xuXG5cdGNvbnN0IHNlZW5JZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3Qgcm93cyA9IGJvYXJkLmNhcmRzLm1hcChjYXJkID0+IHNlcmlhbGl6ZVJvdyhjYXJkLCBib2FyZCwgb3JwaGFuZWRLZXlzLCBzZWVuSWRzKSk7XG5cblx0cmV0dXJuIFtoZWFkZXIsIHNlcGFyYXRvciwgLi4ucm93c10uam9pbignXFxuJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVJvdyhjYXJkOiBDYXJkLCBib2FyZDogQm9hcmQsIG9ycGhhbmVkS2V5czogU2V0PHN0cmluZz4sIHNlZW5JZHM6IFNldDxzdHJpbmc+KTogc3RyaW5nIHtcblx0bGV0IGlkID0gY2FyZC5pZCB8fCBnZW5lcmF0ZUlkKCk7XG5cdGlmIChzZWVuSWRzLmhhcyhpZCkpIGlkID0gZ2VuZXJhdGVJZCgpO1xuXHRzZWVuSWRzLmFkZChpZCk7XG5cdGNvbnN0IHNjaGVtYUNlbGxzID0gYm9hcmQuZmllbGRzLm1hcChmID0+IGVzY2FwZUNlbGwoY2FyZC52YWx1ZXNbZi5uYW1lXSA/PyAnJykpO1xuXHRjb25zdCBvcnBoYW5DZWxscyA9IFsuLi5vcnBoYW5lZEtleXNdLm1hcChrZXkgPT4gZXNjYXBlQ2VsbChjYXJkLnZhbHVlc1trZXldID8/ICcnKSk7XG5cdGNvbnN0IGNlbGxzID0gW2lkLCAuLi5zY2hlbWFDZWxscywgLi4ub3JwaGFuQ2VsbHNdO1xuXHRyZXR1cm4gYHwgJHtjZWxscy5qb2luKCcgfCAnKX0gfGA7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCb2FyZCwgQ2FyZCB9IGZyb20gJy4vYm9hcmQnO1xuaW1wb3J0IHsgZ2VuZXJhdGVJZCB9IGZyb20gJy4uL2RhdGEvc2VyaWFsaXplcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRDYXJkKGJvYXJkOiBCb2FyZCwgY29sdW1uVmFsdWU6IHN0cmluZyk6IEJvYXJkIHtcblx0Y29uc3QgY29sdW1uRmllbGQgPSBib2FyZC52aWV3Q29uZmlnLmNvbHVtbnM7XG5cdGNvbnN0IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGJvYXJkLmZpZWxkcykge1xuXHRcdHZhbHVlc1tmaWVsZC5uYW1lXSA9IGZpZWxkLm5hbWUgPT09IGNvbHVtbkZpZWxkID8gY29sdW1uVmFsdWUgOiAoZmllbGQuZGVmYXVsdCA/PyAnJyk7XG5cdH1cblx0Y29uc3QgbmV3Q2FyZDogQ2FyZCA9IHsgaWQ6IGdlbmVyYXRlSWQoKSwgdmFsdWVzIH07XG5cdHJldHVybiB7IC4uLmJvYXJkLCBjYXJkczogWy4uLmJvYXJkLmNhcmRzLCBuZXdDYXJkXSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlQ2FyZChib2FyZDogQm9hcmQsIGNhcmRJZDogc3RyaW5nKTogQm9hcmQge1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IGJvYXJkLmNhcmRzLmZpbHRlcihjYXJkID0+IGNhcmQuaWQgIT09IGNhcmRJZCkgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlb3JkZXJDYXJkKFxuXHRib2FyZDogQm9hcmQsXG5cdGNhcmRJZDogc3RyaW5nLFxuXHR0b0NvbHVtblZhbHVlOiBzdHJpbmcsXG5cdGluc2VydEJlZm9yZUlkOiBzdHJpbmcgfCBudWxsLFxuKTogQm9hcmQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucztcblx0Y29uc3QgZHJhZ2dlZCA9IGJvYXJkLmNhcmRzLmZpbmQoYyA9PiBjLmlkID09PSBjYXJkSWQpO1xuXHRpZiAoIWRyYWdnZWQpIHJldHVybiBib2FyZDtcblxuXHRjb25zdCB1cGRhdGVkQ2FyZCA9IHsgLi4uZHJhZ2dlZCwgdmFsdWVzOiB7IC4uLmRyYWdnZWQudmFsdWVzLCBbY29sdW1uRmllbGRdOiB0b0NvbHVtblZhbHVlIH0gfTtcblx0Y29uc3QgcmVtYWluaW5nID0gYm9hcmQuY2FyZHMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2FyZElkKTtcblxuXHRpZiAoaW5zZXJ0QmVmb3JlSWQgPT09IG51bGwpIHtcblx0XHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5yZW1haW5pbmcsIHVwZGF0ZWRDYXJkXSB9O1xuXHR9XG5cblx0Y29uc3QgdGFyZ2V0SWR4ID0gcmVtYWluaW5nLmZpbmRJbmRleChjID0+IGMuaWQgPT09IGluc2VydEJlZm9yZUlkKTtcblx0aWYgKHRhcmdldElkeCA9PT0gLTEpIHtcblx0XHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5yZW1haW5pbmcsIHVwZGF0ZWRDYXJkXSB9O1xuXHR9XG5cblx0Y29uc3QgbmV3Q2FyZHMgPSBbLi4ucmVtYWluaW5nXTtcblx0bmV3Q2FyZHMuc3BsaWNlKHRhcmdldElkeCwgMCwgdXBkYXRlZENhcmQpO1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IG5ld0NhcmRzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDYXJkKGJvYXJkOiBCb2FyZCwgY29sdW1uVmFsdWU6IHN0cmluZywgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogQm9hcmQge1xuXHRjb25zdCBjb2x1bW5GaWVsZCA9IGJvYXJkLnZpZXdDb25maWcuY29sdW1ucztcblx0Y29uc3QgY2FyZFZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRmb3IgKGNvbnN0IGZpZWxkIG9mIGJvYXJkLmZpZWxkcykge1xuXHRcdGlmIChmaWVsZC5uYW1lID09PSBjb2x1bW5GaWVsZCkge1xuXHRcdFx0Y2FyZFZhbHVlc1tmaWVsZC5uYW1lXSA9IGNvbHVtblZhbHVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYXJkVmFsdWVzW2ZpZWxkLm5hbWVdID0gdmFsdWVzW2ZpZWxkLm5hbWVdID8/IGZpZWxkLmRlZmF1bHQgPz8gJyc7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IG5ld0NhcmQ6IENhcmQgPSB7IGlkOiBnZW5lcmF0ZUlkKCksIHZhbHVlczogY2FyZFZhbHVlcyB9O1xuXHRyZXR1cm4geyAuLi5ib2FyZCwgY2FyZHM6IFsuLi5ib2FyZC5jYXJkcywgbmV3Q2FyZF0gfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUNhcmQoYm9hcmQ6IEJvYXJkLCBjYXJkSWQ6IHN0cmluZywgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogQm9hcmQge1xuXHRyZXR1cm4ge1xuXHRcdC4uLmJvYXJkLFxuXHRcdGNhcmRzOiBib2FyZC5jYXJkcy5tYXAoY2FyZCA9PlxuXHRcdFx0Y2FyZC5pZCA9PT0gY2FyZElkXG5cdFx0XHRcdD8geyAuLi5jYXJkLCB2YWx1ZXM6IHsgLi4uY2FyZC52YWx1ZXMsIC4uLnZhbHVlcyB9IH1cblx0XHRcdFx0OiBjYXJkLFxuXHRcdCksXG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVDYXJkRmllbGQoYm9hcmQ6IEJvYXJkLCBjYXJkSWQ6IHN0cmluZywgZmllbGROYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBCb2FyZCB7XG5cdHJldHVybiB7XG5cdFx0Li4uYm9hcmQsXG5cdFx0Y2FyZHM6IGJvYXJkLmNhcmRzLm1hcChjYXJkID0+XG5cdFx0XHRjYXJkLmlkID09PSBjYXJkSWRcblx0XHRcdFx0PyB7IC4uLmNhcmQsIHZhbHVlczogeyAuLi5jYXJkLnZhbHVlcywgW2ZpZWxkTmFtZV06IHZhbHVlIH0gfVxuXHRcdFx0XHQ6IGNhcmQsXG5cdFx0KSxcblx0fTtcbn1cbiIsICJleHBvcnQgdHlwZSBXb3JrZmxvd01hcCA9IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PjtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlV29ya2Zsb3cod29ya2Zsb3dTdHJpbmc6IHN0cmluZyB8IHVuZGVmaW5lZCwgc3RhdHVzT3B0aW9uczogc3RyaW5nW10pOiBXb3JrZmxvd01hcCB7XG5cdGNvbnN0IG1hcDogV29ya2Zsb3dNYXAgPSBuZXcgTWFwKCk7XG5cblx0aWYgKCF3b3JrZmxvd1N0cmluZyB8fCAhd29ya2Zsb3dTdHJpbmcudHJpbSgpKSB7XG5cdFx0Zm9yIChjb25zdCBmcm9tIG9mIHN0YXR1c09wdGlvbnMpIHtcblx0XHRcdG1hcC5zZXQoZnJvbSwgbmV3IFNldChzdGF0dXNPcHRpb25zLmZpbHRlcihzID0+IHMgIT09IGZyb20pKSk7XG5cdFx0fVxuXHRcdHJldHVybiBtYXA7XG5cdH1cblxuXHRmb3IgKGNvbnN0IHBhaXIgb2Ygd29ya2Zsb3dTdHJpbmcuc3BsaXQoJywnKSkge1xuXHRcdGNvbnN0IFtmcm9tLCB0b10gPSBwYWlyLnNwbGl0KC8tPnxcdTIxOTIvKS5tYXAocyA9PiBzLnRyaW0oKSk7XG5cdFx0aWYgKCFmcm9tIHx8ICF0bykgY29udGludWU7XG5cdFx0aWYgKCFtYXAuaGFzKGZyb20pKSBtYXAuc2V0KGZyb20sIG5ldyBTZXQoKSk7XG5cdFx0bWFwLmdldChmcm9tKSEuYWRkKHRvKTtcblx0fVxuXG5cdHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RyYW5zaXRpb25BbGxvd2VkKG1hcDogV29ya2Zsb3dNYXAsIGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBmYWxzZTtcblx0cmV0dXJuIG1hcC5nZXQoZnJvbSk/Lmhhcyh0bykgPz8gZmFsc2U7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgQm9hcmQsIENhcmQsIEZpZWxkRGVmaW5pdGlvbiB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcblxuZXhwb3J0IGNsYXNzIENhcmRNb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0cHJpdmF0ZSB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblxuXHRjb25zdHJ1Y3Rvcihcblx0XHRhcHA6IEFwcCxcblx0XHRwcml2YXRlIGJvYXJkOiBCb2FyZCxcblx0XHRwcml2YXRlIGNhcmQ6IENhcmQgfCBudWxsLFxuXHRcdHByaXZhdGUgY29sdW1uVmFsdWU6IHN0cmluZyxcblx0XHRwcml2YXRlIG9uQ29uZmlybTogKHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gdm9pZCxcblx0XHRwcml2YXRlIG9uRGVsZXRlPzogKCkgPT4gdm9pZCxcblx0KSB7XG5cdFx0c3VwZXIoYXBwKTtcblx0fVxuXG5cdG9uT3BlbigpOiB2b2lkIHtcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcblx0XHR0aGlzLnRpdGxlRWwudGV4dENvbnRlbnQgPSB0aGlzLmNhcmQgPyAnRWRpdCBjYXJkJyA6ICdBZGQgY2FyZCc7XG5cblx0XHRjb25zdCBjb2x1bW5GaWVsZCA9IHRoaXMuYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zO1xuXHRcdGNvbnN0IGVkaXRhYmxlRmllbGRzID0gdGhpcy5ib2FyZC5maWVsZHMuZmlsdGVyKFxuXHRcdFx0ZiA9PiBmLm5hbWUgIT09ICdfaWQnICYmIGYubmFtZSAhPT0gY29sdW1uRmllbGQsXG5cdFx0KTtcblxuXHRcdGZvciAoY29uc3QgZmllbGQgb2YgZWRpdGFibGVGaWVsZHMpIHtcblx0XHRcdHRoaXMucmVuZGVyRmllbGQoY29udGVudEVsLCBmaWVsZCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZm9vdGVyID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Zm9vdGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZvb3RlcicpO1xuXG5cdFx0aWYgKHRoaXMub25EZWxldGUpIHtcblx0XHRcdGNvbnN0IGRlbGV0ZUJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdFx0ZGVsZXRlQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWRlbGV0ZScpO1xuXHRcdFx0ZGVsZXRlQnRuLnRleHRDb250ZW50ID0gJ0RlbGV0ZSc7XG5cdFx0XHRkZWxldGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRcdHRoaXMub25EZWxldGUhKCk7XG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHRcdH0pO1xuXHRcdFx0Zm9vdGVyLmFwcGVuZENoaWxkKGRlbGV0ZUJ0bik7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2F2ZUJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdHNhdmVCdG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2F2ZScpO1xuXHRcdHNhdmVCdG4udGV4dENvbnRlbnQgPSAnU2F2ZSc7XG5cdFx0c2F2ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IHZhbHVlcyA9IHsgLi4udGhpcy52YWx1ZXMgfTtcblx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHRcdHRoaXMuY29udGFpbmVyRWw/LnJlbW92ZSgpO1xuXHRcdFx0dGhpcy5vbkNvbmZpcm0odmFsdWVzKTtcblx0XHR9KTtcblx0XHRmb290ZXIuYXBwZW5kQ2hpbGQoc2F2ZUJ0bik7XG5cdFx0Y29udGVudEVsLmFwcGVuZENoaWxkKGZvb3Rlcik7XG5cblx0XHRjb250ZW50RWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0Jyk/LmZvY3VzKCk7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlckZpZWxkKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGZpZWxkOiBGaWVsZERlZmluaXRpb24pOiB2b2lkIHtcblx0XHRjb25zdCBpbml0aWFsVmFsdWUgPSB0aGlzLmNhcmRcblx0XHRcdD8gKHRoaXMuY2FyZC52YWx1ZXNbZmllbGQubmFtZV0gPz8gJycpXG5cdFx0XHQ6IChmaWVsZC5kZWZhdWx0ID8/ICcnKTtcblx0XHR0aGlzLnZhbHVlc1tmaWVsZC5uYW1lXSA9IGluaXRpYWxWYWx1ZTtcblxuXHRcdGNvbnN0IHdyYXBwZXIgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR3cmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZpZWxkJyk7XG5cblx0XHRjb25zdCBsYWJlbCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG5cdFx0bGFiZWwudGV4dENvbnRlbnQgPSBmaWVsZC5sYWJlbDtcblx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKGxhYmVsKTtcblxuXHRcdGNvbnN0IG9uQ2hhbmdlID0gKHZhbHVlOiBzdHJpbmcpID0+IHsgdGhpcy52YWx1ZXNbZmllbGQubmFtZV0gPSB2YWx1ZTsgfTtcblxuXHRcdGlmIChmaWVsZC50eXBlID09PSAnU2VsZWN0JyAmJiBmaWVsZC5vcHRpb25zKSB7XG5cdFx0XHRjb25zdCBzZWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblx0XHRcdHNlbC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dCcpO1xuXHRcdFx0Zm9yIChjb25zdCBvcHQgb2YgZmllbGQub3B0aW9ucykge1xuXHRcdFx0XHRjb25zdCBvID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XG5cdFx0XHRcdG8udmFsdWUgPSBvcHQ7XG5cdFx0XHRcdG8udGV4dENvbnRlbnQgPSBvcHQ7XG5cdFx0XHRcdGlmIChvcHQgPT09IGluaXRpYWxWYWx1ZSkgby5zZWxlY3RlZCA9IHRydWU7XG5cdFx0XHRcdHNlbC5hcHBlbmRDaGlsZChvKTtcblx0XHRcdH1cblx0XHRcdHNlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiBvbkNoYW5nZShzZWwudmFsdWUpKTtcblx0XHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQoc2VsKTtcblx0XHR9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT09ICdUZXh0YXJlYScpIHtcblx0XHRcdGNvbnN0IHRhID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcblx0XHRcdHRhLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0XHR0YS52YWx1ZSA9IGluaXRpYWxWYWx1ZTtcblx0XHRcdHRhLnJvd3MgPSA0O1xuXHRcdFx0dGEuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiBvbkNoYW5nZSh0YS52YWx1ZSkpO1xuXHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZCh0YSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0XHRpbnAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQnKTtcblx0XHRcdGlucC50eXBlID0gZmllbGQudHlwZSA9PT0gJ0RhdGUnID8gJ2RhdGUnXG5cdFx0XHRcdDogZmllbGQudHlwZSA9PT0gJ051bWJlcicgPyAnbnVtYmVyJ1xuXHRcdFx0XHQ6ICd0ZXh0Jztcblx0XHRcdGlucC52YWx1ZSA9IGluaXRpYWxWYWx1ZTtcblx0XHRcdGlucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IG9uQ2hhbmdlKGlucC52YWx1ZSkpO1xuXHRcdFx0aW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuXHRcdFx0XHRpZiAoZS5rZXkgPT09ICdFbnRlcicpIHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRjb25zdCB2YWx1ZXMgPSB7IC4uLnRoaXMudmFsdWVzIH07XG5cdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyRWw/LnJlbW92ZSgpO1xuXHRcdFx0XHRcdHRoaXMub25Db25maXJtKHZhbHVlcyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChpbnApO1xuXHRcdH1cblxuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZCh3cmFwcGVyKTtcblx0fVxuXG5cdG9uQ2xvc2UoKTogdm9pZCB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblx0fVxufVxuIiwgImltcG9ydCB7IEFwcCwgTW9kYWwgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgdHlwZSB7IEJvYXJkU2NoZW1hLCBGaWVsZERlZmluaXRpb24sIEZpZWxkVHlwZSB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcblxuZnVuY3Rpb24gZGVyaXZlRmllbGROYW1lKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gbGFiZWwudG9Mb3dlckNhc2UoKS50cmltKCkucmVwbGFjZSgvW15hLXowLTldKy9nLCAnXycpLnJlcGxhY2UoL15fK3xfKyQvZywgJycpO1xufVxuXG5jb25zdCBGSUVMRF9UWVBFUzogRmllbGRUeXBlW10gPSBbJ1RleHQnLCAnVGV4dGFyZWEnLCAnRGF0ZScsICdOdW1iZXInLCAnU2VsZWN0JywgJ0ZpbGUnXTtcblxuY29uc3QgREVGQVVMVF9TQ0hFTUE6IEJvYXJkU2NoZW1hID0ge1xuXHR0aXRsZTogJ05ldyBCb2FyZCcsXG5cdGZpZWxkczogW1xuXHRcdHsgbmFtZTogJ3RpdGxlJywgdHlwZTogJ1RleHQnLCBsYWJlbDogJ1RpdGxlJyB9LFxuXHRcdHsgbmFtZTogJ3N0YXR1cycsIHR5cGU6ICdTZWxlY3QnLCBsYWJlbDogJ1N0YXR1cycsIG9wdGlvbnM6IFsndG9kbycsICdkb2luZycsICdkb25lJ10sIGRlZmF1bHQ6ICd0b2RvJyB9LFxuXHRdLFxuXHR2aWV3Q29uZmlnOiB7IGNvbHVtbnM6ICdzdGF0dXMnIH0sXG5cdHJhd1dvcmtmbG93OiAnJyxcblx0dmVyc2lvbjogMSxcbn07XG5cbmV4cG9ydCBjbGFzcyBCb2FyZENvbmZpZ01vZGFsIGV4dGVuZHMgTW9kYWwge1xuXHRwcml2YXRlIHNjaGVtYTogQm9hcmRTY2hlbWE7XG5cdHByaXZhdGUgZXJyb3JFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblx0cHJpdmF0ZSBmaWVsZExpc3RFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuXHRjb25zdHJ1Y3Rvcihcblx0XHRhcHA6IEFwcCxcblx0XHRpbml0aWFsOiBCb2FyZFNjaGVtYSB8IG51bGwsXG5cdFx0cHJpdmF0ZSBvbkNvbmZpcm06IChzY2hlbWE6IEJvYXJkU2NoZW1hKSA9PiB2b2lkLFxuXHQpIHtcblx0XHRzdXBlcihhcHApO1xuXHRcdHRoaXMuc2NoZW1hID0gaW5pdGlhbFxuXHRcdFx0PyB7IC4uLmluaXRpYWwsIGZpZWxkczogaW5pdGlhbC5maWVsZHMubWFwKGYgPT4gKHsgLi4uZiB9KSkgfVxuXHRcdFx0OiB7IC4uLkRFRkFVTFRfU0NIRU1BLCBmaWVsZHM6IERFRkFVTFRfU0NIRU1BLmZpZWxkcy5tYXAoZiA9PiAoeyAuLi5mIH0pKSB9O1xuXHR9XG5cblx0b25PcGVuKCk6IHZvaWQge1xuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xuXHRcdHRoaXMudGl0bGVFbC50ZXh0Q29udGVudCA9IHRoaXMuc2NoZW1hLnRpdGxlID09PSAnTmV3IEJvYXJkJyAmJiAhdGhpcy5zY2hlbWEuZmllbGRzLmxlbmd0aFxuXHRcdFx0PyAnTmV3IGJvYXJkJ1xuXHRcdFx0OiAnQm9hcmQgc2V0dGluZ3MnO1xuXG5cdFx0dGhpcy5yZW5kZXJUaXRsZUlucHV0KGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJGaWVsZHNTZWN0aW9uKGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJWaWV3Q29uZmlnKGNvbnRlbnRFbCk7XG5cdFx0dGhpcy5yZW5kZXJXb3JrZmxvdyhjb250ZW50RWwpO1xuXG5cdFx0dGhpcy5lcnJvckVsID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdHRoaXMuZXJyb3JFbC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1lcnJvcicpO1xuXHRcdGNvbnRlbnRFbC5hcHBlbmRDaGlsZCh0aGlzLmVycm9yRWwpO1xuXG5cdFx0Y29uc3Qgc2F2ZUJ0biA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuXHRcdHNhdmVCdG4uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2F2ZScpO1xuXHRcdHNhdmVCdG4udGV4dENvbnRlbnQgPSAnU2F2ZSc7XG5cdFx0c2F2ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuc3VibWl0KCkpO1xuXHRcdGNvbnRlbnRFbC5hcHBlbmRDaGlsZChzYXZlQnRuKTtcblxuXHRcdGNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignaW5wdXQnKT8uZm9jdXMoKTtcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyVGl0bGVJbnB1dChjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgd3JhcCA9IHRoaXMuZmllbGQoY29udGFpbmVyLCAnQm9hcmQgdGl0bGUnKTtcblx0XHRjb25zdCBpbnAgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuXHRcdGlucC50eXBlID0gJ3RleHQnO1xuXHRcdGlucC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1pbnB1dCcpO1xuXHRcdGlucC52YWx1ZSA9IHRoaXMuc2NoZW1hLnRpdGxlO1xuXHRcdGlucC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHsgdGhpcy5zY2hlbWEudGl0bGUgPSBpbnAudmFsdWU7IH0pO1xuXHRcdHdyYXAuYXBwZW5kQ2hpbGQoaW5wKTtcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyRmllbGRzU2VjdGlvbihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgc2VjdGlvbiA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdHNlY3Rpb24uY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtc2VjdGlvbicpO1xuXG5cdFx0Y29uc3QgaGVhZGluZyA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRoZWFkaW5nLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNlY3Rpb24tbGFiZWwnKTtcblx0XHRoZWFkaW5nLnRleHRDb250ZW50ID0gJ0ZpZWxkcyc7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZChoZWFkaW5nKTtcblxuXHRcdHRoaXMuZmllbGRMaXN0RWwgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHR0aGlzLmZpZWxkTGlzdEVsLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZpZWxkLWxpc3QnKTtcblx0XHRzZWN0aW9uLmFwcGVuZENoaWxkKHRoaXMuZmllbGRMaXN0RWwpO1xuXG5cdFx0dGhpcy5yZXJlbmRlckZpZWxkTGlzdCgpO1xuXG5cdFx0Y29uc3QgYWRkQnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0YWRkQnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWFkZC1maWVsZCcpO1xuXHRcdGFkZEJ0bi50ZXh0Q29udGVudCA9ICcrIEFkZCBmaWVsZCc7XG5cdFx0YWRkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5zY2hlbWEuZmllbGRzLnB1c2goeyBuYW1lOiAnJywgdHlwZTogJ1RleHQnLCBsYWJlbDogJycgfSk7XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0XHR0aGlzLnJlZnJlc2hWaWV3Q29uZmlnKCk7XG5cdFx0fSk7XG5cdFx0c2VjdGlvbi5hcHBlbmRDaGlsZChhZGRCdG4pO1xuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHNlY3Rpb24pO1xuXHR9XG5cblx0cHJpdmF0ZSByZXJlbmRlckZpZWxkTGlzdCgpOiB2b2lkIHtcblx0XHRpZiAoIXRoaXMuZmllbGRMaXN0RWwpIHJldHVybjtcblx0XHR0aGlzLmZpZWxkTGlzdEVsLmlubmVySFRNTCA9ICcnO1xuXHRcdHRoaXMuc2NoZW1hLmZpZWxkcy5mb3JFYWNoKChmLCBpZHgpID0+IHtcblx0XHRcdHRoaXMuZmllbGRMaXN0RWwhLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyRmllbGRSb3coZiwgaWR4KSk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXJGaWVsZFJvdyhmaWVsZDogRmllbGREZWZpbml0aW9uLCBpZHg6IG51bWJlcik6IEhUTUxFbGVtZW50IHtcblx0XHRjb25zdCB0b3RhbCA9IHRoaXMuc2NoZW1hLmZpZWxkcy5sZW5ndGg7XG5cdFx0Y29uc3Qgcm93ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0cm93LmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWZpZWxkLXJvdycpO1xuXG5cdFx0Y29uc3QgaXNOZXcgPSBmaWVsZC5uYW1lID09PSAnJztcblxuXHRcdGNvbnN0IGxhYmVsSW5wID0gdGhpcy5maXhlZElucHV0KHJvdywgJ0xhYmVsJywgZmllbGQubGFiZWwsICdmay1jb2wtbGFiZWwnKTtcblx0XHRpZiAoIWlzTmV3KSBsYWJlbElucC50aXRsZSA9IGBpZDogJHtmaWVsZC5uYW1lfWA7XG5cdFx0bGFiZWxJbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRmaWVsZC5sYWJlbCA9IGxhYmVsSW5wLnZhbHVlO1xuXHRcdFx0aWYgKGlzTmV3KSB7XG5cdFx0XHRcdGZpZWxkLm5hbWUgPSBkZXJpdmVGaWVsZE5hbWUobGFiZWxJbnAudmFsdWUpO1xuXHRcdFx0XHRsYWJlbElucC50aXRsZSA9IGZpZWxkLm5hbWUgPyBgaWQ6ICR7ZmllbGQubmFtZX1gIDogJyc7XG5cdFx0XHRcdHRoaXMucmVmcmVzaFZpZXdDb25maWcoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGNvbnN0IHR5cGVTZWxlY3QgPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblx0XHR0eXBlU2VsZWN0LmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0LXNtJywgJ2ZrLWNvbC10eXBlJyk7XG5cdFx0Zm9yIChjb25zdCB0IG9mIEZJRUxEX1RZUEVTKSB7XG5cdFx0XHRjb25zdCBvID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XG5cdFx0XHRvLnZhbHVlID0gdDtcblx0XHRcdG8udGV4dENvbnRlbnQgPSB0O1xuXHRcdFx0aWYgKHQgPT09IGZpZWxkLnR5cGUpIG8uc2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0dHlwZVNlbGVjdC5hcHBlbmRDaGlsZChvKTtcblx0XHR9XG5cdFx0cm93LmFwcGVuZENoaWxkKHR5cGVTZWxlY3QpO1xuXG5cdFx0Y29uc3QgaXNTZWxlY3QgPSBmaWVsZC50eXBlID09PSAnU2VsZWN0JztcblxuXHRcdGNvbnN0IG9wdGlvbnNJbnAgPSB0aGlzLmZpeGVkSW5wdXQocm93LCAnYSwgYiwgYycsIChmaWVsZC5vcHRpb25zID8/IFtdKS5qb2luKCcsICcpLCAnZmstY29sLW9wdGlvbnMnKTtcblx0XHRvcHRpb25zSW5wLmRpc2FibGVkID0gIWlzU2VsZWN0O1xuXHRcdG9wdGlvbnNJbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRmaWVsZC5vcHRpb25zID0gb3B0aW9uc0lucC52YWx1ZS5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbik7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBkZWZhdWx0SW5wID0gdGhpcy5maXhlZElucHV0KHJvdywgJ0RlZmF1bHQnLCBmaWVsZC5kZWZhdWx0ID8/ICcnLCAnZmstY29sLWRlZmF1bHQnKTtcblx0XHRkZWZhdWx0SW5wLmRpc2FibGVkID0gIWlzU2VsZWN0O1xuXHRcdGRlZmF1bHRJbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG5cdFx0XHRmaWVsZC5kZWZhdWx0ID0gZGVmYXVsdElucC52YWx1ZSB8fCB1bmRlZmluZWQ7XG5cdFx0fSk7XG5cblx0XHR0eXBlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcblx0XHRcdGZpZWxkLnR5cGUgPSB0eXBlU2VsZWN0LnZhbHVlIGFzIEZpZWxkVHlwZTtcblx0XHRcdGNvbnN0IG5vd1NlbGVjdCA9IGZpZWxkLnR5cGUgPT09ICdTZWxlY3QnO1xuXHRcdFx0b3B0aW9uc0lucC5kaXNhYmxlZCA9ICFub3dTZWxlY3Q7XG5cdFx0XHRkZWZhdWx0SW5wLmRpc2FibGVkID0gIW5vd1NlbGVjdDtcblx0XHRcdGlmICghbm93U2VsZWN0KSB7XG5cdFx0XHRcdGZpZWxkLm9wdGlvbnMgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGZpZWxkLmRlZmF1bHQgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdG9wdGlvbnNJbnAudmFsdWUgPSAnJztcblx0XHRcdFx0ZGVmYXVsdElucC52YWx1ZSA9ICcnO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gUmVvcmRlciAvIHJlbW92ZSBjb250cm9sc1xuXHRcdGNvbnN0IGNvbnRyb2xzID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29udHJvbHMuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtcm93LWNvbnRyb2xzJyk7XG5cblx0XHRjb25zdCB1cEJ0biA9IHRoaXMuaWNvbkJ0bihjb250cm9scywgJ1x1MjE5MScsIGlkeCA9PT0gMCk7XG5cdFx0dXBCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeCAtIDFdLCB0aGlzLnNjaGVtYS5maWVsZHNbaWR4XV0gPVxuXHRcdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeF0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHggLSAxXV07XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBkb3duQnRuID0gdGhpcy5pY29uQnRuKGNvbnRyb2xzLCAnXHUyMTkzJywgaWR4ID09PSB0b3RhbCAtIDEpO1xuXHRcdGRvd25CdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeF0sIHRoaXMuc2NoZW1hLmZpZWxkc1tpZHggKyAxXV0gPVxuXHRcdFx0XHRbdGhpcy5zY2hlbWEuZmllbGRzW2lkeCArIDFdLCB0aGlzLnNjaGVtYS5maWVsZHNbaWR4XV07XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCByZW1vdmVCdG4gPSB0aGlzLmljb25CdG4oY29udHJvbHMsICdcdTAwRDcnLCB0b3RhbCA8PSAxKTtcblx0XHRyZW1vdmVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNjaGVtYS5maWVsZHMuc3BsaWNlKGlkeCwgMSk7XG5cdFx0XHR0aGlzLnJlcmVuZGVyRmllbGRMaXN0KCk7XG5cdFx0XHR0aGlzLnJlZnJlc2hWaWV3Q29uZmlnKCk7XG5cdFx0fSk7XG5cblx0XHRyb3cuYXBwZW5kQ2hpbGQoY29udHJvbHMpO1xuXHRcdHJldHVybiByb3c7XG5cdH1cblxuXHRwcml2YXRlIHJlbmRlclZpZXdDb25maWcoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuXHRcdGNvbnN0IHNlY3Rpb24gPSBhY3RpdmVEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRzZWN0aW9uLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLXNlY3Rpb24nKTtcblxuXHRcdGNvbnN0IGNvbFdyYXAgPSB0aGlzLmZpZWxkKHNlY3Rpb24sICdDb2x1bW5zIGZpZWxkJyk7XG5cdFx0Y29uc3QgY29sU2VsZWN0ID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0Jyk7XG5cdFx0Y29sU2VsZWN0LmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0Y29sU2VsZWN0LmRhdGFzZXQucm9sZSA9ICdjb2x1bW5zJztcblx0XHR0aGlzLnBvcHVsYXRlRmllbGRTZWxlY3QoY29sU2VsZWN0LCB0aGlzLnNjaGVtYS52aWV3Q29uZmlnLmNvbHVtbnMpO1xuXHRcdGNvbFNlbGVjdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucyA9IGNvbFNlbGVjdC52YWx1ZTsgfSk7XG5cdFx0Y29sV3JhcC5hcHBlbmRDaGlsZChjb2xTZWxlY3QpO1xuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHNlY3Rpb24pO1xuXHR9XG5cblx0cHJpdmF0ZSByZW5kZXJXb3JrZmxvdyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdFx0Y29uc3Qgd3JhcCA9IHRoaXMuZmllbGQoY29udGFpbmVyLCAnV29ya2Zsb3cgKG9wdGlvbmFsKScpO1xuXHRcdGNvbnN0IGlucCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0aW5wLnR5cGUgPSAndGV4dCc7XG5cdFx0aW5wLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWlucHV0Jyk7XG5cdFx0aW5wLnBsYWNlaG9sZGVyID0gJ3RvZG9cdTIxOTJkb2luZywgZG9pbmdcdTIxOTJkb25lJztcblx0XHRpbnAudmFsdWUgPSB0aGlzLnNjaGVtYS5yYXdXb3JrZmxvdyA/PyAnJztcblx0XHRpbnAuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7IHRoaXMuc2NoZW1hLnJhd1dvcmtmbG93ID0gaW5wLnZhbHVlOyB9KTtcblx0XHR3cmFwLmFwcGVuZENoaWxkKGlucCk7XG5cdH1cblxuXHRwcml2YXRlIHJlZnJlc2hWaWV3Q29uZmlnKCk6IHZvaWQge1xuXHRcdGNvbnN0IGNvbFNlbGVjdCA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3I8SFRNTFNlbGVjdEVsZW1lbnQ+KCdbZGF0YS1yb2xlPVwiY29sdW1uc1wiXScpO1xuXHRcdGlmIChjb2xTZWxlY3QpIHRoaXMucG9wdWxhdGVGaWVsZFNlbGVjdChjb2xTZWxlY3QsIHRoaXMuc2NoZW1hLnZpZXdDb25maWcuY29sdW1ucyk7XG5cdH1cblxuXHRwcml2YXRlIHBvcHVsYXRlRmllbGRTZWxlY3Qoc2VsZWN0OiBIVE1MU2VsZWN0RWxlbWVudCwgY3VycmVudDogc3RyaW5nKTogdm9pZCB7XG5cdFx0Y29uc3QgZXhpc3RpbmcgPSBBcnJheS5mcm9tKHNlbGVjdC5vcHRpb25zKS5tYXAobyA9PiBvLnZhbHVlKS5maWx0ZXIodiA9PiB2KTtcblx0XHRjb25zdCBuYW1lcyA9IHRoaXMuc2NoZW1hLmZpZWxkcy5tYXAoZiA9PiBmLm5hbWUpLmZpbHRlcihuID0+IG4pO1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuXHRcdFx0aWYgKCFleGlzdGluZy5pbmNsdWRlcyhuYW1lKSkge1xuXHRcdFx0XHRjb25zdCBvID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XG5cdFx0XHRcdG8udmFsdWUgPSBuYW1lO1xuXHRcdFx0XHRvLnRleHRDb250ZW50ID0gbmFtZTtcblx0XHRcdFx0c2VsZWN0LmFwcGVuZENoaWxkKG8pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoY3VycmVudCkgc2VsZWN0LnZhbHVlID0gY3VycmVudDtcblx0fVxuXG5cdHByaXZhdGUgc3VibWl0KCk6IHZvaWQge1xuXHRcdGNvbnN0IGVycm9yID0gdGhpcy52YWxpZGF0ZSgpO1xuXHRcdGlmIChlcnJvcikge1xuXHRcdFx0aWYgKHRoaXMuZXJyb3JFbCkgdGhpcy5lcnJvckVsLnRleHRDb250ZW50ID0gZXJyb3I7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMub25Db25maXJtKHRoaXMuc2NoZW1hKTtcblx0XHR0aGlzLmNsb3NlKCk7XG5cdH1cblxuXHRwcml2YXRlIHZhbGlkYXRlKCk6IHN0cmluZyB8IG51bGwge1xuXHRcdGlmICghdGhpcy5zY2hlbWEudGl0bGUudHJpbSgpKSByZXR1cm4gJ0JvYXJkIHRpdGxlIGlzIHJlcXVpcmVkLic7XG5cdFx0aWYgKHRoaXMuc2NoZW1hLmZpZWxkcy5sZW5ndGggPT09IDApIHJldHVybiAnQXQgbGVhc3Qgb25lIGZpZWxkIGlzIHJlcXVpcmVkLic7XG5cdFx0Y29uc3QgbmFtZXMgPSB0aGlzLnNjaGVtYS5maWVsZHMubWFwKGYgPT4gZi5uYW1lLnRyaW0oKSk7XG5cdFx0aWYgKG5hbWVzLnNvbWUobiA9PiAhbikpIHJldHVybiAnQWxsIGZpZWxkIG5hbWVzIG11c3QgYmUgbm9uLWVtcHR5Lic7XG5cdFx0aWYgKG5ldyBTZXQobmFtZXMpLnNpemUgIT09IG5hbWVzLmxlbmd0aCkgcmV0dXJuICdGaWVsZCBuYW1lcyBtdXN0IGJlIHVuaXF1ZS4nO1xuXHRcdGZvciAoY29uc3QgZiBvZiB0aGlzLnNjaGVtYS5maWVsZHMpIHtcblx0XHRcdGlmIChmLnR5cGUgPT09ICdTZWxlY3QnICYmICghZi5vcHRpb25zIHx8IGYub3B0aW9ucy5sZW5ndGggPT09IDApKSB7XG5cdFx0XHRcdHJldHVybiBgU2VsZWN0IGZpZWxkIFwiJHtmLm5hbWV9XCIgbXVzdCBoYXZlIGF0IGxlYXN0IG9uZSBvcHRpb24uYDtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCF0aGlzLnNjaGVtYS5maWVsZHMuc29tZShmID0+IGYubmFtZSA9PT0gdGhpcy5zY2hlbWEudmlld0NvbmZpZy5jb2x1bW5zKSkge1xuXHRcdFx0cmV0dXJuICdDb2x1bW5zIGZpZWxkIG11c3QgbWF0Y2ggYW4gZXhpc3RpbmcgZmllbGQgbmFtZS4nO1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdHByaXZhdGUgZmllbGQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcblx0XHRjb25zdCB3cmFwID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0d3JhcC5jbGFzc0xpc3QuYWRkKCdmay1tb2RhbC1maWVsZCcpO1xuXHRcdGNvbnN0IGxibCA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG5cdFx0bGJsLnRleHRDb250ZW50ID0gbGFiZWw7XG5cdFx0d3JhcC5hcHBlbmRDaGlsZChsYmwpO1xuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZCh3cmFwKTtcblx0XHRyZXR1cm4gd3JhcDtcblx0fVxuXG5cdHByaXZhdGUgc21hbGxJbnB1dChjb250YWluZXI6IEhUTUxFbGVtZW50LCBwbGFjZWhvbGRlcjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogSFRNTElucHV0RWxlbWVudCB7XG5cdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRpbnAudHlwZSA9ICd0ZXh0Jztcblx0XHRpbnAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQtc20nKTtcblx0XHRpbnAucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcblx0XHRpbnAudmFsdWUgPSB2YWx1ZTtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoaW5wKTtcblx0XHRyZXR1cm4gaW5wO1xuXHR9XG5cblx0cHJpdmF0ZSBmaXhlZElucHV0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHBsYWNlaG9sZGVyOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIGNsczogc3RyaW5nKTogSFRNTElucHV0RWxlbWVudCB7XG5cdFx0Y29uc3QgaW5wID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcblx0XHRpbnAudHlwZSA9ICd0ZXh0Jztcblx0XHRpbnAuY2xhc3NMaXN0LmFkZCgnZmstbW9kYWwtaW5wdXQtc20nLCBjbHMpO1xuXHRcdGlucC5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xuXHRcdGlucC52YWx1ZSA9IHZhbHVlO1xuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChpbnApO1xuXHRcdHJldHVybiBpbnA7XG5cdH1cblxuXHRwcml2YXRlIGljb25CdG4oY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgZGlzYWJsZWQ6IGJvb2xlYW4pOiBIVE1MQnV0dG9uRWxlbWVudCB7XG5cdFx0Y29uc3QgYnRuID0gYWN0aXZlRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5cdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ2ZrLW1vZGFsLWljb24tYnRuJyk7XG5cdFx0YnRuLnRleHRDb250ZW50ID0gbGFiZWw7XG5cdFx0YnRuLmRpc2FibGVkID0gZGlzYWJsZWQ7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGJ0bik7XG5cdFx0cmV0dXJuIGJ0bjtcblx0fVxuXG5cdG9uQ2xvc2UoKTogdm9pZCB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblx0fVxufVxuIiwgImltcG9ydCB7IEFwcCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB0eXBlIHsgQm9hcmQgfSBmcm9tICcuLi9tb2RlbC9ib2FyZCc7XG5pbXBvcnQgeyByZW5kZXJCb2FyZCB9IGZyb20gJy4vYm9hcmQnO1xuaW1wb3J0IHsgcmVvcmRlckNhcmQsIGRlbGV0ZUNhcmQsIGNyZWF0ZUNhcmQsIHVwZGF0ZUNhcmQgfSBmcm9tICcuLi9tb2RlbC9tdXRhdGlvbnMnO1xuaW1wb3J0IHsgcGFyc2VXb3JrZmxvdywgaXNUcmFuc2l0aW9uQWxsb3dlZCB9IGZyb20gJy4uL2RhdGEvd29ya2Zsb3cnO1xuaW1wb3J0IHsgQ2FyZE1vZGFsIH0gZnJvbSAnLi9jYXJkLW1vZGFsJztcbmltcG9ydCB7IEJvYXJkQ29uZmlnTW9kYWwgfSBmcm9tICcuL2JvYXJkLWNvbmZpZy1tb2RhbCc7XG5pbXBvcnQgeyByZWNvbmNpbGVDYXJkcyB9IGZyb20gJy4uL2RhdGEvc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgU2F2ZUZuID0gKGJvYXJkOiBCb2FyZCkgPT4gUHJvbWlzZTx2b2lkPjtcblxuZXhwb3J0IGZ1bmN0aW9uIG1vdW50Qm9hcmQoZWw6IEhUTUxFbGVtZW50LCBib2FyZDogQm9hcmQsIHNhdmU6IFNhdmVGbiwgYXBwPzogQXBwKTogdm9pZCB7XG5cdHdoaWxlIChlbC5maXJzdENoaWxkKSBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcblxuXHRjb25zdCBkaXNwYXRjaCA9IChuZXdCb2FyZDogQm9hcmQpOiB2b2lkID0+IHtcblx0XHR2b2lkIHNhdmUobmV3Qm9hcmQpLnRoZW4oKCkgPT4gbW91bnRCb2FyZChlbCwgbmV3Qm9hcmQsIHNhdmUsIGFwcCkpO1xuXHR9O1xuXG5cdGNvbnN0IGJvYXJkRWwgPSByZW5kZXJCb2FyZChib2FyZCk7XG5cdGF0dGFjaERyYWdEcm9wKGJvYXJkRWwsIGJvYXJkLCBkaXNwYXRjaCk7XG5cdGF0dGFjaENhcmRBY3Rpb25zKGJvYXJkRWwsIGJvYXJkLCBkaXNwYXRjaCwgYXBwKTtcblx0ZWwuYXBwZW5kQ2hpbGQoYm9hcmRFbCk7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaENhcmRBY3Rpb25zKGJvYXJkRWw6IEhUTUxFbGVtZW50LCBib2FyZDogQm9hcmQsIGRpc3BhdGNoOiAoYjogQm9hcmQpID0+IHZvaWQsIGFwcD86IEFwcCk6IHZvaWQge1xuXHRib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcblxuXHRcdGNvbnN0IHNldHRpbmdzQnRuID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstYm9hcmRfX3NldHRpbmdzJyk7XG5cdFx0aWYgKHNldHRpbmdzQnRuICYmIGFwcCkge1xuXHRcdFx0bmV3IEJvYXJkQ29uZmlnTW9kYWwoYXBwLCBib2FyZCwgKHNjaGVtYSkgPT4ge1xuXHRcdFx0XHRjb25zdCByZWNvbmNpbGVkQ2FyZHMgPSByZWNvbmNpbGVDYXJkcyhzY2hlbWEuZmllbGRzLCBib2FyZC5jYXJkcyk7XG5cdFx0XHRcdGRpc3BhdGNoKHsgLi4uc2NoZW1hLCBjYXJkczogcmVjb25jaWxlZENhcmRzIH0pO1xuXHRcdFx0fSkub3BlbigpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGFkZEJ0biA9IHRhcmdldC5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNvbF9fYWRkLWJ0bicpO1xuXHRcdGlmIChhZGRCdG4pIHtcblx0XHRcdGNvbnN0IGNvbCA9IGFkZEJ0bi5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNvbHVtbicpO1xuXHRcdFx0Y29uc3QgY29sdW1uVmFsdWUgPSBjb2w/LmRhdGFzZXQuY29sdW1uVmFsdWUgPz8gJyc7XG5cdFx0XHRpZiAoYXBwKSB7XG5cdFx0XHRcdG5ldyBDYXJkTW9kYWwoYXBwLCBib2FyZCwgbnVsbCwgY29sdW1uVmFsdWUsICh2YWx1ZXMpID0+IHtcblx0XHRcdFx0XHRkaXNwYXRjaChjcmVhdGVDYXJkKGJvYXJkLCBjb2x1bW5WYWx1ZSwgdmFsdWVzKSk7XG5cdFx0XHRcdH0pLm9wZW4oKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRpc3BhdGNoKGNyZWF0ZUNhcmQoYm9hcmQsIGNvbHVtblZhbHVlLCB7fSkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNhcmRFbCA9IHRhcmdldC5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNhcmQnKTtcblx0XHRpZiAoY2FyZEVsKSB7XG5cdFx0XHRjb25zdCBjYXJkSWQgPSBjYXJkRWwuZGF0YXNldC5jYXJkSWQgPz8gJyc7XG5cdFx0XHRjb25zdCBjYXJkID0gYm9hcmQuY2FyZHMuZmluZChjID0+IGMuaWQgPT09IGNhcmRJZCkgPz8gbnVsbDtcblx0XHRcdGNvbnN0IGNvbHVtblZhbHVlID0gY2FyZEVsLmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KCcuZmstY29sdW1uJyk/LmRhdGFzZXQuY29sdW1uVmFsdWUgPz8gJyc7XG5cdFx0XHRpZiAoYXBwICYmIGNhcmQpIHtcblx0XHRcdFx0bmV3IENhcmRNb2RhbChhcHAsIGJvYXJkLCBjYXJkLCBjb2x1bW5WYWx1ZSwgKHZhbHVlcykgPT4ge1xuXHRcdFx0XHRcdGRpc3BhdGNoKHVwZGF0ZUNhcmQoYm9hcmQsIGNhcmRJZCwgdmFsdWVzKSk7XG5cdFx0XHRcdH0sICgpID0+IHtcblx0XHRcdFx0XHRkaXNwYXRjaChkZWxldGVDYXJkKGJvYXJkLCBjYXJkSWQpKTtcblx0XHRcdFx0fSkub3BlbigpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIGdldEluc2VydEJlZm9yZUlkKGNsaWVudFk6IG51bWJlciwgY29sOiBIVE1MRWxlbWVudCk6IHN0cmluZyB8IG51bGwge1xuXHRjb25zdCBjYXJkcyA9IEFycmF5LmZyb20oY29sLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcuZmstY2FyZDpub3QoLmZrLWNhcmQtLWRyYWdnaW5nKScpKTtcblx0Zm9yIChjb25zdCBjYXJkIG9mIGNhcmRzKSB7XG5cdFx0Y29uc3QgcmVjdCA9IGNhcmQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0aWYgKGNsaWVudFkgPCByZWN0LnRvcCArIHJlY3QuaGVpZ2h0IC8gMikgcmV0dXJuIGNhcmQuZGF0YXNldC5jYXJkSWQgPz8gbnVsbDtcblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlRHJvcEluZGljYXRvcihjb2w6IEhUTUxFbGVtZW50LCBpbnNlcnRCZWZvcmVJZDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuXHRjb2wucXVlcnlTZWxlY3RvckFsbCgnLmZrLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG5cdGNvbnN0IGluZGljYXRvciA9IGFjdGl2ZURvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRpbmRpY2F0b3IuY2xhc3NMaXN0LmFkZCgnZmstZHJvcC1pbmRpY2F0b3InKTtcblx0Y29uc3QgY2FyZHNFbCA9IGNvbC5xdWVyeVNlbGVjdG9yKCcuZmstY29sdW1uX19jYXJkcycpO1xuXHRpZiAoIWNhcmRzRWwpIHJldHVybjtcblx0aWYgKGluc2VydEJlZm9yZUlkID09PSBudWxsKSB7XG5cdFx0Y2FyZHNFbC5hcHBlbmRDaGlsZChpbmRpY2F0b3IpO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnN0IHRhcmdldCA9IGNhcmRzRWwucXVlcnlTZWxlY3RvcihgW2RhdGEtY2FyZC1pZD1cIiR7aW5zZXJ0QmVmb3JlSWR9XCJdYCk7XG5cdFx0aWYgKHRhcmdldCkgY2FyZHNFbC5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXQpO1xuXHRcdGVsc2UgY2FyZHNFbC5hcHBlbmRDaGlsZChpbmRpY2F0b3IpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNsZWFyRHJvcFN0YXRlKGJvYXJkRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG5cdGJvYXJkRWwucXVlcnlTZWxlY3RvckFsbCgnLmZrLWNhcmQtLWRyYWdnaW5nJykuZm9yRWFjaChjID0+IGMuY2xhc3NMaXN0LnJlbW92ZSgnZmstY2FyZC0tZHJhZ2dpbmcnKSk7XG5cdGJvYXJkRWwucXVlcnlTZWxlY3RvckFsbCgnLmZrLWNvbHVtbi0tZHJhZy1vdmVyJykuZm9yRWFjaChjID0+IGMuY2xhc3NMaXN0LnJlbW92ZSgnZmstY29sdW1uLS1kcmFnLW92ZXInKSk7XG5cdGJvYXJkRWwucXVlcnlTZWxlY3RvckFsbCgnLmZrLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaERyYWdEcm9wKGJvYXJkRWw6IEhUTUxFbGVtZW50LCBib2FyZDogQm9hcmQsIGRpc3BhdGNoOiAoYjogQm9hcmQpID0+IHZvaWQpOiB2b2lkIHtcblx0Y29uc3QgY29sdW1uRmllbGQgPSBib2FyZC5maWVsZHMuZmluZChmID0+IGYubmFtZSA9PT0gYm9hcmQudmlld0NvbmZpZy5jb2x1bW5zKTtcblx0Y29uc3Qgc3RhdHVzT3B0aW9ucyA9IGNvbHVtbkZpZWxkPy5vcHRpb25zID8/IFtdO1xuXHRjb25zdCB3b3JrZmxvd01hcCA9IHBhcnNlV29ya2Zsb3coYm9hcmQucmF3V29ya2Zsb3cgfHwgdW5kZWZpbmVkLCBzdGF0dXNPcHRpb25zKTtcblxuXHRsZXQgZHJhZ2dpbmdDYXJkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXHRsZXQgY3VycmVudENvbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblx0bGV0IGluc2VydEJlZm9yZUlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuXHRib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgKGUpID0+IHtcblx0XHRjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcblx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoJ2J1dHRvbicpKSByZXR1cm47XG5cdFx0Y29uc3QgY2FyZCA9IHRhcmdldC5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNhcmQnKTtcblx0XHRpZiAoIWNhcmQpIHJldHVybjtcblxuXHRcdGNvbnN0IHN0YXJ0WCA9IGUuY2xpZW50WDtcblx0XHRjb25zdCBzdGFydFkgPSBlLmNsaWVudFk7XG5cdFx0bGV0IGRyYWdTdGFydGVkID0gZmFsc2U7XG5cblx0XHRjb25zdCBvbk1vdmUgPSAoZXY6IFBvaW50ZXJFdmVudCkgPT4ge1xuXHRcdFx0aWYgKCFkcmFnU3RhcnRlZCkge1xuXHRcdFx0XHRjb25zdCBkeCA9IGV2LmNsaWVudFggLSBzdGFydFg7XG5cdFx0XHRcdGNvbnN0IGR5ID0gZXYuY2xpZW50WSAtIHN0YXJ0WTtcblx0XHRcdFx0aWYgKGR4ICogZHggKyBkeSAqIGR5IDwgMjUpIHJldHVybjtcblx0XHRcdFx0ZHJhZ1N0YXJ0ZWQgPSB0cnVlO1xuXHRcdFx0XHRkcmFnZ2luZ0NhcmRJZCA9IGNhcmQuZGF0YXNldC5jYXJkSWQgPz8gbnVsbDtcblx0XHRcdFx0Y2FyZC5jbGFzc0xpc3QuYWRkKCdmay1jYXJkLS1kcmFnZ2luZycpO1xuXHRcdFx0fVxuXHRcdFx0ZXYucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNvbnN0IGJlbG93ID0gYWN0aXZlRG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChldi5jbGllbnRYLCBldi5jbGllbnRZKTtcblx0XHRcdGNvbnN0IGNvbCA9IGJlbG93Py5jbG9zZXN0PEhUTUxFbGVtZW50PignLmZrLWNvbHVtbicpID8/IG51bGw7XG5cdFx0XHRpZiAoY29sICE9PSBjdXJyZW50Q29sKSB7XG5cdFx0XHRcdGN1cnJlbnRDb2w/LmNsYXNzTGlzdC5yZW1vdmUoJ2ZrLWNvbHVtbi0tZHJhZy1vdmVyJyk7XG5cdFx0XHRcdGN1cnJlbnRDb2w/LnF1ZXJ5U2VsZWN0b3JBbGwoJy5may1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuXHRcdFx0XHRjdXJyZW50Q29sID0gY29sO1xuXHRcdFx0XHRjb2w/LmNsYXNzTGlzdC5hZGQoJ2ZrLWNvbHVtbi0tZHJhZy1vdmVyJyk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY29sKSB7XG5cdFx0XHRcdGluc2VydEJlZm9yZUlkID0gZ2V0SW5zZXJ0QmVmb3JlSWQoZXYuY2xpZW50WSwgY29sKTtcblx0XHRcdFx0dXBkYXRlRHJvcEluZGljYXRvcihjb2wsIGluc2VydEJlZm9yZUlkKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Y29uc3Qgb25VcCA9ICgpID0+IHtcblx0XHRcdGFjdGl2ZURvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgb25Nb3ZlKTtcblx0XHRcdGFjdGl2ZURvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIG9uVXApO1xuXHRcdFx0aWYgKCFkcmFnU3RhcnRlZCkgcmV0dXJuO1xuXHRcdFx0Y29uc3QgY29sID0gY3VycmVudENvbDtcblx0XHRcdGNsZWFyRHJvcFN0YXRlKGJvYXJkRWwpO1xuXHRcdFx0aWYgKGNvbCAmJiBkcmFnZ2luZ0NhcmRJZCkge1xuXHRcdFx0XHRjb25zdCB0b1ZhbHVlID0gY29sLmRhdGFzZXQuY29sdW1uVmFsdWUgPz8gJyc7XG5cdFx0XHRcdGNvbnN0IGRyYWdnZWRDYXJkID0gYm9hcmQuY2FyZHMuZmluZChjID0+IGMuaWQgPT09IGRyYWdnaW5nQ2FyZElkKTtcblx0XHRcdFx0Y29uc3QgZnJvbVZhbHVlID0gZHJhZ2dlZENhcmQ/LnZhbHVlc1tib2FyZC52aWV3Q29uZmlnLmNvbHVtbnNdID8/ICcnO1xuXHRcdFx0XHRpZiAoZnJvbVZhbHVlID09PSB0b1ZhbHVlIHx8IGlzVHJhbnNpdGlvbkFsbG93ZWQod29ya2Zsb3dNYXAsIGZyb21WYWx1ZSwgdG9WYWx1ZSkpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChyZW9yZGVyQ2FyZChib2FyZCwgZHJhZ2dpbmdDYXJkSWQsIHRvVmFsdWUsIGluc2VydEJlZm9yZUlkKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGRyYWdnaW5nQ2FyZElkID0gbnVsbDtcblx0XHRcdGN1cnJlbnRDb2wgPSBudWxsO1xuXHRcdFx0aW5zZXJ0QmVmb3JlSWQgPSBudWxsO1xuXHRcdH07XG5cblx0XHRhY3RpdmVEb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIG9uTW92ZSk7XG5cdFx0YWN0aXZlRG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgb25VcCk7XG5cdH0pO1xufVxuIiwgImltcG9ydCB0eXBlIHsgVmF1bHQsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgeyBCb2FyZCB9IGZyb20gJy4uL21vZGVsL2JvYXJkJztcbmltcG9ydCB7IHNlcmlhbGl6ZUJvYXJkIH0gZnJvbSAnLi4vZGF0YS9zZXJpYWxpemVyJztcblxuZXhwb3J0IHR5cGUgQmxvY2tMb2NhdGlvbiA9IHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZUJsb2NrKGZpbGVDb250ZW50OiBzdHJpbmcsIGJsb2NrSW5kZXg6IG51bWJlcik6IEJsb2NrTG9jYXRpb24gfCBudWxsIHtcblx0Y29uc3QgcmVnZXggPSAvXmBgYGZhbmN5LWthbmJhbiRbXFxzXFxTXSo/XmBgYCQvZ207XG5cdGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcblx0bGV0IGNvdW50ID0gMDtcblxuXHR3aGlsZSAoKG1hdGNoID0gcmVnZXguZXhlYyhmaWxlQ29udGVudCkpICE9PSBudWxsKSB7XG5cdFx0aWYgKGNvdW50ID09PSBibG9ja0luZGV4KSB7XG5cdFx0XHRyZXR1cm4geyBzdGFydDogbWF0Y2guaW5kZXgsIGVuZDogbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGggfTtcblx0XHR9XG5cdFx0Y291bnQrKztcblx0fVxuXG5cdHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hCbG9jayhcblx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcblx0c3RhcnQ6IG51bWJlcixcblx0ZW5kOiBudW1iZXIsXG5cdG5ld0Jsb2NrVGV4dDogc3RyaW5nLFxuKTogc3RyaW5nIHtcblx0cmV0dXJuIGZpbGVDb250ZW50LnNsaWNlKDAsIHN0YXJ0KSArIG5ld0Jsb2NrVGV4dCArIGZpbGVDb250ZW50LnNsaWNlKGVuZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlQmFjayhcblx0dmF1bHQ6IFZhdWx0LFxuXHRmaWxlOiBURmlsZSxcblx0YmxvY2tJbmRleDogbnVtYmVyLFxuXHRib2FyZDogQm9hcmQsXG4pOiBQcm9taXNlPHZvaWQ+IHtcblx0Y29uc3QgbmV3QmxvY2tUZXh0ID0gJ2BgYGZhbmN5LWthbmJhblxcbicgKyBzZXJpYWxpemVCb2FyZChib2FyZCkgKyAnXFxuYGBgJztcblxuXHRhd2FpdCB2YXVsdC5wcm9jZXNzKGZpbGUsIChjb250ZW50KSA9PiB7XG5cdFx0Y29uc3QgbG9jYXRpb24gPSBsb2NhdGVCbG9jayhjb250ZW50LCBibG9ja0luZGV4KTtcblx0XHRpZiAoIWxvY2F0aW9uKSByZXR1cm4gY29udGVudDtcblx0XHRyZXR1cm4gcGF0Y2hCbG9jayhjb250ZW50LCBsb2NhdGlvbi5zdGFydCwgbG9jYXRpb24uZW5kLCBuZXdCbG9ja1RleHQpO1xuXHR9KTtcbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IHBhcnNlQmxvY2sgfSBmcm9tICcuLi9kYXRhL3BhcnNlcic7XG5pbXBvcnQgeyBsb2NhdGVCbG9jayB9IGZyb20gJy4vd3JpdGUtYmFjayc7XG5pbXBvcnQgd3JpdGVCYWNrIGZyb20gJy4vd3JpdGUtYmFjayc7XG5pbXBvcnQgeyBtb3VudEJvYXJkIH0gZnJvbSAnLi4vcmVuZGVyL21vdW50JztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9GQU5DWV9LQU5CQU4gPSAnZmFuY3kta2FuYmFuLXZpZXcnO1xuXG5leHBvcnQgY29uc3QgQk9BUkRfVEVNUExBVEUgPSBgXFxgXFxgXFxgZmFuY3kta2FuYmFuXG4tLS1cbnRpdGxlOiBOZXcgQm9hcmRcbmZpZWxkczpcbiAgLSBuYW1lOiB0aXRsZSwgdHlwZTogVGV4dCwgbGFiZWw6IFRpdGxlXG4gIC0gbmFtZTogc3RhdHVzLCB0eXBlOiBTZWxlY3QsIG9wdGlvbnM6IHRvZG98ZG9pbmd8ZG9uZSwgbGFiZWw6IFN0YXR1cywgZGVmYXVsdDogdG9kb1xuLS0tXG5cbnwgX2lkIHwgVGl0bGUgfCBTdGF0dXMgfFxufC0tLS0tfC0tLS0tLS18LS0tLS0tLS18XG5cXGBcXGBcXGBgO1xuXG5leHBvcnQgY2xhc3MgRmFuY3lLYW5iYW5WaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuXHRwcml2YXRlIGJvYXJkVGl0bGUgPSAnRmFuY3kgS2FuYmFuJztcblxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XG5cdFx0c3VwZXIobGVhZik7XG5cdH1cblxuXHRnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuXHRcdHJldHVybiBWSUVXX1RZUEVfRkFOQ1lfS0FOQkFOO1xuXHR9XG5cblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5ib2FyZFRpdGxlO1xuXHR9XG5cblx0Z2V0SWNvbigpOiBzdHJpbmcge1xuXHRcdHJldHVybiAnbGF5b3V0LWthbmJhbic7XG5cdH1cblxuXHRhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XG5cblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblx0XHRpZiAoIWZpbGUpIHtcblx0XHRcdGNvbnN0IGVyciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgY2xzOiAnZmstZXJyb3InIH0pO1xuXHRcdFx0ZXJyLnRleHRDb250ZW50ID0gJ05vIGZpbGUgaXMgb3Blbi4nO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuXHRcdGNvbnN0IGxvY2F0aW9uID0gbG9jYXRlQmxvY2soY29udGVudCwgMCk7XG5cdFx0aWYgKCFsb2NhdGlvbikge1xuXHRcdFx0Y29uc3QgZXJyID0gY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyBjbHM6ICdmay1lcnJvcicgfSk7XG5cdFx0XHRlcnIudGV4dENvbnRlbnQgPSAnTm8gZmFuY3kta2FuYmFuIGJsb2NrIGZvdW5kIGluIHRoaXMgZmlsZS4nO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJsb2NrVGV4dCA9IGNvbnRlbnQuc2xpY2UobG9jYXRpb24uc3RhcnQsIGxvY2F0aW9uLmVuZCk7XG5cdFx0Y29uc3QgaW5uZXIgPSBibG9ja1RleHQucmVwbGFjZSgvXmBgYGZhbmN5LWthbmJhblxcbi8sICcnKS5yZXBsYWNlKC9cXG5gYGAkLywgJycpO1xuXHRcdGNvbnN0IHJlc3VsdCA9IHBhcnNlQmxvY2soaW5uZXIpO1xuXG5cdFx0aWYgKCFyZXN1bHQub2spIHtcblx0XHRcdGNvbnN0IGVyciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgY2xzOiAnZmstZXJyb3InIH0pO1xuXHRcdFx0ZXJyLnRleHRDb250ZW50ID0gcmVzdWx0LmVycm9ycy5tYXAoZSA9PiBlLm1lc3NhZ2UpLmpvaW4oJzsgJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5ib2FyZFRpdGxlID0gcmVzdWx0LmJvYXJkLnRpdGxlO1xuXHRcdGNvbnN0IHNhdmUgPSAoYm9hcmQ6IHR5cGVvZiByZXN1bHQuYm9hcmQpID0+IHdyaXRlQmFjayh0aGlzLmFwcC52YXVsdCwgZmlsZSwgMCwgYm9hcmQpO1xuXHRcdG1vdW50Qm9hcmQoY29udGVudEVsLCByZXN1bHQuYm9hcmQsIHNhdmUsIHRoaXMuYXBwKTtcblx0fVxuXG5cdGFzeW5jIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblx0fVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBdUM7OztBQ0N2QyxJQUFBQyxtQkFBc0I7OztBQ21CZixJQUFNLG9CQUFvQjs7O0FDbEIxQixT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
