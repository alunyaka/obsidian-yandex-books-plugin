# Architecture — obsidian-yandex-books-plugin

## Key Files

| File                       | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `src/index.ts`             | Plugin entry point. Registers commands, settings tab, status UI  |
| `src/fileManager/index.ts` | Reads/writes highlight files to the vault and handles properties |
| `src/sync/syncManager`     | Core book/highlight sync orchestration for future source adapters |
| `src/sync/diffManager`     | Applies highlight diffs to existing notes                        |
| `src/rendering`            | Nunjucks-based note and highlight rendering                      |
| `src/models.ts`            | TypeScript interfaces for books, highlights, metadata, files     |

## Sync Core

- Source adapters should provide `Book` and `Highlight[]` data to `SyncManager`.
- `SyncManager.filterBooksToSync()` compares incoming books against vault files and ignored-title settings.
- `SyncManager.syncBook()` creates new notes or resyncs existing notes through `DiffManager`.
- Provider-specific login, scraping, and parsing logic should live outside the sync core.

## Properties Format

- Files use Obsidian's native properties/frontmatter format.
- Migration remains a manual command: `Kindle: Migrate properties to new format`.
- The file manager still reads both old nested frontmatter and the newer flat property format.
