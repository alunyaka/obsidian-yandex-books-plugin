import _ from 'lodash';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { get } from 'svelte/store';

import type KindlePlugin from '~/.';
import type FileManager from '~/fileManager';
import { settingsStore } from '~/store';

import TemplateEditorModal from './templateEditorModal';

type AdapterFile = {
  type: 'folder' | 'file';
};

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: KindlePlugin, private fileManager: FileManager) {
    super(app, plugin);
    this.app = app;
  }

  public display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.templatesEditor();
    this.highlightsFolder();
    this.ignoredBooks();
    this.sponsorMe();
  }

  private templatesEditor(): void {
    new Setting(this.containerEl)
      .setName('Templates')
      .setDesc('Manage and edit templates for file names and highlight note content')
      .addButton((button) => {
        button
          .setButtonText('Manage')
          .onClick(() => {
            new TemplateEditorModal(this.app).show();
          });
      });
  }

  private highlightsFolder(): void {
    new Setting(this.containerEl)
      .setName('Highlights folder location')
      .setDesc('Vault folder to use for writing book highlight notes')
      .addDropdown((dropdown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const files = (this.app.vault.adapter as any).files as AdapterFile[];
        const folders = _.pickBy(files, (val) => {
          return val.type === 'folder';
        });

        Object.keys(folders).forEach((val) => {
          dropdown.addOption(val, val);
        });
        return dropdown.setValue(get(settingsStore).highlightsFolder).onChange((value) => {
          settingsStore.actions.setHighlightsFolder(value);
        });
      });
  }

  private ignoredBooks(): void {
    const currentValue = (get(settingsStore).ignoredBooks ?? []).join('\n');

    new Setting(this.containerEl)
      .setName('Ignored books')
      .setDesc(
        'Books with titles containing any of these phrases will be skipped during sync. One phrase per line, case-insensitive. Tip: use just the main title without subtitles.'
      )
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder('e.g.\nWords of Radiance\nAtomic Habits')
          .setValue(currentValue)
          .onChange((value) => {
            const books = value
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line !== '');
            settingsStore.actions.setIgnoredBooks(books);
          });
        textArea.inputEl.rows = 6;
        textArea.inputEl.cols = 50;
      });
  }

  private sponsorMe(): void {
    new Setting(this.containerEl)
      .setName('Sponsor')
      .setDesc(
        'Has this plugin enhanced your workflow? Say thanks as a one-time payment and buy me a coffee'
      )
      .addButton((bt) => {
        bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/hadynz"><img style="height: 35px;" src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=hadynz&button_colour=BD5FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"></a>`;
      });
  }
}
