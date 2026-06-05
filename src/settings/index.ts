import _ from 'lodash';
import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { get } from 'svelte/store';

import type KindlePlugin from '~/.';
import { clearYandexSession, readYandexAuthInfo, YandexLoginModal } from '~/auth';
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
    this.yandexAccount();
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

  private yandexAccount(): void {
    const auth = get(settingsStore).yandexAuth;
    const desc = auth.isLoggedIn
      ? `Connected${auth.login ? ` as ${auth.login}` : ''}${
          auth.lastCheckedAt ? ` - checked ${new Date(auth.lastCheckedAt).toLocaleString()}` : ''
        }${auth.oauthToken ? ' - OAuth token saved' : ' - OAuth token missing'}`
      : 'Connect your Yandex account with OAuth. The OAuth token is saved in plugin settings and used for Yandex Books API requests.';

    new Setting(this.containerEl)
      .setName('Yandex Books account')
      .setDesc(desc)
      .addButton((button) => {
        button.setButtonText(auth.isLoggedIn ? 'Reconnect' : 'Connect').onClick(async () => {
          button.setDisabled(true).setButtonText('Connecting...');

          try {
            const authInfo = await new YandexLoginModal().open();

            if (authInfo?.isLoggedIn) {
              settingsStore.actions.setYandexAuth(authInfo);
              new Notice('Yandex Books account connected');
            } else {
              new Notice('Yandex Books login was not completed');
            }
          } catch (error) {
            console.error('Error connecting Yandex Books account:', error);
            new Notice(`Could not connect Yandex Books account: ${String(error)}`);
          }

          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText('Refresh').onClick(async () => {
          button.setDisabled(true).setButtonText('Checking...');

          try {
            const authInfo = await readYandexAuthInfo();
            settingsStore.actions.setYandexAuth({
              ...authInfo,
              oauthToken: auth.oauthToken,
              oauthTokenCapturedAt: auth.oauthTokenCapturedAt,
              isLoggedIn: authInfo.isLoggedIn || auth.oauthToken != null,
            });
            new Notice(
              authInfo.isLoggedIn || auth.oauthToken != null
                ? 'Yandex Books auth state refreshed'
                : 'Not logged in'
            );
          } catch (error) {
            console.error('Error checking Yandex Books account:', error);
            new Notice(`Could not check Yandex Books account: ${String(error)}`);
          }

          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText('Sign out').setDisabled(!auth.isLoggedIn).onClick(async () => {
          button.setDisabled(true).setButtonText('Signing out...');

          try {
            await clearYandexSession();
            settingsStore.actions.setYandexAuth({ isLoggedIn: false });
            new Notice('Signed out of Yandex Books');
          } catch (error) {
            console.error('Error signing out of Yandex Books:', error);
            new Notice(`Could not sign out of Yandex Books: ${String(error)}`);
          }

          this.display();
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
