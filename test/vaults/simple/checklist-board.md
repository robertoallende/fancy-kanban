```fancy-kanban
---
version: 2
title: Checklist Board
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|done, label: Status, default: todo
  - name: tasks, type: Textarea, label: Tasks
card_fields: tasks
---

| _id | Title | Status | Tasks |
| --- | --- | --- | --- |
| cl1 | Card with checklist | todo | - [ ] Review PR<br>- [x] Write tests<br>- [ ] Update docs<br>Some plain text |
| cl2 | Card without checklist | todo | Just plain notes here |
```
