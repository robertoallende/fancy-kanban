# Software Project

A richer board with priority, type, and due date fields — typical for a dev sprint.

```fancy-kanban
---
title: Sprint 12
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: backlog|in-progress|review|done, label: Status, default: backlog
  - name: type, type: Select, options: feature|bug|chore, label: Type, default: feature
  - name: priority, type: Select, options: high|medium|low, label: Priority, default: medium
  - name: due, type: Date, label: Due
---

| _id | Title                          | Status      | Type    | Priority | Due        |
|-----|--------------------------------|-------------|---------|----------|------------|
| s1  | User login flow                | done        | feature | high     | 2026-07-01 |
| s2  | Password reset email           | done        | feature | high     | 2026-07-01 |
| s3  | Fix session expiry bug         | review      | bug     | high     | 2026-07-10 |
| s4  | Add dark mode toggle           | in-progress | feature | medium   | 2026-07-15 |
| s5  | Refactor auth middleware       | in-progress | chore   | medium   |            |
| s6  | Profile page                   | backlog     | feature | medium   | 2026-07-20 |
| s7  | Notification preferences       | backlog     | feature | low      |            |
| s8  | Remove deprecated API calls    | backlog     | chore   | low      |            |
```
