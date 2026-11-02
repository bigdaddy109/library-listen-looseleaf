/* Proxies Drive file bytes so <audio> and <img> can play without an Authorization header. */
let token = "";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "librarylisten-token") token = String(event.data.token || "");
});

const MIME = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  aac: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const marker = "/drive-media/";
  const at = url.pathname.indexOf(marker);
  if (at < 0) return;
  event.respondWith(proxy(url, event.request));
});

async function proxy(url, request) {
  if (!token) return new Response("signed out", { status: 401 });
  const marker = "/drive-media/";
  const at = url.pathname.indexOf(marker);
  const raw = url.pathname.slice(at + marker.length).split("/")[0];
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    id = raw;
  }
  const name = url.searchParams.get("name") || "";
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);
  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    { headers },
  );
  const out = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) out.set(key, value);
  }
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (MIME[ext]) out.set("content-type", MIME[ext]);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
