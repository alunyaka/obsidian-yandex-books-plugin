import { App, Modal } from 'obsidian';

export class ConfirmDeleteModal extends Modal {
  private resolved = false;
  private resolvePromise: (value: boolean) => void;

  constructor(app: App, private bookTitle: string) {
    super(app);
  }

  async confirm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.titleEl.setText('Ignore and delete book');
    const { contentEl } = this;
    contentEl.createEl('p', {
      text: `"${this.bookTitle}" will be moved to trash and added to your Kindle sync ignore list to prevent re-syncing.`,
    });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    buttonContainer.createEl('button', { text: 'Cancel' }).addEventListener('click', () => {
      this.resolved = true;
      this.resolvePromise(false);
      this.close();
    });

    const deleteBtn = buttonContainer.createEl('button', {
      text: 'Delete & Ignore',
      cls: 'mod-warning',
    });
    deleteBtn.addEventListener('click', () => {
      this.resolved = true;
      this.resolvePromise(true);
      this.close();
    });
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolvePromise(false);
    }
  }
}
