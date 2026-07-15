```fancy-kanban
---
title: Simple Board
fields:
  - name: title
    type: Text
    label: Title
  - name: status
    type: Select
    label: Status
    options: [todo, done]
    default: todo
viewConfig:
  columns: status
workflow: ""
---

| _id | Title | Status |
| --- | --- | --- |
| c1 | First task | todo |
| c2 | Second task | todo |
| c3 | Done task | done |
```
