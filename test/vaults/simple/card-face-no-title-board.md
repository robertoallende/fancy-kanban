```fancy-kanban
---
version: 1
title: Card Face No Title Board
fields:
  - name: title, type: Text, label: Title
  - name: priority, type: Select, label: Priority, options: low|medium|high, default: medium
  - name: status, type: Select, label: Status, options: todo|done, default: todo
card_title: 
card_fields: priority
columns: status
---

| _id | Title | Priority | Status |
| --- | --- | --- | --- |
| nt1 | Design | high | todo |
| nt2 | Implement | low | done |
```
