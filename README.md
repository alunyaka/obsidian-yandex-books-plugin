# Obsidian Yandex Books Plugin

Fork of `hadynz/obsidian-kindle-plugin` being reworked to sync highlights and notes from Yandex Books into an Obsidian vault.

## Current Status

The original import paths have been removed:

- Cloud login/scraping from the previous upstream service
- Local device-export parsing
- Region-specific account settings and login/logout session handling
- External metadata scraping tied to the old provider

The remaining core keeps the useful Obsidian plugin foundation:

- Highlight note rendering
- Template editing and preview
- Vault file/frontmatter management
- Book ignore list
- Diff-based updates for already-synced notes

The next implementation step is adding a Yandex Books source adapter that produces the existing `Book` and `Highlight` models for `SyncManager`.

## Development

| Command         | Expected               |
| --------------- | ---------------------- |
| `npm run lint`  | 0 errors (warnings OK) |
| `npm run test`  | All tests pass         |
| `npm run build` | `dist/main.js`         |

Node 20.x is expected.

## License

[MIT](LICENSE)
