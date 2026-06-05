# Engineering Journal — obsidian-yandex-books-plugin

Ongoing log of learnings, decisions, and gotchas discovered during development.

## 2026-06-05 — Source Adapter Reset

The fork is being redirected toward Yandex Books. As the first cleanup step, the previous source adapters were removed:

- Cloud account login and remote notebook scraping
- Local device-export dialog and parser
- Region settings, login/logout settings, and provider-specific metadata scraping

The reusable pieces remain in place: rendering, template editing, vault file management, ignore-list handling, cancellation state, and diff-based note updates.

Next step: add a Yandex Books adapter that maps provider data into the existing `Book` and `Highlight` models.

## 2026-06-05 — Yandex Books Public Quotes Adapter

The first working Yandex Books adapter uses OAuth plus the Bookmate REST API:

- OAuth token is captured via Yandex OAuth and sent as `Auth-Token`.
- Profile is loaded from `/api/v5/profile`.
- Public quotes are paginated from `/api/v5/users/:login/quotes?page=N&per_page=20`.
- REST quote endpoints return only public quotes. Manual validation with one public and one private quote confirmed that private quotes are not returned.
- REST probes such as `include_private=true`, `visibility=all`, and `/profile/quotes` returned the same public set.
- GraphQL introspection/probing is blocked by gateway whitelisting (`Whitelist: query not found`).

Deferred: private quote import needs a captured real frontend GraphQL/BFF operation from the Yandex Books "Quotes" UI.
