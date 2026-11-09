/**
 * Offline mode for Pro (pure, unit-tested in scripts/test.mjs).
 *
 * Documents, clients and line items live in this browser (localStorage). There is no
 * document server to upload them to. "Sync" on reconnect re-checks the Stripe
 * subscription and confirms the on-device snapshot is still readable. It never
 * replaces local documents with a remote payload.
 *
 * The service worker (public/sw.js) must use the same SW_VERSION. Bump both together
 * so a new worker is fetched (?v=) and the previous cache is deleted.
 */
import { legacyProActive, resolvePro } from "./plan";

/** Bump when public/sw.js changes so installed clients drop the old cache. */
export const SW_VERSION = "tq-offline-1";
export const CACHE_PREFIX = "tradequote-";
export const CACHE_NAME = CACHE_PREFIX + SW_VERSION;

/** App shell the worker precaches. Same paths are listed in public/sw.js. */
export const SHELL_URLS = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable.png"] as const;

export function serviceWorkerUrl(): string {
  return `/sw.js?v=${encodeURIComponent(SW_VERSION)}`;
}

/**
 * Pro for the offline gate. Same rules as the rest of the app: a confirmed Stripe
 * status, the 7-day grace when the status API cannot be reached, or legacy Pro.
 * A stored "pro" label is intentionally not an input.
 */
export function proForOffline(input: {
  serverPro: boolean | null;
  lastConfirmedAt: number | null;
  legacyFlag: string | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (resolvePro(input.serverPro, input.lastConfirmedAt, now)) return true;
  return legacyProActive(input.legacyFlag, now);
}

/** Free users keep the app only while online. Offline use is Pro. */
export function offlineGate(online: boolean, pro: boolean): "open" | "locked" {
  if (online || pro) return "open";
  return "locked";
}

export function shouldRegisterServiceWorker(pro: boolean): boolean {
  return pro;
}

export function shouldPurgeServiceWorker(pro: boolean): boolean {
  return !pro;
}

/** GET/HEAD same-origin only. Never cache the API (subscription, checkout, webhook) or the worker script. */
export function isCacheableRequest(input: { url: string; method?: string; origin: string }): boolean {
  const method = (input.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  let url: URL;
  try {
    url = new URL(input.url, input.origin);
  } catch {
    return false;
  }
  if (url.origin !== input.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname === "/sw.js") return false;
  return true;
}

/** Shell URLs plus same-origin stylesheets and scripts already on the page. */
export function shellUrlsFromDocument(assetUrls: readonly string[], origin: string): string[] {
  const out = new Set<string>();
  for (const path of SHELL_URLS) out.add(new URL(path, origin).href);
  for (const raw of assetUrls) {
    if (!raw) continue;
    try {
      const url = new URL(raw, origin);
      if (!isCacheableRequest({ url: url.href, method: "GET", origin })) continue;
      out.add(url.href);
    } catch {
      /* ignore malformed asset URLs */
    }
  }
  return Array.from(out);
}

export function countLineItems(docs: readonly { doc?: { items?: readonly unknown[] } | null }[]): number {
  let n = 0;
  for (const doc of docs) {
    if (Array.isArray(doc.doc?.items)) n += doc.doc.items.length;
  }
  return n;
}

/**
 * history/clients JSON still parses as arrays (null = nothing stored yet, which is valid).
 * A corrupt value must not be reported as synced.
 */
export function localSnapshotOk(raw: { history: string | null; clients: string | null }): boolean {
  try {
    const history = raw.history == null ? [] : JSON.parse(raw.history);
    const clients = raw.clients == null ? [] : JSON.parse(raw.clients);
    return Array.isArray(history) && Array.isArray(clients);
  } catch {
    return false;
  }
}

export type SyncPhase = "idle" | "offline" | "pending" | "synced" | "error";

export type SyncState = {
  phase: SyncPhase;
  /** True when the user edited while offline. Kept on "synced" so the notice can say those edits stayed on the device. */
  offlineEdits: boolean;
};

export function noteLocalWrite(state: SyncState, online: boolean): SyncState {
  if (online) return state;
  if (state.phase === "offline" && state.offlineEdits) return state;
  return { phase: "offline", offlineEdits: true };
}

export function onNetworkChange(state: SyncState, online: boolean): SyncState {
  if (!online) {
    if (state.phase === "offline") return state;
    return { phase: "offline", offlineEdits: state.offlineEdits };
  }
  if (state.phase === "offline") return { phase: "pending", offlineEdits: state.offlineEdits };
  return state;
}

/**
 * Confirms the local snapshot after reconnect. There is no remote document body:
 * a failed read stays in "error" and is not cleared.
 */
export function flushLocalSync(state: SyncState, snapshotOk: boolean): SyncState {
  if (state.phase !== "pending") return state;
  if (!snapshotOk) return { phase: "error", offlineEdits: true };
  return { phase: "synced", offlineEdits: state.offlineEdits };
}

export function ackSync(state: SyncState): SyncState {
  if (state.phase !== "synced") return state;
  return { phase: "idle", offlineEdits: false };
}

export function retryFlush(state: SyncState): SyncState {
  if (state.phase !== "error") return state;
  return { phase: "pending", offlineEdits: true };
}

/** One install/purge at a time, in call order, so a late purge cannot remove a worker that Pro just registered. */
let installChain: Promise<void> = Promise.resolve();

export function syncOfflineInstallation(pro: boolean): Promise<void> {
  const task = () => (shouldRegisterServiceWorker(pro) ? registerOffline() : disableOffline());
  installChain = installChain.then(task, task);
  return installChain;
}

/** Registers the versioned worker and fills the cache with the shell. No-op without a service worker. */
export async function registerOffline(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  await navigator.serviceWorker.register(serviceWorkerUrl(), { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const done = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", done);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", done);
      if (navigator.serviceWorker.controller) done();
    });
  }
  if (hadController && sessionStorage.getItem("tq_sw_reload") !== SW_VERSION) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem("tq_sw_reload") === SW_VERSION) return;
      sessionStorage.setItem("tq_sw_reload", SW_VERSION);
      window.location.reload();
    });
  }
  const assets = Array.from(document.querySelectorAll("script[src], link[rel='stylesheet']")).map((el) => {
    if (el instanceof HTMLScriptElement) return el.src;
    if (el instanceof HTMLLinkElement) return el.href;
    return "";
  });
  const urls = shellUrlsFromDocument(assets, window.location.origin);
  await Promise.all(urls.map((url) => fetch(url).catch(() => undefined)));
}

/** Drops the worker and every TradeQuote cache. Called when the user is not Pro. */
export async function disableOffline(): Promise<void> {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)));
  }
}
