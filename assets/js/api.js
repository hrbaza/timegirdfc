/* =========================================================================
   Time Grid FC — API client
   Thin fetch wrapper around the backend REST API. The store (store.js) uses
   this when a backend is reachable; otherwise it falls back to localStorage.
   Configure a custom API base by setting window.TG_CONFIG = { apiBase: "..." }
   before this script loads.
   ========================================================================= */
window.TG = window.TG || {};
TG.api = (function () {
  // Same-origin /api when served by the backend; else default to :4000.
  const configured = (window.TG_CONFIG && window.TG_CONFIG.apiBase) || null;
  const sameOrigin = location.origin && location.origin.startsWith("http") ? location.origin + "/api" : null;
  const base = configured || sameOrigin || "http://127.0.0.1:4000/api";

  async function request(path, { method = "GET", body, token, timeout } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = "Bearer " + token;
    let ctrl, timer;
    if (timeout) { ctrl = new AbortController(); timer = setTimeout(() => ctrl.abort(), timeout); }
    try {
      const res = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* 204 or non-json */ }
      if (!res.ok) {
        const msg = (data && data.message) || `Request failed (${res.status})`;
        const err = new Error(msg); err.status = res.status; throw err;
      }
      return data;
    } finally { if (timer) clearTimeout(timer); }
  }

  // Quick reachability probe with a short timeout.
  async function health(timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || 1500);
    try {
      const res = await fetch(base + "/health", { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch (e) { clearTimeout(t); return false; }
  }

  return { base, request, health };
})();
