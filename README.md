# Obsidian Yandex Books Plugin

Obsidian plugin for syncing highlights and notes from Yandex Books into an Obsidian vault.

Yandex Books is the service formerly known in Russia as Bookmate. This plugin is not
affiliated with Yandex, Bookmate, Amazon, Kindle, or Obsidian.

## Current Status

The plugin currently supports:

- Yandex Books OAuth/session setup
- Yandex Books highlight sync
- Highlight note rendering
- Template editing and preview
- Vault file/frontmatter management
- Book ignore list
- Diff-based updates for already-synced notes

## Background

This project started as a fork of
[hadynz/obsidian-kindle-plugin](https://github.com/hadynz/obsidian-kindle-plugin).
The Kindle/Amazon sync code has been removed and replaced with a Yandex Books
integration while keeping the useful Obsidian plugin foundation: rendering,
template editing, vault file management, ignore-list handling, cancellation state,
and diff-based note updates.

The code in this fork was written with assistance from
[OpenAI Codex](https://openai.com/codex/). This is disclosed intentionally: the
project is small, experimental, and benefits from being honest about how it is
being built and reviewed.

## API References

Yandex Books does not provide a documented public highlights API. The integration
uses private/undocumented endpoints and may break if the service changes.

Useful public references reviewed during development:

- [stepan163s/yandex-book-api](https://github.com/stepan163s/yandex-book-api) —
  unofficial Python API for Yandex Books / Bookmate with OAuth and REST/GraphQL
  notes.
- [ilyakharlamov/bookmate_downloader](https://github.com/ilyakharlamov/bookmate_downloader) —
  historical Bookmate downloader. It targets the non-Yandex Bookmate service, so it
  is not used directly, but it is useful context for how Bookmate-era clients
  handled authentication/session data.

## Installation

### Manual install from a release

1. Download the latest release archive from this repository's GitHub Releases page.
2. In your Obsidian vault, create the plugin directory:

   ```bash
   mkdir -p "<your-vault>/.obsidian/plugins/obsidian-yandex-books-plugin"
   ```

3. Copy these files from the release into that directory:

   ```text
   main.js
   manifest.json
   styles.css
   ```

4. Restart Obsidian, or reload Community Plugins.
5. Enable `Yandex Books Highlights` in Settings -> Community plugins.
6. Open the plugin settings and connect your Yandex Books account.

### Build from source

```bash
git clone https://github.com/alunyaka/obsidian-yandex-books-plugin.git
cd obsidian-yandex-books-plugin
npm install
npm run build
```

Then copy the built files into your vault:

```bash
VAULT="<your-vault>"
PLUGIN_DIR="$VAULT/.obsidian/plugins/obsidian-yandex-books-plugin"
mkdir -p "$PLUGIN_DIR"
cp dist/main.js dist/manifest.json dist/styles.css "$PLUGIN_DIR/"
```

Restart Obsidian or toggle the plugin off/on after copying updated files.

## Templates

The generated note format is configurable in the plugin settings:

- `File name` controls the note filename.
- `File content` controls the full note body, including YAML/Obsidian properties.
- `Highlight` controls the rendering of each individual highlight.

The default file template includes `yandex-books-*` properties used by the plugin
to identify synced notes. If you customize properties, keep a stable book id
property, or future resyncs may not be able to match a note back to its Yandex
Books book.

## Development

| Command         | Expected               |
| --------------- | ---------------------- |
| `npm run lint`  | 0 errors (warnings OK) |
| `npm run test`  | All tests pass         |
| `npm run build` | `dist/main.js`         |

Node 20.x is expected.

## License

[MIT](LICENSE)
