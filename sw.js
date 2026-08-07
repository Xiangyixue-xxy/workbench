// 薛湘怡工作台 —— Service Worker（离线缓存应用外壳）
const CACHE = "calorie-workbench-v20";
const SHELL = ["index.html", "manifest.webmanifest", "icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // 只处理同源 GET；跨域（视觉 API 等）直接放行，不做缓存
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // 导航请求：优先缓存，离线时回退到 index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("index.html"))
    );
    return;
  }

  // 静态资源：缓存优先，缺失则网络拉取并补缓存
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
