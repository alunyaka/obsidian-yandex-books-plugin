# Decisions & Deferred Work — obsidian-kindle-plugin

Tracking key decisions made and work explicitly deferred for future sessions.

---

## Active Decisions

### PR #274 — MD5 Book IDs (Deferred)

**Decision**: Do not merge. Breaking change that alters how books are identified.
**Reason**: Existing users have highlight files keyed by the current ID scheme. Merging would orphan those files unless a migration path is built.
**Next step**: Design a migration strategy before reconsidering.

### Properties Migration UX (Deferred)

**Decision**: Migration remains a manual command (`Kindle: Migrate properties to new format`). No automatic prompt on startup.
**Reason**: Owner wants to think about the right UX before committing to an approach.
**Options to consider**:

- One-time notice on startup when old-format files are detected
- Settings tab banner
- Do nothing — power users find it via command palette

### `minAppVersion` (Deferred)

**Decision**: Leave at `0.10.2` for now.
**Reason**: Obsidian is well past 1.x but changing this may affect which users can install. Needs research on what Obsidian versions are still in use.

### `versions.json` Backfill (Low Priority)

**Decision**: Historical version entries are missing. Not urgent.
**Reason**: Only matters for users on very old Obsidian versions trying to install specific plugin versions.

## Deferred Work

| Item                       | Reason                           | Priority |
| -------------------------- | -------------------------------- | -------- |
| Issue triage (75 open)     | Dedicated session needed         | High     |
| PR #274 (MD5 book IDs)     | Breaking change, needs migration | Medium   |
| `minAppVersion` update     | Needs Obsidian version research  | Low      |
| Automatic migration prompt | UX design pending                | Low      |
| Backfill `versions.json`   | Cosmetic, not blocking           | Low      |
