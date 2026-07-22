/* ============================================================
   Site-health analysis engine (shared by the live page + tests)
   Pure functions, no DOM. Works in Node and in the browser.
   ============================================================ */

const CONFIG = {
  WINDOW_DAYS: 14,        // trailing window analysed
  OFFLINE_HOURS: 48,      // OFFLINE = a site with a Call Log channel whose newest
                          // call-in is older than this many hours (or none in window).
                          // Sites without a Call Log column are not offline-alerted.
  LOW_BATT_V: 3.5,        // battery voltage below this = low-battery flag
  STUCK_N: 12,            // >= this many identical consecutive Level values = stuck sensor
  IQR_MULT: 3,            // latest reading beyond Q1/Q3 +/- IQR*this = out-of-range
  MAX_CHART_POINTS: 350   // per-series downsample target for charts
};

// ---- CSV parsing -------------------------------------------------
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.length);
  const headers = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const t = new Date(cells[0].replace(" ", "T"));
    if (isNaN(t)) continue;
    const values = {};
    for (let c = 1; c < headers.length; c++) {
      const raw = cells[c];
      values[headers[c]] = (raw === undefined || raw === "") ? null : Number(raw);
    }
    rows.push({ t, values });
  }
  return { headers, rows };
}

// ---- Header -> site model ---------------------------------------
// A column looks like "<device> OR_N.<Metric> (unit)" or "OR-RG1.<Metric> (unit)".
function siteKeyFromHeader(h) {
  const device = h.split(".")[0];           // "OR-E13B-G22-18A OR_1"
  const m = device.match(/OR_(\d+)/);
  if (m) return "OR_" + m[1];
  const rg = device.match(/OR-(RG\d+)/);
  if (rg) return rg[1];
  return device;
}
function metricFromHeader(h) {
  const after = h.split(".").slice(1).join(".");  // "Level1 (in)"
  const name = after.replace(/\s*\(.*?\)\s*$/, "").trim();
  const n = name.toLowerCase();
  if (n.startsWith("level1") || n === "level") return "level";
  if (n.startsWith("velocity1")) return "velocity";
  if (n.startsWith("raw lev") || n.startsWith("raw lvl")) return "raw";
  if (n.startsWith("local battery")) return "battery";
  if (n.startsWith("call log")) return "call";
  return null; // ignore velocityold / unknown / etc.
}

function buildSites(parsed) {
  const { headers, rows } = parsed;
  // map site -> metric -> header column name
  const map = {};
  for (let c = 1; c < headers.length; c++) {
    const h = headers[c];
    const site = siteKeyFromHeader(h);
    const metric = metricFromHeader(h);
    if (!metric) continue;
    map[site] = map[site] || {};
    // first matching column wins for each metric
    if (!map[site][metric]) map[site][metric] = h;
  }
  const latestTs = rows.length ? rows[rows.length - 1].t : null;
  const cutoff = latestTs ? new Date(latestTs.getTime() - CONFIG.WINDOW_DAYS * 864e5) : null;

  const sites = {};
  for (const site of Object.keys(map)) {
    const series = { level: [], velocity: [], battery: [], call: [] };
    for (const row of rows) {
      if (cutoff && row.t < cutoff) continue;
      for (const metric of ["level", "velocity", "battery", "call"]) {
        const col = map[site][metric];
        if (!col) continue;
        const v = row.values[col];
        if (v === null || v === undefined || isNaN(v)) continue;
        series[metric].push({ t: row.t, v });
      }
    }
    sites[site] = series;
  }
  return { sites, latestTs, cutoff, map };
}

// ---- stats helpers ----------------------------------------------
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function analyseSite(site, series, latestTs, meta) {
  const flags = [];
  const level = series.level, vel = series.velocity, batt = series.battery, call = series.call;
  const hasLevel = meta.hasLevel, hasCall = meta.hasCall;
  const kind = hasLevel ? "flow" : "gauge";

  // ---- offline (severity high). Two ways to trip, whichever applies:
  //   (a) site has a Call Log channel and hasn't called in for > 48h, OR
  //   (b) site has produced NO data of any kind for > 48h (proxy for no call).
  const offMin = CONFIG.OFFLINE_HOURS * 60;
  const allTs = [...level, ...vel, ...batt, ...call].map(p => p.t);
  const lastAny = allTs.length ? new Date(Math.max.apply(null, allTs)) : null;
  const anyAgeMin = lastAny ? (latestTs - lastAny) / 60000 : null;
  const callAgeMin = (hasCall && call.length) ? (latestTs - call[call.length - 1].t) / 60000 : null;

  if (hasCall && (!call.length || callAgeMin > offMin)) {
    flags.push({ type: "offline", severity: "high",
      msg: call.length
        ? `No call-in for ${humanMins(callAgeMin)} (last ${fmt(call[call.length-1].t)})`
        : `No call-in in the ${CONFIG.WINDOW_DAYS}-day window` });
  } else if (!lastAny || anyAgeMin > offMin) {
    flags.push({ type: "offline", severity: "high",
      msg: lastAny
        ? `No data for ${humanMins(anyAgeMin)} (last ${fmt(lastAny)})`
        : `No data in the ${CONFIG.WINDOW_DAYS}-day window` });
  }
  const lastLevelAgeMin = level.length ? (latestTs - level[level.length-1].t) / 60000 : null;

  // ---- low battery
  let lastBatt = batt.length ? batt[batt.length - 1].v : null;
  if (lastBatt !== null && lastBatt < CONFIG.LOW_BATT_V) {
    flags.push({ type: "battery", severity: "med",
      msg: `Battery ${lastBatt.toFixed(2)}V (< ${CONFIG.LOW_BATT_V}V)` });
  }

  // ---- out of range (latest level beyond robust bounds) — flow sites only
  if (kind === "flow" && level.length >= 20) {
    const vals = level.map(p => p.v).slice().sort((a, b) => a - b);
    const q1 = quantile(vals, 0.25), q3 = quantile(vals, 0.75);
    const iqr = q3 - q1;
    const hi = q3 + CONFIG.IQR_MULT * iqr, lo = q1 - CONFIG.IQR_MULT * iqr;
    const latest = level[level.length - 1].v;
    if (latest > hi || latest < lo) {
      flags.push({ type: "range", severity: "med",
        msg: `Level ${latest.toFixed(2)}in outside normal ${lo.toFixed(2)}–${hi.toFixed(2)}in` });
    }
    // stuck sensor
    let stuck = 1;
    for (let i = level.length - 1; i > 0 && level[i].v === level[i-1].v; i--) stuck++;
    if (stuck >= CONFIG.STUCK_N) {
      flags.push({ type: "range", severity: "med",
        msg: `Level flatlined at ${latest.toFixed(2)}in for ${stuck} readings` });
    }
  }

  const levVals = level.map(p => p.v);
  return {
    site, kind, hasCall,
    flags,
    healthy: flags.length === 0,
    counts: { level: level.length, velocity: vel.length, call: call.length },
    latest: {
      level: level.length ? level[level.length - 1].v : null,
      velocity: vel.length ? vel[vel.length - 1].v : null,
      battery: lastBatt,
      levelTime: level.length ? level[level.length - 1].t : null,
      callTime: call.length ? call[call.length - 1].t : null,
      activityTime: lastAny
    },
    stats: levVals.length ? {
      min: Math.min(...levVals), max: Math.max(...levVals),
      avg: levVals.reduce((a, b) => a + b, 0) / levVals.length
    } : null,
    lastLevelAgeMin, callAgeMin, anyAgeMin
  };
}

// ---- downsample a [{t,v}] series to ~N points (bucket average) --
function downsample(series, n = CONFIG.MAX_CHART_POINTS) {
  if (series.length <= n) return series;
  const bucket = Math.ceil(series.length / n);
  const out = [];
  for (let i = 0; i < series.length; i += bucket) {
    const slice = series.slice(i, i + bucket);
    const avg = slice.reduce((a, p) => a + p.v, 0) / slice.length;
    out.push({ t: slice[Math.floor(slice.length / 2)].t, v: avg });
  }
  return out;
}

function orderSites(keys) {
  const or = keys.filter(k => k.startsWith("OR_")).sort((a, b) =>
    Number(a.slice(3)) - Number(b.slice(3)));
  const rg = keys.filter(k => k.startsWith("RG")).sort();
  const other = keys.filter(k => !k.startsWith("OR_") && !k.startsWith("RG")).sort();
  return [...or, ...rg, ...other];
}

function analyseAll(text) {
  const parsed = parseCSV(text);
  const { sites, latestTs, cutoff, map } = buildSites(parsed);
  const keys = orderSites(Object.keys(sites));
  const results = keys.map(k => ({
    ...analyseSite(k, sites[k], latestTs, { hasLevel: !!(map[k] && map[k].level), hasCall: !!(map[k] && map[k].call) }),
    series: {
      level: downsample(sites[k].level),
      velocity: downsample(sites[k].velocity)
    }
  }));
  return {
    latestTs, cutoff,
    windowDays: CONFIG.WINDOW_DAYS,
    totalRows: parsed.rows.length,
    sites: results,
    summary: {
      total: results.length,
      flagged: results.filter(r => !r.healthy).length,
      offline: results.filter(r => r.flags.some(f => f.type === "offline")).length,
      lowBatt: results.filter(r => r.flags.some(f => f.type === "battery")).length,
      range: results.filter(r => r.flags.some(f => f.type === "range")).length
    }
  };
}

function humanMins(m) {
  if (m < 90) return Math.round(m) + " min";
  if (m < 1440) return (m / 60).toFixed(1) + " hr";
  return (m / 1440).toFixed(1) + " days";
}

function fmt(d) {
  if (!d) return "—";
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

if (typeof module !== "undefined") module.exports = {
  CONFIG, parseCSV, buildSites, analyseSite, analyseAll, siteKeyFromHeader, metricFromHeader, downsample, fmt, humanMins
};
