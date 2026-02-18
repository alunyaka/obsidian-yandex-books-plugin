import cheerio, { Root } from 'cheerio';
import { BrowserWindow, remote } from 'electron';

import { ee } from '~/eventEmitter';

const { BrowserWindow: RemoteBrowserWindow } = remote;

type DomResult = {
  dom: Root;
  didNavigateUrl: string;
};

type LoadRemoteDomOptions = {
  log?: boolean;
  label?: string;
};

export const loadRemoteDom = async (
  targetUrl: string,
  timeout = 0,
  options: LoadRemoteDomOptions = {}
): Promise<DomResult> => {
  const shouldLog = options.log !== false;
  const labelPrefix = options.label ? `${options.label}: ` : '';

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

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  window.loadURL(targetUrl);

  return new Promise<DomResult>((resolveWrapper) => {
    let didNavigateUrl: string = null;

    window.webContents.on('did-navigate', (_event, url) => {
      didNavigateUrl = url;

      if (url !== targetUrl) {
        if (shouldLog) {
          ee.emit('syncLog', `${labelPrefix}Navigated to ${url}`);
        }
      }
    });

    window.webContents.on('did-finish-load', () => {
      if (shouldLog) {
        ee.emit('syncLog', `${labelPrefix}Page loaded`);
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.resolve()
        .then(() => {
          if (timeout > 0) {
            if (shouldLog) {
              ee.emit(
                'syncLog',
                `${labelPrefix}Waiting ${Math.round(timeout / 1000)}s for content to render…`
              );
            }
            return new Promise((resolve) => {
              setTimeout(resolve, timeout);
            });
          }
        })
        .then(() => {
          if (shouldLog) {
            ee.emit('syncLog', `${labelPrefix}Extracting page content…`);
          }
          return window.webContents.executeJavaScript(
            `document.querySelector('body').innerHTML`
          );
        })
        .then((html) => {
          if (shouldLog) {
            ee.emit('syncLog', `${labelPrefix}Parsing HTML…`);
          }
          const $ = cheerio.load(html);

          window.destroy();

          if (shouldLog) {
            ee.emit('syncLog', `${labelPrefix}Page ready`);
          }

          resolveWrapper({
            dom: $,
            didNavigateUrl: didNavigateUrl,
          });
        });
    });
  });
};
