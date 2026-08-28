# Card Limit

A board with `card_limit: 4` to keep the **Done** column from growing endlessly.
The first 4 completed cards are visible; older ones collapse behind a "Show more" button.

```fancy-kanban
---
version: 3
title: Feature Backlog
columns: status
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: backlog|in-progress|done, default: backlog
  - name: priority, type: Select, label: Priority, options: High|Medium|Low, colors: High=#e74c3c|Medium=#e67e22|Low=#27ae60, default: Medium
card_fields: priority
card_limit: 5
workflow: backlog→in-progress, in-progress→done, done→in-progress
---

| _id | Title | Status | Priority |
| --- | --- | --- | --- |
| cl000001 | Redesign settings panel | in-progress | High |
| cl000004 | Fix sidebar scroll on mobile | in-progress | High |
| cl000005 | User login flow | done | High |
| cl000006 | Password reset | done | Medium |
| cl000007 | Email notifications | done | Low |
| cl000008 | Profile page | done | Medium |
| cl000009 | Export to CSV | done | Low |
| cl000010 | Two-factor authentication | done | High |
| cl000011 | Onboarding tour | done | Medium |
| cl000002 | Add keyboard shortcuts | backlog | Medium |
| cl000003 | Dark mode support | backlog | Low |
```
