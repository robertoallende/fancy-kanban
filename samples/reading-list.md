A reading list organized by genre. Fiction lane includes The Expanse series; non-fiction covers science, history, and craft.

```fancy-kanban
---
version: 2
title: Reading List
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: to-read|reading|read, default: to-read
  - name: author, type: Text, label: Author
  - name: genre, type: Select, label: Genre, options: fiction|non-fiction, default: fiction
lanes: genre
card_title: title
card_fields: author
---

| _id | Title | Status | Author | Genre |
| --- | --- | --- | --- | --- |
| ex01 | Leviathan Wakes | read | James S.A. Corey | fiction |
| ex02 | Caliban's War | read | James S.A. Corey | fiction |
| ex03 | Abaddon's Gate | read | James S.A. Corey | fiction |
| ex04 | Cibola Burn | reading | James S.A. Corey | fiction |
| ex05 | Nemesis Games | to-read | James S.A. Corey | fiction |
| ex07 | Persepolis Rising | to-read | James S.A. Corey | fiction |
| nf01 | Sapiens | read | Yuval Noah Harari | non-fiction |
| nf02 | Thinking, Fast and Slow | read | Daniel Kahneman | non-fiction |
| nf03 | The Pragmatic Programmer | reading | David Thomas & Andrew Hunt | non-fiction |
| nf04 | A Short History of Nearly Everything | to-read | Bill Bryson | non-fiction |
| nf05 | Why We Sleep | to-read | Matthew Walker | non-fiction |
| ex06 | Babylon's Ashes | to-read | James S.A. Corey | fiction |
```
