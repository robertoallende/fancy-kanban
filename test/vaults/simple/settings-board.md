```fancy-kanban
---
title: Settings Test Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: todo|done, default: todo
viewConfig:
  columns: status
workflow:
---

| _id | Title | Status |
| --- | --- | --- |
| s1 | Task One | todo |
```
