Redesigning the marketing site this quarter. Board below tracks where each piece stands.

```fancy-kanban
---
title: Website Relaunch
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
  - name: due, type: Date, label: Due
  - name: priority, type: Select, options: low|medium|high, label: Priority
workflow: todo→doing, doing→done, doing→todo, done→doing
---

| _id    | Status | Title                  | Due        | Priority |
|--------|--------|------------------------|------------|----------|
| a1b2c3 | todo   | Rewrite homepage copy  | 2026-07-28 | high     |
| d4e5f6 | todo   | Source new photography |            | medium   |
| g7h8i9 | todo   | Draft pricing page     | 2026-08-02 |          |
| j1k2l3 | doing  | Build nav component    | 2026-07-20 | high     |
| m4n5o6 | doing  | Migrate blog posts     |            | low      |
| p7q8r9 | done   | Set up staging env     | 2026-07-10 |          |
| s1t2u3 | done   | Pick color palette     | 2026-07-05 | medium   |
```


