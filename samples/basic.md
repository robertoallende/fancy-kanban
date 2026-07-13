# Basic Board

A minimal board with a title field and a status column. Good for simple to-do lists.

```fancy-kanban
---
title: To Do
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: inbox|doing|done, default: inbox
---

| _id | Title | Status |
| --- | --- | --- |
| a1 | Buy groceries | doing |
| a2 | Call the dentist | inbox |
| a3 | Read Thinking Fast | done |
| a4 | Fix the bike | doing |
| a5 | Something | inbox |
| 3j6rx0fx |  | inbox |
```
