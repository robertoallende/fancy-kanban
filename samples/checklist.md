# Checklist Cards

Cards with a `Textarea` field can embed checklists. Any line starting with `- [ ]` or `- [x]` renders as an interactive checkbox — clicking it saves the updated state directly to the board file.

Plain-text lines in the same field render as non-interactive notes alongside the checkboxes.

```fancy-kanban
---
title: Release Checklist
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
  - name: tasks, type: Textarea, label: Tasks
card_fields: tasks
---

| _id | Title | Status | Tasks |
| --- | --- | --- | --- |
| r1 | Plan release | done | - [x] Define scope<br>- [x] Write unit tests<br>- [x] Write e2e tests<br>- [x] Update changelog |
| r2 | Cut the release | doing | - [x] Bump version numbers<br>- [ ] Tag the commit<br>- [ ] Push the tag<br>Target: v0.5.0 |
| r3 | Publish | todo | - [ ] Submit to Obsidian community plugins<br>- [ ] Post release notes<br>- [ ] Close milestone |
```
