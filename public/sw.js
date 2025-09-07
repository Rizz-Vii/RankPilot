/**
 * Service Worker for RankPilot PWA
 * Advanced Architecture Enhancement - DevReady Phase 3
 *
 * Features:
 * - Offline functionality with intelligent caching
 * - Background sync for data synchronization
 * - Push notifications for critical SEO alerts
 * - Cache-first strategy for static assets
 * - Network-first strategy removed (APIs are never cached; app uses cache-first/SWR)
 */

// Bump cache versions to ensure old, potentially problematic entries are purged
const STATIC_CACHE = "rankpilot-static-v2";
const DYNAMIC_CACHE = "rankpilot-dynamic-v2";

// Static assets to cache immediately - FIXED: removed non-existent routes
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/favicon.ico",
  "/manifest.json",
  // Removed '/settings' and '/neuroseo' as they cause 404 errors in cache.addAll()
];

// Install event - cache static assets with individual error handling
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);

        // Cache assets individually to prevent cache.addAll() failures
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ [SW] Cached: ${url}`);
            } else {
              console.warn(
                `⚠️ [SW] Failed to cache ${url}: ${response.status}`
              );
            }
          } catch (error) {
            console.error(`❌ [SW] Cache error for ${url}:`, error);
            // Continue with other assets instead of failing entirely
          }
        });

        await Promise.allSettled(cachePromises); // Use allSettled instead of all
        console.log("🚀 [SW] Installation complete");

        return self.skipWaiting();
      } catch (error) {
        console.error("❌ [SW] Installation failed:", error);
        throw error;
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Bypass Next.js Flight/RSC, Server Actions, prefetch, and streaming (SSE) requests.
  // These requests are sensitive to interception and caching; handling them here can
  // break streams and cause client errors like "Connection closed.".
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const secFetchDest = (
    request.headers.get("sec-fetch-dest") || ""
  ).toLowerCase();
  const isRSC =
    accept.includes("text/x-component") ||
    accept.includes("application/x-component") ||
    request.headers.has("rsc") ||
    request.headers.has("next-action") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch");
  const isSSE = accept.includes("text/event-stream");
  const isNextData =
    request.headers.has("x-nextjs-data") ||
    request.url.includes("/_next/data/");
  const isNextPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("x-middleware-prefetch") === "1";
  if (isRSC || isSSE || isNextData || isNextPrefetch) {
    return; // Let the network handle it untouched
  }

  // Handle API requests: never cache responses to avoid leaking authenticated data
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request, { cache: "no-store" });
          return networkResponse;
        } catch {
          // If offline, return a minimal 503 JSON; do not serve potentially stale cached API data
          return new Response(
            JSON.stringify({
              error: "Offline",
              message: "API unavailable offline",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      })()
    );
    return;
  }

  // Handle static assets with cache-first strategy (includes Next.js static assets)
  if (
    isStaticAsset(url.pathname) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Do NOT intercept document navigations. Let the browser and Next.js handle streaming/hydration.
  const isDocumentNavigation =
    request.mode === "navigate" ||
    secFetchDest === "document" ||
    accept.includes("text/html") ||
    accept.includes("text/x-component");
  if (isDocumentNavigation) {
    return;
  }
});

// Network-first strategy was removed as API paths bypass caching and other paths use cache-first/SWR.

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    console.log("[SW] Failed to fetch static asset:", request.url);
    return new Response("Asset not available offline", { status: 503 });
  }
}

// Note: Stale-while-revalidate strategy removed; not used by current routing.

// Helper functions
function isStaticAsset(pathname) {
  // Return a boolean indicating whether this path is a static asset by testing the file extension.
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|map)$/.test(pathname);
}

// Note: isAppRoute helper removed; not used by current SW logic.

// Background sync for data synchronization
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "neuroseo-analysis") {
    event.waitUntil(syncNeuroSEOAnalysis());
  }

  if (event.tag === "user-preferences") {
    event.waitUntil(syncUserPreferences());
  }
});

async function syncNeuroSEOAnalysis() {
  try {
    // Get pending analysis requests from IndexedDB
    const pendingRequests = await getPendingAnalysisRequests();

    for (const request of pendingRequests) {
      try {
        // Support optional endpoint override in queued payloads
        const data = request?.data || {};
        const endpoint =
          typeof data.endpoint === "string"
            ? data.endpoint
            : "/api/neuroseo/live";
        const body =
          data && data.endpoint
            ? JSON.stringify(data.payload)
            : JSON.stringify(data);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (response.ok) {
          await removePendingRequest(request.id);

          // Notify user of successful sync
          await showNotification("Analysis Complete", {
            body: "Your SEO analysis has been completed",
            icon: "/icons/icon-192x192.png",
            tag: "analysis-complete",
          });
        }
      } catch (error) {
        console.error("[SW] Failed to sync analysis request:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

async function syncUserPreferences() {
  try {
    const pendingPreferences = await getPendingPreferences();

    for (const pref of pendingPreferences) {
      try {
        const response = await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pref.data),
        });

        if (response.ok) {
          await removePendingPreference(pref.id);
        }
      } catch (error) {
        console.error("[SW] Failed to sync preferences:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Preference sync failed:", error);
  }
}

// Push notifications for critical SEO alerts
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: data.tag || "default",
      data: data.url ? { url: data.url } : undefined,
      actions: data.actions || [
        {
          action: "view",
          title: "View Details",
          icon: "/icons/view-icon.png",
        },
        {
          action: "dismiss",
          title: "Dismiss",
          icon: "/icons/dismiss-icon.png",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "RankPilot", options)
    );
  } catch (error) {
    console.error("[SW] Failed to show notification:", error);
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "dismiss") {
    return;
  }

  let targetUrl = "/dashboard";

  if (action === "view" && data?.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }

      // Open new window if app not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// IndexedDB helpers for offline data management
// Minimal IndexedDB implementation for pending offline items
const IDB_NAME = "rankpilot-offline";
const IDB_VERSION = 1;
const STORE_ANALYSIS = "pendingAnalysisRequests";
const STORE_PREFS = "pendingPreferences";

/** Cached DB promise to avoid reopening on every call */
let __dbPromise = null;

function openDB() {
  if (__dbPromise) return __dbPromise;

  __dbPromise = new Promise((resolve, reject) => {
    try {
      const req = self.indexedDB.open(IDB_NAME, IDB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
          db.createObjectStore(STORE_ANALYSIS, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains(STORE_PREFS)) {
          db.createObjectStore(STORE_PREFS, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch {
      console.error("\u274c [SW] Installation failed");
    }
  });

  return __dbPromise;
}

async function withStore(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    } catch (e) {
      reject(e);
    }
  });
}

async function idbGetAll(storeName) {
  try {
    return await withStore(storeName, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn("[SW][IDB] getAll failed for", storeName, err);
    return [];
  }
}

async function idbDelete(storeName, id) {
  try {
    await withStore(storeName, "readwrite", (store) => {
      store.delete(id);
    });
    return true;
  } catch (err) {
    console.warn("[SW][IDB] delete failed for", storeName, id, err);
    return false;
  }
}

// Public helpers used by background sync flows
async function getPendingAnalysisRequests() {
  if (!self.indexedDB) return [];
  return idbGetAll(STORE_ANALYSIS);
}

async function removePendingRequest(id) {
  if (!self.indexedDB) return false;
  return idbDelete(STORE_ANALYSIS, id);
}

async function getPendingPreferences() {
  if (!self.indexedDB) return [];
  return idbGetAll(STORE_PREFS);
}

async function removePendingPreference(id) {
  if (!self.indexedDB) return false;
  return idbDelete(STORE_PREFS, id);
}

async function showNotification(title, options) {
  if (
    self &&
    self.registration &&
    typeof self.registration.showNotification === "function"
  ) {
    return self.registration.showNotification(title, options);
  }
  // Ensure a consistent Promise-returning API even when notifications are unavailable.
  return Promise.resolve();
}
