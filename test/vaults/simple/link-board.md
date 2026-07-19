```fancy-kanban
---
version: 1
title: Link Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|done, label: Status, default: todo
  - name: docs, type: Link, label: Docs
---

| _id | Title    | Status | Docs                                         |
|-----|----------|--------|----------------------------------------------|
| lk1 | Card One | todo   | notes/file.md<br>https://example.com         |
| lk2 | Card Two | done   |                                              |
```
