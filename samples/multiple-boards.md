# Weekly Review

This note shows two boards living side by side in the same file — work and personal.

## Work

```fancy-kanban
---
title: Work This Week
fields:
  - name: title, type: Text, label: Task
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
  - name: project, type: Text, label: Project
---

| _id | Task                        | Status | Project       |
|-----|-----------------------------|--------|---------------|
| w1  | Review PR from Ana          | done   | fancy-kanban  |
| w2  | Prep demo for Tuesday       | doing  | fancy-kanban  |
| w3  | Update architecture diagram | doing  | fancy-kanban  |
| w4  | Reply to hiring email       | todo   | team          |
| w5  | Q3 planning doc             | todo   | planning      |
```

## Personal

```fancy-kanban
---
title: Personal This Week
fields:
  - name: title, type: Text, label: Task
  - name: status, type: Select, options: todo|doing|done, label: Status, default: todo
---

| _id | Task                    | Status |
|-----|-------------------------|--------|
| p1  | Book flights for August | done   |
| p2  | Finish current book     | doing  |
| p3  | Gym — three times       | doing  |
| p4  | Call mum                | todo   |
| p5  | Fix kitchen shelf       | todo   |
```

