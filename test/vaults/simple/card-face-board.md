```fancy-kanban
---
version: 1
title: Card Face Board
fields:
  - name: title, type: Text, label: Title
  - name: priority, type: Select, label: Priority, options: low|medium|high, default: medium
  - name: due, type: Date, label: Due
  - name: docs, type: Link, label: Docs
  - name: status, type: Select, label: Status, options: todo|done, default: todo
card_title: title
card_fields: priority, due
columns: status
---

| _id | Title | Priority | Due | Docs | Status |
| --- | --- | --- | --- | --- | --- |
| cf1 | Design | high | 2026-08-01 | notes/spec.md<br>https://figma.com | todo |
| cf2 | Implement | medium | 2026-08-15 |  | todo |
| cf3 | Ship | low |  |  | done |
```
