# Fancy Kanban

[![CI](https://github.com/robertoallende/fancy-kanban/actions/workflows/ci.yml/badge.svg)](https://github.com/robertoallende/fancy-kanban/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/robertoallende/fancy-kanban/graph/badge.svg?token=007FYCYQV9)](https://codecov.io/github/robertoallende/fancy-kanban)

Embeddable kanban boards in any Obsidian note, with native swimlanes and a relational field model.

## Features (planned)

- Embed one or more kanban boards inside any note, alongside prose and links
- Native swimlanes — a true matrix grouping over two fields, no CSS required
- Relational field model: Select, Text, Textarea, Date per card
- Graceful degradation: boards are valid markdown tables when the plugin is absent

## Local development

### Requirements

- Node.js 18+
- An Obsidian vault dedicated to plugin development

### Build

```bash
npm install
npm run dev      # watch mode — rebuilds on every save
npm run build    # production build (type-checks first)
```

### Load into Obsidian

1. Create a `fancy-kanban` folder inside your vault's `.obsidian/plugins/` directory.
2. Copy (or symlink) `main.js`, `manifest.json`, and `styles.css` (if present) into that folder.
3. In Obsidian: **Settings → Community plugins → Turn on community plugins**, then enable **Fancy Kanban**.
4. After rebuilding, use **Reload app without saving** from the command palette to pick up changes (or install the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin to do this automatically).

### Symlinking (recommended for active development)

```bash
ln -s /path/to/fancy-kanban /path/to/vault/.obsidian/plugins/fancy-kanban
```

Then `npm run dev` — every rebuild is picked up immediately after a plugin reload.

## License

MIT
