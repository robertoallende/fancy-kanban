# Basic Board

A minimal board with a title field and a status column. Good for simple to-do lists.

```fancy-kanban
---
title: To Do
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: inbox|doing|done, label: Status, default: inbox
---

| _id | Title              | Status |
|-----|--------------------|--------|
| a1  | Buy groceries      | inbox  |
| a2  | Call the dentist   | inbox  |
| a3  | Read Thinking Fast | doing  |
| a4  | Fix the bike       | doing  |
| a5  | Pay rent           | done   |
```
