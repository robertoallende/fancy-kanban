```fancy-kanban
---
version: 2
title: Global Reading List
fields:
  - name: title, type: Text, label: Title
  - name: status, type: Select, label: Status, options: want-to-read|reading|done, default: want-to-read
  - name: language, type: Select, label: Language, options: Russian|Japanese|Chinese|Korean, default: Russian
card_fields: language
---

| _id | Title | Status | Language |
| --- | --- | --- | --- |
| ru1 | Мастер и Маргарита | done | Russian |
| ru2 | Преступление и наказание | reading | Russian |
| ru3 | Война и мир | want-to-read | Russian |
| ja1 | 雪国 | done | Japanese |
| ja2 | ノルウェイの森 | reading | Japanese |
| ja3 | 斜陽 | want-to-read | Japanese |
| zh1 | 红楼梦 | done | Chinese |
| zh2 | 三体 | reading | Chinese |
| zh3 | 活着 | want-to-read | Chinese |
| ko1 | 채식주의자 | done | Korean |
| ko2 | 82년생 김지영 | reading | Korean |
| ko3 | 아몬드 | want-to-read | Korean |
```
