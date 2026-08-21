# Demo Screenshot Board

A dense, visually rich board showcasing swimlanes, colored chips, and multiple card fields.

```fancy-kanban
---
version: 2
title: Sprint 24 · Aug 2026
fields:
  - name: title,    type: Text,     label: Title
  - name: status,   type: Select,   options: backlog|in-progress|review|done,        label: Status,   default: backlog
  - name: team,     type: Select,   options: Frontend|Backend|Design,                label: Team
  - name: priority, type: Select,   options: High|Medium|Low, colors: High=#e74c3c|Medium=#e67e22|Low=#27ae60, label: Priority, default: Medium
  - name: type,     type: Select,   options: Feature|Bug|Chore, colors: Feature=#2980b9|Bug=#c0392b|Chore=#7f8c8d, label: Type, default: Feature
  - name: due,      type: Date,     label: Due
card_fields: priority, type, due
lanes: team
workflow: backlog→in-progress, in-progress→review, review→done, review→in-progress, in-progress→backlog
---

| _id      | Title                          | Status      | Team     | Priority | Type    | Due        |
|----------|--------------------------------|-------------|----------|----------|---------|------------|
| fa1b2c3d | Redesign login page            | in-progress | Frontend | High     | Feature | 2026-08-28 |
| fb2c3d4e | Fix tooltip overflow on mobile | review      | Frontend | High     | Bug     | 2026-08-22 |
| fc3d4e5f | Add dark mode toggle           | backlog     | Frontend | Medium   | Feature |            |
| fd4e5f6g | Keyboard nav for modal         | backlog     | Frontend | Low      | Feature |            |
| fe5f6g7h | Animate page transitions       | done        | Frontend | Low      | Chore   | 2026-08-15 |
| ff6g7h8i | Update component library       | done        | Frontend | Medium   | Chore   | 2026-08-10 |
| ba1b2c3d | Migrate auth to OAuth 2.0      | in-progress | Backend  | High     | Feature | 2026-08-30 |
| bb2c3d4e | Rate limiting on API endpoints | in-progress | Backend  | High     | Feature | 2026-08-27 |
| bc3d4e5f | Fix token refresh race         | review      | Backend  | High     | Bug     | 2026-08-23 |
| bd4e5f6g | Audit log table migration      | review      | Backend  | Medium   | Chore   | 2026-08-25 |
| be5f6g7h | Optimize slow search query     | backlog     | Backend  | Medium   | Bug     |            |
| bf6g7h8i | Deprecate v1 API               | done        | Backend  | Low      | Chore   | 2026-08-12 |
| da1b2c3d | New onboarding illustrations   | in-progress | Design   | Medium   | Feature | 2026-08-29 |
| db2c3d4e | Icon set refresh               | backlog     | Design   | Low      | Feature |            |
| dc3d4e5f | Accessibility audit            | review      | Design   | High     | Chore   | 2026-08-24 |
| dd4e5f6g | Brand color tokens             | done        | Design   | Medium   | Feature | 2026-08-14 |
| de5f6g7h | Email template redesign        | done        | Design   | Medium   | Feature | 2026-08-11 |
```
