```fancy-kanban
---
version: 2
title: Colored Select Demo
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: inbox|doing|done, default: inbox
  - name: priority, type: Select, label: Priority, options: High|Medium|Low, colors: High=#e74c3c|Medium=#f39c12|Low=#27ae60, default: Medium
  - name: phase, type: Select, label: Phase, options: Planning|Active|Shipped, colors: Planning=#8e44ad|Active=#2980b9|Shipped=#27ae60, default: Planning
card_fields: priority, phase
---

| _id | Title | Status | Priority | Phase |
| --- | --- | --- | --- | --- |
| a1b2c3d4 | Design the login screen | doing | High | Active |
| e5f6g7h8 | Write unit tests | inbox | Medium | Planning |
| i9j0k1l2 | Deploy to staging | doing | Low | Active |
| m3n4o5p6 | Update documentation | done | Medium | Shipped |
| q7r8s9t0 | Fix navigation bug | inbox | High | Planning |
| u1v2w3x4 | Refactor auth module | doing | Medium | Active |
```
