/**
 * Read-only Google Drive. Same public Web client as Library Listen v1.
 * The client id is browser config, not a secret. No client secret is used.
 * Tokens stay in memory. This file never writes them to localStorage.
 */
import { AUDIO_EXT, EPUB_EXT, extOf, type Entry } from "./library";

export const GOOGLE_OAUTH_CLIENT_ID =
  "827714015808-hp9o0gl26mbcs8mmipjfu2dtuvv9vdo3.apps.googleusercontent.com";

export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const LIBRARY_FOLDER_NAME = "Library";
export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
export const DRIVE_SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
export const FOLDER_KEY = "librarylisten.v2.folder";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export type DriveItem = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string | number;
  parents?: string[];
  ownedByMe?: boolean;
  shared?: boolean;
  owners?: { displayName?: string; emailAddress?: string }[];
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
};

export type DriveKind = "no-library" | "denied" | "config" | "cancelled" | "generic";

export class DriveError extends Error {
  kind: DriveKind;
  constructor(kind: DriveKind, message: string) {
    super(message);
    this.name = "DriveError";
    this.kind = kind;
  }
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: TokenResponse) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

export function libraryFolderQuery(sharedWithMe = false) {
  const parts = [`name='${LIBRARY_FOLDER_NAME}'`, `mimeType='${DRIVE_FOLDER_MIME}'`, "trashed=false"];
  if (sharedWithMe) parts.push("sharedWithMe=true");
  return parts.join(" and ");
}

export function isLibraryMediaName(name: string) {
  const ext = extOf(name);
  return AUDIO_EXT.has(ext) || EPUB_EXT.has(ext) || ["jpg", "jpeg", "png", "webp"].includes(ext);
}

export function shouldSkipDriveName(name: string) {
  if (!name || name === "." || name === "..") return true;
  if (name.startsWith(".") || name.startsWith("_")) return true;
  return false;
}

function asFolder(item: DriveItem) {
  if (shouldSkipDriveName(item.name)) return null;
  if (item.mimeType === DRIVE_FOLDER_MIME) return item.id;
  if (
    item.mimeType === DRIVE_SHORTCUT_MIME &&
    item.shortcutDetails?.targetMimeType === DRIVE_FOLDER_MIME &&
    item.shortcutDetails.targetId
  ) {
    return item.shortcutDetails.targetId;
  }
  if (!item.mimeType && !isLibraryMediaName(item.name)) return item.id;
  return null;
}

/** Walk `Library/<series>/listen/<book>/…` plus sibling ebooks and covers. */
export async function walkLibrary(
  rootId: string,
  list: (folderId: string) => Promise<DriveItem[]>,
  rootName = LIBRARY_FOLDER_NAME,
): Promise<Entry[]> {
  const entries: Entry[] = [];
  const walk = async (id: string, parts: string[], depth: number) => {
    if (depth > 8) return;
    const children = await list(id);
    for (const item of children) {
      if (!item?.id || !item.name || shouldSkipDriveName(item.name)) continue;
      const next = [...parts, item.name];
      const folderId = asFolder(item);
      if (folderId) {
        await walk(folderId, next, depth + 1);
        continue;
      }
      if (!isLibraryMediaName(item.name)) continue;
      const size = Number(item.size) || 0;
      const ext = extOf(item.name);
      if ((AUDIO_EXT.has(ext) || ext === "epub") && size === 0) continue;
      const fileId =
        item.mimeType === DRIVE_SHORTCUT_MIME && item.shortcutDetails?.targetId
          ? item.shortcutDetails.targetId
          : item.id;
      entries.push({
        path: next.join("/"),
        file: { name: item.name, size, driveId: fileId, type: item.mimeType },
      });
    }
  };
  await walk(rootId, [rootName], 0);
  return entries;
}

export function isLocalHost(hostname = globalThis.location?.hostname) {
  const host = String(hostname || "").trim().replace(/\.+$/, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export function isIosLike(nav: Navigator | undefined = globalThis.navigator) {
  const ua = String(nav?.userAgent || "");
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && Number(nav?.maxTouchPoints) > 1;
}

/** Desktop Pages uses the GIS popup. Phones and localhost leave the page and come back. */
export function usesRedirect(hostname = globalThis.location?.hostname, nav?: Navigator) {
  return isLocalHost(hostname) || isIosLike(nav);
}

/** Exact redirect URI Google must have on the Web client. Path included, no hash. */
export function implicitRedirectUri(loc: Location | undefined = globalThis.location) {
  const origin = String(loc?.origin || "http://127.0.0.1:5173").replace(/\/$/, "");
  let path = String(loc?.pathname || "/");
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  if (!path.endsWith("/")) path += "/";
  return origin + path;
}

export function implicitAuthUrl(loc?: Location) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", implicitRedirectUri(loc));
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", DRIVE_READONLY_SCOPE);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  return url.href;
}

export function parseImplicitHash(hash: string) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const accessToken = params.get("access_token");
  if (accessToken) {
    const expires = Number(params.get("expires_in"));
    return { accessToken, expiresIn: Number.isFinite(expires) && expires > 0 ? expires : 3600 };
  }
  const error = params.get("error");
  if (!error) return null;
  return { error, description: params.get("error_description") || "" };
}

let memoryToken: string | null = null;

export function getAccessToken() {
  return memoryToken;
}

export function setAccessToken(token: string | null) {
  memoryToken = token || null;
  return memoryToken;
}

function loadScript(src: string) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return existing.getAttribute("data-loaded") === "1"
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new DriveError("generic", src)), { once: true });
        });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute("data-loaded", "1");
      resolve();
    };
    script.onerror = () => reject(new DriveError("generic", src));
    document.head.appendChild(script);
  });
}

export function publishTokenToWorker(token: string) {
  const send = () => {
    navigator.serviceWorker?.controller?.postMessage({ type: "librarylisten-token", token });
  };
  send();
  navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: "librarylisten-token", token })).catch(() => {});
}

export async function registerMediaWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  } catch {
    /* playback falls back to a signed-out error if the worker never starts */
  }
}

/**
 * Button click only. Does not run on page load, so a phone does not bounce to Google by itself.
 * Returns a token, or null when the browser is leaving for the redirect flow.
 */
export function requestDriveToken(): Promise<string | null> {
  if (!GOOGLE_OAUTH_CLIENT_ID.includes(".apps.googleusercontent.com")) {
    return Promise.reject(new DriveError("config", "missing client"));
  }
  if (usesRedirect()) {
    location.assign(implicitAuthUrl());
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    loadScript(GIS_SRC)
      .then(() => {
        const oauth = window.google?.accounts?.oauth2;
        if (!oauth) {
          reject(new DriveError("generic", "gis"));
          return;
        }
        const client = oauth.initTokenClient({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          scope: DRIVE_READONLY_SCOPE,
          callback: (resp) => {
            if (resp.error) {
              if (resp.error === "access_denied") reject(new DriveError("cancelled", resp.error_description || resp.error));
              else reject(new DriveError("denied", resp.error_description || resp.error));
              return;
            }
            if (!resp.access_token) {
              reject(new DriveError("generic", "no token"));
              return;
            }
            setAccessToken(resp.access_token);
            publishTokenToWorker(resp.access_token);
            resolve(resp.access_token);
          },
          error_callback: (err) => {
            const code = String(err?.error || "");
            if (code === "popup_closed" || code === "access_denied") reject(new DriveError("cancelled", code));
            else reject(new DriveError("generic", err?.error_description || code || "popup"));
          },
        });
        client.requestAccessToken({ prompt: "select_account" });
      })
      .catch((err) => reject(err instanceof DriveError ? err : new DriveError("generic", String(err))));
  });
}

/** Read `#access_token` after a phone or localhost redirect. Desktop popup does not use this. */
export function takeRedirectToken(loc: Location = location) {
  if (!usesRedirect(loc.hostname)) return null;
  const parsed = parseImplicitHash(loc.hash);
  if (!parsed) return null;
  if ("error" in parsed && parsed.error) {
    history.replaceState({}, "", `${loc.pathname}${loc.search}`);
    if (parsed.error === "access_denied") throw new DriveError("cancelled", parsed.description || parsed.error);
    throw new DriveError("denied", parsed.description || parsed.error);
  }
  if (!("accessToken" in parsed) || !parsed.accessToken) return null;
  const token = parsed.accessToken;
  history.replaceState({}, "", `${loc.pathname}${loc.search}`);
  setAccessToken(token);
  publishTokenToWorker(token);
  return token;
}

async function driveGet(url: string, token: string, fetchImpl: typeof fetch) {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) throw new DriveError("denied", text || "401");
    throw new DriveError("generic", text || String(res.status));
  }
  return text ? JSON.parse(text) : {};
}

export async function driveListAll(
  token: string,
  q: string,
  fetchImpl: typeof fetch = fetch,
  { corpora = "user" }: { corpora?: string } = {},
) {
  const files: DriveItem[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set("q", q);
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("corpora", corpora);
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,mimeType,size,parents,ownedByMe,shared,owners(displayName,emailAddress),shortcutDetails)",
    );
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const body = await driveGet(url.toString(), token, fetchImpl);
    files.push(...(body.files || []));
    pageToken = body.nextPageToken || "";
  } while (pageToken);
  return files;
}

export async function findLibraryFolders(token: string, fetchImpl: typeof fetch = fetch) {
  const [mine, shared] = await Promise.all([
    driveListAll(token, libraryFolderQuery(false), fetchImpl),
    driveListAll(token, libraryFolderQuery(true), fetchImpl),
  ]);
  const seen = new Set<string>();
  const folders: DriveItem[] = [];
  for (const folder of [...mine, ...shared]) {
    if (!folder?.id || seen.has(folder.id)) continue;
    seen.add(folder.id);
    folders.push(folder);
  }
  folders.sort((a, b) => Number(b.ownedByMe === true) - Number(a.ownedByMe === true) || a.name.localeCompare(b.name));
  if (!folders.length) throw new DriveError("no-library", LIBRARY_FOLDER_NAME);
  return folders;
}

export function rememberFolder(id: string) {
  try {
    localStorage.setItem(FOLDER_KEY, id);
  } catch {
    /* ignore */
  }
}

export function rememberedFolder() {
  try {
    return localStorage.getItem(FOLDER_KEY) || "";
  } catch {
    return "";
  }
}

export function forgetFolder() {
  try {
    localStorage.removeItem(FOLDER_KEY);
  } catch {
    /* ignore */
  }
}
