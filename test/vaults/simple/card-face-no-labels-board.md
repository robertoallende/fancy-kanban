```fancy-kanban
---
version: 1
title: Card Face No Labels Board
fields:
  - name: title, type: Text, label: Title
  - name: priority, type: Select, label: Priority, options: low|medium|high, default: medium
  - name: status, type: Select, label: Status, options: todo|done, default: todo
card_title: title
card_fields: priority
card_labels: false
columns: status
---

| _id | Title | Priority | Status |
| --- | --- | --- | --- |
| nl1 | Design | high | todo |
| nl2 | Implement | low | done |
```
