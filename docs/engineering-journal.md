# Engineering Journal — obsidian-kindle-plugin

Ongoing log of learnings, decisions, and gotchas discovered during development.

---

## 2026-02-16 — Session 1: Project Revival (v2.0.0)

### What We Did

Revived the project after ~3 years of inactivity. Merged 14 community PRs into a single v2.0.0 release, fixed CI/CD, and shipped a GitHub release.

### PRs Merged (14 total)

| PR   | Change                          | Conflict?                                           |
| ---- | ------------------------------- | --------------------------------------------------- |
| #326 | Dependency bump (vulns 27→3)    | No                                                  |
| #322 | Notes not displayed after sync  | No                                                  |
| #324 | Sync on startup crash           | No                                                  |
| #257 | startSync() parameter fix       | No                                                  |
| #278 | Amazon.nl region                | No                                                  |
| #294 | Amazon.ca region                | Yes — resolved with #278 (kept both NL+CA)          |
| #246 | Cover image 1024px              | No                                                  |
| #279 | Product page URL regional       | Yes — resolved with #246 (kept both)                |
| #310 | Timeout 30s for large libraries | No                                                  |
| #280 | Author URL scraping fix         | No                                                  |
| #323 | Amazon logout exception         | No                                                  |
| #254 | publicationDate template var    | No                                                  |
| #282 | lastAnnotatedDate template var  | Yes — resolved with #254 (kept both)                |
| #328 | Obsidian properties format      | Yes — 3 conflicts (scrapeBooks, index, fileManager) |

### PRs Rejected/Deferred

- **#64, #154**: Closed as stale (4-5 years old, merge conflicts, superseded by newer work)
- **#274** (MD5 book IDs): Breaking change — deferred until migration strategy is designed

### Key Learnings

#### 1. PR Merge Order Matters

When multiple PRs touch the same file, merge order creates cascading conflicts. We discovered 4 PRs touching `scrapeBooks.ts` and had to plan the sequence carefully:

- Isolated changes first (#246 image, #310 timeout)
- Dependent changes after (#279 regional URLs needed #246's context)
- Largest PR last (#328 touched everything)

**Lesson**: Before batch-merging PRs, map file-level overlap and plan merge order to minimize conflicts.

#### 2. Integration Branch Pattern Works Well

Using `revival/v2.0.0` as a staging branch let us merge freely without risking master. Only after all 14 PRs were merged, lint/test/build passed, and manual testing confirmed — then we merged to master.

**Lesson**: For any batch of 3+ PR merges, always use an integration branch.

#### 3. Node Version in CI is a Silent Killer

The release workflow used Node 15 (from 2020). It didn't fail on CI runs because CI only ran on PRs, not releases. The release workflow hadn't been triggered in 3 years, so the Node 15 issue was invisible until we actually cut a release.

**Failure**: `Cannot find module 'node:fs'` — modern npm packages use `node:` protocol prefixes which Node 15 doesn't support.

**Fix**: Updated to Node 20, modern actions (v4), replaced deprecated `upload-release-asset@v1` with `softprops/action-gh-release@v2`, replaced `::set-output` with `$GITHUB_OUTPUT`.

**Lesson**: Always verify release workflows match the CI workflows' Node version. Test the release pipeline before it matters.

#### 4. `gh` CLI vs SSH Auth Mismatch

Git push worked via SSH (authenticated as `hadynz`, the repo owner). But `gh` CLI was authenticated as `hosman-nz` (a different account with only pull access). This meant:

- `git push` worked
- `gh release create` 404
- `gh pr close` permission denied

**Lesson**: At session start, verify `gh auth status` and ensure the active account matches the repo owner. Use `gh auth switch` if needed.

#### 5. Pre-commit Hooks Catch Real Issues

lint-staged rejected a commit because PR #328 introduced an unnecessary `async` on a callback in `index.ts`. The hook caught it, we fixed it, and moved on.

**Lesson**: Don't bypass hooks. They exist for a reason. If a commit is rejected, fix the issue — don't `--no-verify`.

#### 6. Sync Behavior After Long Hiatus is Expected

When testing, all books re-synced despite only one being deleted. This is expected: `diffBooks()` uses `updatedSince(lastSyncDate)`, and when `lastSyncDate` is 3 years old, everything qualifies. After the first re-sync, subsequent syncs will be incremental again.

**Lesson**: This is not a bug. Don't "fix" it. Document it for users who ask.

#### 7. Properties Migration is Manual (By Design)

PR #328 adds Obsidian's native properties/frontmatter format but doesn't auto-migrate. Users must run `Kindle: Migrate properties to new format` from the command palette. The plugin reads both formats, so nothing breaks.

**Open question**: Should we add a startup notice when old-format files are detected? Deferred — owner wants to think about the UX.

#### 8. `softprops/action-gh-release@v2` is Simpler

The old workflow had 3 separate upload steps (one per asset) using `actions/upload-release-asset@v1`. The new `softprops/action-gh-release@v2` does all 3 in one step with a `files` glob. Less YAML, fewer failure points.

#### 9. Conflict Resolution Strategy

When resolving merge conflicts between PRs, the approach was always:

- Keep **both** changes when PRs add independent functionality (e.g., NL + CA regions)
- Keep the **later PR's structure** when PRs restructure the same code (e.g., #328's rewrite of fileManager)
- Verify with lint + tests after every conflict resolution

### Metrics

- **PRs merged**: 14 (of 17 open)
- **PRs closed**: 2 (stale)
- **PRs deferred**: 1 (#274, breaking change)
- **Tests**: 112 passing (was 111 before PR #328 added one)
- **Lint errors**: 0 (32 warnings, pre-existing)
- **Vulnerabilities**: 27 → 3 (from dependency bump)
- **Release assets**: main.js (1.07MB), manifest.json (314B), zip (295KB)

### What's Next

- Issue triage (75 open issues)
- PR #274 migration strategy
- Migration UX (startup notice for old-format files?)
- Update `minAppVersion` from 0.10.2 to something modern
- Backfill `versions.json` with historical entries
