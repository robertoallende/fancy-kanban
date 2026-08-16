```fancy-kanban
---
version: 2
title: Colored Select Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: inbox|doing|done, default: inbox
  - name: priority, type: Select, label: Priority, options: High|Medium|Low, colors: High=#e74c3c|Medium=#f39c12|Low=#27ae60, default: Medium
card_fields: priority
---

| _id | Title | Status | Priority |
| --- | --- | --- | --- |
| chip0001 | High priority task | doing | High |
| chip0002 | Medium priority task | inbox | Medium |
| chip0003 | No priority task | inbox |  |
```
