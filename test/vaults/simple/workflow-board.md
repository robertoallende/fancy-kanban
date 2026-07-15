```fancy-kanban
---
title: Workflow Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|done, label: Status, default: todo
workflow: todo->done
---

| _id | Title  | Status |
|-----|--------|--------|
| wf1 | Task A | todo   |
| wf2 | Task B | done   |
```
