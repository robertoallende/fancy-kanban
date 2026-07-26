```fancy-kanban
---
version: 2
title: Swimlane Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: todo|done, default: todo
  - name: assignee, type: Select, label: Assignee, options: roberto|teacher, default: roberto
lanes: assignee
---

| _id | Title | Status | Assignee |
| --- | --- | --- | --- |
| s1 | Roberto todo | todo | roberto |
| s2 | Roberto done | done | roberto |
| s3 | Teacher todo | todo | teacher |
| s4 | Teacher done | done | teacher |
```
