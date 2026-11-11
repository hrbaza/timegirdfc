/* Internal linking map (TimeGridFC Internal Linking Plan, 11 Nov 2026).
 * Each article id lists [anchor words, target article id, upToGuide].
 * The links are added when an article is rendered (server and browser), on
 * the first match of the words that is outside a heading or an existing link;
 * non-guide links prefer a match after the opening paragraph. A link is
 * skipped when the words are missing or the article already links to the
 * target. Stored article bodies are not changed.
 * Shared by the browser (window.TG_LINKMAP) and the server (require). */
(function (root) {
  const MAP = {
    "n-g9g9ucq": [["January transfer window", "n-3", 1], ["Arsenal", "n-crpa7fd", 0]],
    "n-gyovqys": [["World Cup", "n-2vta9u9", 1], ["Lionel Messi", "n-ulkjzk4", 0]],
    "n-j55shq5": [["Harry Kane", "n-g2l116k", 0], ["Kane", "n-gm6o3vb", 0]],
    "n-v415g7w": [["Lionel Messi", "n-3irkrth", 0], ["Messi", "n-q1h5d6n", 0]],
    "n-2vta9u9": [["2026", "n-4", 0], ["Messi", "n-v415g7w", 0], ["FIFA", "n-7xa3wj5", 0], ["England", "n-b6myzbk", 0]],
    "n-3": [["contract", "n-7lmowvr", 0], ["fee", "n-59ublnj", 0]],
    "n-gdypd2b": [["VAR", "n-pas73mz", 0], ["World Cup", "n-2vta9u9", 0]],
    "n-1": [["full-back", "n-6", 0]],
    "n-1ln14qe": [["offside", "n-gdypd2b", 0], ["Bayern Munich", "n-dcjdq17", 0], ["Bayern", "n-5", 0]],
    "n-1vp2cjg": [["World Cup", "n-2vta9u9", 1], ["FIFA", "n-7xa3wj5", 0]],
    "n-2": [["Real Madrid", "n-s9s05mq", 0]],
    "n-3irkrth": [["World Cup", "n-2vta9u9", 1], ["Lionel Messi", "n-v415g7w", 0], ["Messi", "n-zgf8hi6", 0]],
    "n-4": [["World Cup", "n-2vta9u9", 1]],
    "n-5": [["Bayern Munich", "n-oy0zij5", 0], ["Bayern", "n-1ln14qe", 0], ["Bundesliga", "n-eascfpu", 0]],
    "n-5qrtdc1": [["England", "n-vpbck9q", 0], ["Tuchel", "n-0wsu3tz", 0]],
    "n-a2l7opi": [["Manchester City", "n-nr5sp9c", 0], ["City", "n-ijuf6ip", 0]],
    "n-cnbxzpr": [["Bournemouth", "n-evdcdh4", 0], ["Premier League", "n-pas73mz", 0]],
    "n-drqk4s2": [["World Cup", "n-2vta9u9", 1], ["Lionel Messi", "n-v415g7w", 0], ["Messi", "n-ulkjzk4", 0]],
    "n-eascfpu": [["World Cup", "n-2vta9u9", 1]],
    "n-ijuf6ip": [["England", "n-0wsu3tz", 0], ["Tuchel", "n-vpbck9q", 0], ["Manchester City", "n-nr5sp9c", 0]],
    "n-jduregt": [["AC Milan", "n-ch0eh7q", 0], ["Inter", "n-la79z03", 0]],
    "n-nmydert": [["World Cup", "n-2vta9u9", 1], ["Cristiano Ronaldo", "n-aq9z48d", 0], ["Ronaldo", "n-aycs93k", 0]],
    "n-s7d160a": [["Real Madrid", "n-jvx2rrg", 0], ["Atletico", "n-xquxpth", 0], ["Lamine Yamal", "n-0wsu3tz", 0]],
    "n-t4i8yup": [["Real Madrid", "n-55672o5", 0], ["Tchouameni", "n-uoocjqi", 0]],
    "n-uk38ffa": [["World Cup", "n-2vta9u9", 1], ["Cristiano Ronaldo", "n-aycs93k", 0], ["Ronaldo", "n-qtp93c5", 0]],
    "n-ulkjzk4": [["Inter Miami", "n-zgf8hi6", 0], ["Lionel Messi", "n-gyovqys", 0]],
    "n-vpbck9q": [["World Cup", "n-2vta9u9", 1], ["England", "n-b6myzbk", 0], ["Tuchel", "n-5qrtdc1", 0]],
    "n-xquxpth": [["Barcelona", "n-gpetlne", 0], ["Atletico", "n-ohqvbfr", 0], ["Flick", "n-30luvhg", 0]],
    "n-0wsu3tz": [["England", "n-5qrtdc1", 0], ["Lamine Yamal", "n-s7d160a", 0]],
    "n-29rq5wj": [["on loan", "n-3", 1]],
    "n-2i193kk": [["Champions League", "n-9tprjdb", 1]],
    "n-30luvhg": [["January transfer window", "n-3", 1]],
    "n-3hi6d8t": [["Champions League", "n-9tprjdb", 1]],
    "n-55672o5": [["Real Madrid", "n-gl8p1v5", 0], ["Mourinho", "n-t4i8yup", 0]],
    "n-59ublnj": [["January window", "n-3", 1]],
    "n-65bqvn0": [["Champions League", "n-9tprjdb", 1]],
    "n-6k2yyw2": [["Champions League", "n-9tprjdb", 1]],
    "n-7lmowvr": [["Bayern Munich", "n-gm6o3vb", 0]],
    "n-alhxd4d": [["January window", "n-3", 1], ["Manchester United", "n-pjmoyol", 0]],
    "n-aq9z48d": [["World Cup", "n-2vta9u9", 1], ["Cristiano Ronaldo", "n-qtp93c5", 0]],
    "n-aycs93k": [["Cristiano Ronaldo", "n-aq9z48d", 0]],
    "n-b6myzbk": [["Harry Kane", "n-g2l116k", 0], ["England", "n-0wsu3tz", 0]],
    "n-crpa7fd": [["transfer window", "n-3", 1], ["Barcelona", "n-w2r3bii", 0]],
    "n-dcjdq17": [["league phase", "n-9tprjdb", 1]],
    "n-evdcdh4": [["Premier League", "n-pas73mz", 0], ["Manchester City", "n-nr5sp9c", 0]],
    "n-g2l116k": [["Harry Kane", "n-b6myzbk", 0], ["Kane", "n-j55shq5", 0]],
    "n-gl8p1v5": [["Real Madrid", "n-55672o5", 0], ["La Liga", "n-rojpmmi", 0]],
    "n-gl9tmg2": [["Manchester United", "n-s08cnoj", 0]],
    "n-gm6o3vb": [["Bayern Munich", "n-7lmowvr", 0], ["Bayern", "n-1ln14qe", 0]],
    "n-gpetlne": [["Barcelona", "n-jvx2rrg", 0], ["Atletico", "n-xquxpth", 0]],
    "n-joakl4p": [["World Cup", "n-2vta9u9", 1], ["Ronaldo", "n-aycs93k", 0]],
    "n-jvx2rrg": [["Barcelona", "n-gpetlne", 0]],
    "n-la79z03": [["January window", "n-3", 1]],
    "n-n8wjgmt": [["Bundesliga", "n-eascfpu", 0]],
    "n-nxo0sed": [["Manchester United", "n-pdk29r4", 0]],
    "n-ofo3zak": [["on loan", "n-3", 1]],
    "n-og29r36": [["Arsenal", "n-vnzg2c4", 0], ["Liverpool", "n-29rq5wj", 0]],
    "n-ohqvbfr": [["Champions League", "n-9tprjdb", 1]],
    "n-oy0zij5": [["Bayern Munich", "n-5", 0]],
    "n-oy6pnh1": [["Liverpool", "n-nr5sp9c", 0]],
    "n-pas73mz": [["offside", "n-gdypd2b", 0], ["Premier League", "n-cnbxzpr", 0]],
    "n-pdk29r4": [["Manchester United", "n-sb7k95f", 0], ["Carrick", "n-s08cnoj", 0]],
    "n-pjmoyol": [["January window", "n-3", 1], ["United", "n-alhxd4d", 0]],
    "n-q1h5d6n": [["Lionel Messi", "n-ulkjzk4", 0]],
    "n-qog5kbg": [["Manchester United", "n-sb7k95f", 0]],
    "n-qtp93c5": [["Cristiano Ronaldo", "n-aq9z48d", 0]],
    "n-s08cnoj": [["Manchester United", "n-alhxd4d", 0]],
    "n-s21ix27": [["Harry Kane", "n-s5xvykx", 0]],
    "n-s5xvykx": [["Kane", "n-k7n4sqy", 0]],
    "n-s9s05mq": [["January window", "n-3", 1], ["Real Madrid", "n-2", 0]],
    "n-sb7k95f": [["Manchester United", "n-pjmoyol", 0]],
    "n-sx9plem": [["January transfer window", "n-3", 1]],
    "n-t6rz2pr": [["Champions League", "n-9tprjdb", 1]],
    "n-tu4ugam": [["Manchester United", "n-ohqvbfr", 0], ["United", "n-pdk29r4", 0]],
    "n-vnzg2c4": [["Arsenal", "n-g9g9ucq", 0]],
    "n-w2r3bii": [["Champions League", "n-9tprjdb", 1], ["Barcelona", "n-2i193kk", 0]],
    "n-wl3kfz8": [["Champions League", "n-9tprjdb", 1]],
    "n-zgf8hi6": [["Lionel Messi", "n-gyovqys", 0], ["Messi", "n-drqk4s2", 0]],
  };

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Spans where a new link must not go: tags, existing links, headings.
  const BLOCK = /<a\b[\s\S]*?<\/a>|<h[1-6]\b[\s\S]*?<\/h[1-6]>|<(script|style|figcaption)\b[\s\S]*?<\/\1>|<[^>]*>|\[[^\]\n]+\]\([^\s)]+\)/gi;

  function apply(id, html) {
    const rows = MAP[id];
    if (!rows || !html) return html;
    let s = String(html);
    for (const [anchor, target, early] of rows) {
      if (new RegExp("/news/" + escRe(target) + "(?![a-z0-9-])", "i").test(s)) continue;
      const blocked = [...s.matchAll(BLOCK)].map((m) => [m.index, m.index + m[0].length]);
      const free = (a, b) => !blocked.some(([x, y]) => a < y && b > x);
      let introEnd = s.indexOf("</p>");
      if (introEnd < 0) introEnd = s.indexOf("\n\n");
      if (early || introEnd < 0) introEnd = 0;
      const re = new RegExp("(^|[^\\p{L}\\p{N}])(" + escRe(anchor) + ")(?![\\p{L}\\p{N}])", "gu");
      let first = -1, hit = -1;
      for (const m of s.matchAll(re)) {
        const at = m.index + m[1].length;
        if (!free(at, at + anchor.length)) continue;
        if (first < 0) first = at;
        if (at >= introEnd) { hit = at; break; }
      }
      if (hit < 0) hit = first;
      if (hit < 0) continue;
      s = s.slice(0, hit) + "[" + anchor + "](/news/" + target + ")" + s.slice(hit + anchor.length);
    }
    return s;
  }

  const api = { MAP, apply };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TG_LINKMAP = api;
})(typeof window !== "undefined" ? window : this);
