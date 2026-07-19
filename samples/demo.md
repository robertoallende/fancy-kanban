Redesigning the marketing site this quarter. Board below tracks where each piece stands.

```fancy-kanban
---
version: 2
title: Website Relaunch
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: todo|doing|done, default: todo
  - name: due, type: Date, label: Due
  - name: priority, type: Select, label: Priority, options: low|medium|high
workflow: todo→doing, doing→done, doing→todo, done→doing
---

| _id | Title | Status | Due | Priority |
| --- | --- | --- | --- | --- |
| a1b2c3 | Rewrite homepage copy | todo | 2026-07-28 | high |
| d4e5f6 | Source new photography | todo |  | medium |
| j1k2l3 | Build nav component | doing | 2026-07-20 | high |
| m4n5o6 | Migrate blog posts | doing |  | low |
| p7q8r9 | Set up staging env | done | 2026-07-10 |  |
| s1t2u3 | Pick color palette | done | 2026-07-05 | medium |
| g7h8i9 | Draft pricing page | done | 2026-08-02 |  |
```


