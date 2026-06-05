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
| `src/auth`                 | Yandex Books session, login window, and auth-state helpers       |

## Sync Core

- Source adapters should provide `Book` and `Highlight[]` data to `SyncManager`.
- `SyncManager.filterBooksToSync()` compares incoming books against vault files and ignored-title settings.
- `SyncManager.syncBook()` creates new notes or resyncs existing notes through `DiffManager`.
- Provider-specific login, scraping, and parsing logic should live outside the sync core.

## Yandex Books API Notes

- Yandex Books does not currently expose a documented public API for highlights.
- The web app is a Next.js frontend backed by Bookmate/Yandex Books GraphQL/BFF calls.
- Public pages expose book and quote routes such as `/books/:id` and `/books/:id/quotes`.
- Personal library and personal quotes require an authenticated Yandex Books web session.
- The plugin keeps Yandex cookies in a separate Electron partition: `persist:yandex-books`.
- Plugin settings store only lightweight auth metadata (`isLoggedIn`, optional login/uid, and last check time), not session cookies.
- The future source adapter should reuse the authenticated Electron session and map remote library/quote data into the existing `Book` and `Highlight` models.

## Properties Format

- Files use Obsidian's native properties/frontmatter format.
- Migration remains a manual command: `Kindle: Migrate properties to new format`.
- The file manager still reads both old nested frontmatter and the newer flat property format.
