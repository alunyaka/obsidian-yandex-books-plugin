# Obsidian Kindle Plugin

![CI/CD status](https://github.com/hadynz/obsidian-kindle-plugin/actions/workflows/main.yml/badge.svg)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/hadynz/obsidian-kindle-plugin)

Sync (and resync) your Kindle notes and highlights directly into your [Obsidian][1] vault. You
can choose to sync using one of two methods:

## Sync Methods

### Amazon's Kindle Reader

Sync from the cloud any ebooks that you've purchased directly from Amazon. The plugin will
screen scrape your highlights from [Amazon's Kindle Reader][4] and continuously keep them in sync.

This method will not work for highlights from books, articles, PDFs, and personal documents
not purchased from Amazon (see next method).

### Kindle Device (My Clippings)

Sync your highlights by uploading your `My Clippings.txt` file stored on your Kindle device.
This file includes highlights, bookmarks and notes for any book on your Kindle regardless
if it has been purchased via Amazon.

You can extract your `My Clippings.txt` file by plugging it into your computer using USB.

![](https://user-images.githubusercontent.com/315585/117566330-39a78000-b10a-11eb-834f-52b90ccda1ac.gif)

## Features

- **Continuous, automatic syncing** — One button press to sync your highlights using your Amazon account via [Amazon's Kindle Reader][4]. Subsequent syncing will do an intelligent diff and bring in any new highlights without impacting any edits that you've done to your highlights file.

- **Clear sync progress + cancellation** — During sync, the plugin shows a ribbon + status bar indicator, rich step-by-step progress messages, and a detailed activity log you can copy for debugging. You can also cancel an in-progress sync (it will stop after the current step/book completes).

- **Sync non-Amazon books** — Sync your highlights by uploading your `My Clippings.txt` file from your Kindle device

- **Enriched metadata** — Enrich your notes by downloading extra metadata information about your book from Amazon.com. Can be toggled off in settings to speed up sync.

- **Powerful, flexible templating with preview** — Customise your highlights and file names to your liking by configuring your own template using the [Nunjucks][2] templating language with live preview. Available template variables include `publicationDate`, `lastAnnotatedDate`, `authorUrl`, and more.

- **Sync on startup** — Optionally sync your highlights automatically when Obsidian starts (Amazon sync only)

- **Obsidian Properties format** — Book metadata is stored using Obsidian's native properties/frontmatter format. A migration command is available for notes created with older versions of the plugin.

- **Multiple Amazon regions** — Supports Amazon stores worldwide: Global (amazon.com), Canada, France, Germany/Swiss/Austria, India, Italy, Japan, Netherlands, Spain, and UK

- **Book ignore list** — Exclude specific books from syncing by entering partial titles in settings. You can also right-click any synced book note to quickly ignore it or ignore and delete it.

- **Safe filename handling** — Book titles with special characters are automatically sanitised to work with Obsidian's file system requirements

## Settings

| Setting                    | Description                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Amazon region**          | Select your Amazon store region for syncing                                             |
| **Highlights folder**      | Choose which vault folder to store highlight notes                                      |
| **Templates**              | Customise file name, file content, and highlight templates                              |
| **Download book metadata** | Toggle extra metadata downloads from Amazon (cover image, author URL, publication date) |
| **Sync on startup**        | Automatically sync when Obsidian starts                                                 |
| **Ignored books**          | List of book title phrases to exclude from syncing (partial match, case-insensitive)    |

## Known Considerations

### Security

If you choose to sync your highlights via Amazon's online Kindle Reader, it is important to note
that by logging in to your Amazon account via Obsidian your Amazon session becomes available to
any other plugin across your vaults until your session expires.

You can mitigate this risk by logging out after every sync (from settings) or using the offline
method of syncing by uploading your `My Clippings.txt` file instead.

### Export Limits

For several reasons (see [here][5] and [here][6]) the Kindle platform can sometimes limit the amount
of highlighted text that can be exported from a particular book. This limit varies from book to book and depends on whether the book was purchased from Amazon or has DRM protection. There is currently no known alternative to work around this.

## Say Thanks

If you like this plugin and would like to buy me a coffee, you can!

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="BuyMeACoffee" width="140">](https://www.buymeacoffee.com/hadynz)

[![GitHub Sponsors](https://img.shields.io/github/sponsors/hadynz?style=social)](https://github.com/sponsors/hadynz)

## License

[MIT](LICENSE)

[1]: https://obsidian.md
[2]: https://mozilla.github.io/nunjucks
[3]: https://github.com/pjeby/hot-reload
[4]: https://read.amazon.com/notebook
[5]: https://help.readwise.io/article/47-why-are-my-kindle-highlights-truncated-ellipses#:~:text=Publishers%20require%20Amazon%20to%20place,the%20book%20will%20be%20truncated.
[6]: https://brian.carnell.com/articles/2018/route-around-amazon-kindles-ridiculous-limits-on-highlights-exporting-with-bookcision/
