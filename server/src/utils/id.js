// Human-readable string ids (used as _id) so relations stay readable, e.g. "p-a1b2c3".
function genId(prefix) {
  return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 9);
}

// Local calendar date YYYY-MM-DD (avoids UTC off-by-one).
function localDate(d) {
  const x = d || new Date();
  return (
    x.getFullYear() +
    "-" +
    String(x.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(x.getDate()).padStart(2, "0")
  );
}

// Hide the password in a Mongo connection string before logging it.
function maskUri(uri) {
  return String(uri || "").replace(/(mongodb(?:\+srv)?:\/\/[^:/@]+:)([^@]+)(@)/i, "$1****$3");
}

module.exports = { genId, localDate, maskUri };
