import { BrowserWindow, remote } from 'electron';
const { BrowserWindow: RemoteBrowserWindow } = remote;

const clearSessionData = (): Promise<boolean> => {
    const window: BrowserWindow = new RemoteBrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: false,
            partition: 'persist:kindle-highlights',
        },
        show: false,
    });

    return window.webContents.session.clearStorageData()
        .then(() => {
            return Promise.resolve(true);
        }).catch(() => {
            return Promise.resolve(false);
        });
}


export default clearSessionData;