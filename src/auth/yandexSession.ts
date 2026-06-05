import { remote } from 'electron';

export const YANDEX_BOOKS_SESSION_PARTITION = 'persist:yandex-books';
export const YANDEX_BOOKS_HOME_URL = 'https://books.yandex.ru';
export const YANDEX_BOOKS_LIBRARY_URL = `${YANDEX_BOOKS_HOME_URL}/library?force-web=true`;
export const YANDEX_PASSPORT_LOGIN_URL = `https://passport.yandex.ru/auth?origin=bookmate&retpath=${encodeURIComponent(
  YANDEX_BOOKS_LIBRARY_URL
)}`;
export const YANDEX_BOOKS_OAUTH_URL =
  'https://oauth.yandex.ru/authorize?response_type=token&client_id=4483e97bab6e486a9822973109a14d05';

const AUTH_COOKIE_NAMES = new Set(['Session_id', 'sessionid2', 'yandex_login', 'yandexuid']);

export type YandexAuthInfo = {
  isLoggedIn: boolean;
  login?: string;
  uid?: string;
  lastCheckedAt?: string;
  oauthToken?: string;
  oauthTokenCapturedAt?: string;
};

type ElectronCookie = {
  name: string;
  value: string;
};

type ElectronSession = {
  clearStorageData(options?: { storages?: string[]; quotas?: string[] }): Promise<void>;
  cookies: {
    get(filter: { url?: string; name?: string }): Promise<ElectronCookie[]>;
  };
};

export const getYandexBooksSession = (): ElectronSession => {
  return remote.session.fromPartition(YANDEX_BOOKS_SESSION_PARTITION) as ElectronSession;
};

export const readYandexAuthInfo = async (): Promise<YandexAuthInfo> => {
  const session = getYandexBooksSession();
  const cookies = await session.cookies.get({ url: 'https://yandex.ru' });
  const authCookies = cookies.filter((cookie) => AUTH_COOKIE_NAMES.has(cookie.name));
  const hasSession = authCookies.some((cookie) => cookie.name === 'Session_id');
  const hasSecondarySession = authCookies.some((cookie) => cookie.name === 'sessionid2');
  const login = authCookies.find((cookie) => cookie.name === 'yandex_login')?.value;
  const uid = authCookies.find((cookie) => cookie.name === 'yandexuid')?.value;

  return {
    isLoggedIn: hasSession || hasSecondarySession,
    login,
    uid,
    lastCheckedAt: new Date().toISOString(),
  };
};

export const clearYandexSession = async (): Promise<void> => {
  await getYandexBooksSession().clearStorageData({
    storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'],
    quotas: ['temporary', 'persistent', 'syncable'],
  });
};
