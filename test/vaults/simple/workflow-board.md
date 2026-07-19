```fancy-kanban
---
version: 1
title: Workflow Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: todo|done, default: todo
  - name: link, type: Link, label: Link
workflow: todo->done
---

| _id | Title | Status | Link |
| --- | --- | --- | --- |
| wf1 | Task A | todo |  |
| wf2 | Task B | done |  |
```
