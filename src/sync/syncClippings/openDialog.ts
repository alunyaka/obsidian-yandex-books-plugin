import { remote } from 'electron';

const dialog: Electron.Dialog = remote.dialog;
const getCurrentWindow: () => Electron.BrowserWindow = remote.getCurrentWindow;

type DialogResponse = [file: string, canceled: boolean];

export const openDialog = async (): Promise<DialogResponse> => {
  const result = await dialog.showOpenDialog(getCurrentWindow(), {
    filters: [{ name: 'Text file', extensions: ['txt'] }],
    properties: ['openFile'],
  });

  if (result.canceled === true) {
    return ['', true];
  }

  return [result.filePaths[0], false];
};
