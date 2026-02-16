# Architecture — obsidian-kindle-plugin

## Key Files

| File                         | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/index.ts`               | Plugin entry point. Registers commands, settings tab, sync-on-boot |
| `src/scraper/scrapeBooks.ts` | Core scraping logic. Hits Amazon Kindle Reader                     |
| `src/scraper/session.ts`     | Amazon session management (login/logout)                           |
| `src/fileManager/index.ts`   | Reads/writes highlight files to vault. Handles properties format   |
| `src/amazonRegion.ts`        | Amazon region definitions (10 regions supported)                   |
| `src/models.ts`              | TypeScript interfaces (Book, BookHighlight, etc.)                  |

## Sync Behavior

- `diffBooks()` determines what to sync. Uses `updatedSince()` with `lastSyncDate`
- If `lastSyncDate` is old/stale, ALL books come through (expected, not a bug)
- Sync-on-boot uses `setTimeout` (from PR #328) to avoid "taking too long to load"
- After a full re-sync, subsequent syncs are incremental

## Properties Format (v2.0.0)

- Files use Obsidian's native properties/frontmatter format (introduced in PR #328)
- Migration is a **manual command**: `Kindle: Migrate properties to new format`
- Backward compatible — plugin reads both old and new format
- No automatic migration prompt on startup (potential future enhancement)

## Amazon Regions

10 regions supported as of v2.0.0:

`.com`, `.co.uk`, `.co.jp`, `.de`, `.fr`, `.es`, `.it`, `.in`, `.nl`, `.ca`

Regions are defined in `src/amazonRegion.ts`. Product page URLs and scraping endpoints are region-aware.
