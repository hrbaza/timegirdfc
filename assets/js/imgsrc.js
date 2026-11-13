/* Responsive image URLs, shared by the browser (window.TG_IMG) and the
 * server SSR (require), so both write the exact same src/srcset and the
 * browser reuses images the server HTML already loaded.
 * - /api/media/... images get ?w=<width>; the server resizes them to WebP.
 * - Unsplash images get w=<width>&auto=format&q=70.
 * - Any other URL is used as it is. */
(function (root) {
  const WIDTHS = [320, 480, 640, 960, 1200];
  const KINDS = {
    card: { w: 480, h: 270, set: [320, 480, 640], def: 480, sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" },
    feature: { w: 640, h: 360, set: [480, 640, 960], def: 640, sizes: "(max-width: 1024px) 100vw, 600px" },
    hero: { w: 960, h: 480, set: [640, 960, 1200], def: 960, sizes: "(max-width: 800px) 100vw, 760px" },
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function sized(url, w) {
    if (!url) return url;
    if (/^(https?:\/\/[^/]+)?\/api\/media\//i.test(url)) return url.split("?")[0] + "?w=" + w;
    if (/^https:\/\/images\.unsplash\.com\//i.test(url)) {
      try {
        const u = new URL(url);
        u.searchParams.delete("fm");
        u.searchParams.set("w", String(w));
        u.searchParams.set("auto", "format");
        u.searchParams.set("q", "70");
        return u.toString();
      } catch (e) { return url; }
    }
    return url;
  }
  const resizable = (url) => !!url && sized(url, 320) !== url;

  // { src, srcset, sizes } for an image of this kind ("card", "feature", "hero").
  function info(url, kind) {
    const k = KINDS[kind] || KINDS.card;
    if (!resizable(url)) return { src: url, srcset: "", sizes: "" };
    return { src: sized(url, k.def), srcset: k.set.map((w) => sized(url, w) + " " + w + "w").join(", "), sizes: k.sizes };
  }
  // The src/srcset/sizes attributes as an HTML string (values escaped), plus
  // width/height matching the box shape so the browser reserves the space.
  function attrs(url, kind) {
    const i = info(url, kind), k = KINDS[kind] || KINDS.card;
    return `src="${esc(i.src)}"` + (i.srcset ? ` srcset="${esc(i.srcset)}" sizes="${esc(i.sizes)}"` : "") + ` width="${k.w}" height="${k.h}"`;
  }

  const api = { WIDTHS, KINDS, sized, info, attrs };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TG_IMG = api;
})(typeof window !== "undefined" ? window : this);
