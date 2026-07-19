# Basic Board

A minimal board with a title field and a status column. Good for simple to-do lists.

```fancy-kanban
---
version: 2
title: To Do
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: inbox|doing|done, default: inbox
card_fields: title
card_labels: false
---

| _id | Title | Status |
| --- | --- | --- |
| a1 | Buy groceries | doing |
| a5 | Something | done |
| a4 | Fix the bike | doing |
| a2 | Call the dentist | inbox |
| h3qpe4ry | Something | inbox |
| a3 | Read Thinking Fast | done |
```
