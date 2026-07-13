# Content Pipeline

Editorial workflow for blog posts and articles. Shows multi-field cards with notes inline.

```fancy-kanban
---
title: Content Pipeline
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, options: idea|drafting|editing|scheduled|published, label: Status, default: idea
  - name: format, type: Select, options: article|tutorial|case-study|newsletter, label: Format, default: article
  - name: due, type: Date, label: Publish date
---

| _id | Title                                  | Status    | Format      | Publish date |
|-----|----------------------------------------|-----------|-------------|--------------|
| c1  | Why kanban works for solo creators     | published | article     | 2026-06-01   |
| c2  | Building an Obsidian plugin from scratch | published | tutorial  | 2026-06-15   |
| c3  | The relational notes experiment        | scheduled | case-study  | 2026-07-20   |
| c4  | Monthly tools roundup — July           | scheduled | newsletter  | 2026-07-31   |
| c5  | Obsidian vs Notion for engineers       | editing   | article     |              |
| c6  | TDD without mocks                      | drafting  | tutorial    |              |
| c7  | How I track reading with plain text    | drafting  | article     |              |
| c8  | Field types in structured notes        | idea      | article     |              |
| c9  | Swimlanes vs tags                      | idea      | article     |              |
```
