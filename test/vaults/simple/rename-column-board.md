```fancy-kanban
---
title: Rename Column Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
viewConfig:
  columns: status
workflow:
---

| _id | Title | Status |
| --- | --- | --- |
| rc1 | First task | todo |
| rc2 | Second task | todo |
| rc3 | In progress | doing |
| rc4 | Completed | done |
```
