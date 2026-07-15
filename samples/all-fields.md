# All Field Types

A board showcasing every supported field type: Text, Textarea, Date, Number, Select, and File.

```fancy-kanban
---
title: Bug Tracker
fields:
  - name: title, type: Text, label: Title
  - name: description, type: Textarea, label: Description
  - name: due, type: Date, label: Due Date
  - name: estimate, type: Number, label: Estimate (h)
  - name: priority, type: Select, label: Priority, options: low|medium|high, default: medium
  - name: spec, type: File, label: Spec File
  - name: status, type: Select, label: Status, options: backlog|in-progress|done, default: backlog
---

| _id | Title | Description | Due Date | Estimate (h) | Priority | Spec File | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b3 | Update onboarding copy | Revise welcome screen text based on user feedback | 2026-07-18 | 2 | low |  | done |
| b4 | API rate limiting | Add per-user rate limits to all public endpoints | 2026-08-01 | 5 | high | specs/api.md | backlog |
| b2 | Add dark mode toggle | Implement theme switcher in settings panel | 2026-07-25 | 8 | medium | specs/ui.md | backlog |
| b1 | Fix login timeout | Users are logged out after 5 min of inactivity instead of 30 | 2026-07-20 | 3 | high | specs/auth.md | in-progress |
```

