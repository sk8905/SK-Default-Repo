// =============================================================================
// Meridian Credit Intelligence — application shell, router and views.
// Plain ES modules, no framework. Hash-based routing for a clickable prototype.
// =============================================================================

import {
  STRATEGIES, FUND_STATUS, GEOS, LP_TYPES, DEAL_TYPES, DATA_UPDATED, LAST_CHECKED, LAST_CHECKED_TIME,
  managers, funds, lps, intel, commitments, deals,
  managerById, fundById, lpById,
  fundsByManager, intelForManager, intelForFund, dealsForManager, dealsForFund,
} from "./data.js?v=20260629-25";
// NOTE: these internal module imports carry the same ?v= cache-buster as the
// <script>/<link> tags in index.html. Bump ALL of them together on every release
// — otherwise the browser/CDN can serve a stale data.js/charts.js against a fresh
// app.js and the app fails to load (blank page).
import { barChart, donutChart, lineChart, multiLineChart } from "./charts.js?v=20260629-25";

const app = document.getElementById("app");

// ----------------------------- formatting utils ----------------------------
const eur = (m) => (m == null ? "Undisclosed" : "€" + (m >= 1000 ? (m / 1000).toFixed(m % 1000 === 0 ? 0 : 1) + "bn" : m + "m"));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pct = (n) => (n == null ? "Undisclosed" : Math.round(n) + "%");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
// Calendar quarter (e.g. "2025-Q2") from a fund's close/as-of date; null if only
// the year is known (we don't invent a quarter).
const fundQuarter = (f) => {
  const m = /^(\d{4})-(\d{2})/.exec(f.asOf || "");
  return m ? `${m[1]}-Q${Math.floor((+m[2] - 1) / 3) + 1}` : null;
};
const isClose = (f) => f.status === "Final Close" || f.status === "First Close";
// Some tracked managers run equity strategies, not credit. Their funds/news are
// included but clearly flagged, and kept out of the credit-specific aggregates.
const isEquity = (x) => x.assetClass === "Equity";
const equityBadge = (x) => isEquity(x) ? '<span class="chip eq-badge" title="Equity strategy — not private credit">Equity · not credit</span>' : "";

// Indicative NET target IRR ranges by strategy — market-typical conventions, NOT
// a specific fund's disclosed target. Used only where a fund discloses no target.
const STRATEGY_IRR = {
  "Senior Direct Lending": "8–10%",
  "Unitranche": "9–12%",
  "Mezzanine / Junior Debt": "12–15%",
  "Distressed & Special Situations": "15–20%+",
  "Structured Credit / CLO": "12–16%",
  "Real Estate Debt": "7–10%",
  "Infrastructure Debt": "6–9%",
  "Asset-Based Lending": "8–12%",
  "Opportunistic Credit": "10–14%",
  "NAV / Fund Finance": "8–12%",
};

const statusClass = (s) => ({
  "Pre-marketing": "st-pre", "Open": "st-open", "First Close": "st-first", "Final Close": "st-final",
  "Evergreen": "st-ever",
}[s] || "");

// Funds page categories. Evergreen funds are open-ended (continuously subscribable)
// rather than raising a vintage, so they get their own category — never "Open".
const FUND_CATEGORIES = ["Open", "First Close", "Final Close", "Evergreen", "Pre-marketing"];
const fundCategory = (x) => (x.evergreen ? "Evergreen" : x.status);
// The status chip a fund should display (Evergreen funds show "Evergreen").
const fundStatusChip = (x) => chip(fundCategory(x), statusClass(fundCategory(x)));
// Lifecycle badge for funds that have been wound down / liquidated / fully realised.
function lifecycleBadge(x) {
  if (!x.lifecycle) return "";
  const s = typeof x.lifecycle === "string" ? x.lifecycle : x.lifecycle.status;
  return `<span class="chip st-wound" title="${esc(typeof x.lifecycle === "object" && x.lifecycle.note ? x.lifecycle.note : s)}">${esc(s)}</span>`;
}
const mandateClass = (s) => ({
  "Actively allocating": "st-final", "Selective": "st-first", "Not currently active": "st-pre",
}[s] || "");

function progressBar(raised, target) {
  const actual = Math.round((raised / target) * 100);
  const w = Math.min(100, actual);
  return `<div class="progress" title="${eur(raised)} of ${eur(target)} target">
    <div class="progress-fill" style="width:${w}%"></div>
    <span class="progress-label">${eur(raised)} / ${eur(target)} · ${actual}%</span>
  </div>`;
}

// Decides how to display a fund's fundraising state given real-world gaps:
// evergreen (no target), undisclosed target/raised, or a normal progress bar.
function raiseDisplay(x) {
  if (x.evergreen) {
    return `<span class="chip st-open">Evergreen</span>` +
      (x.raised != null ? ` <span class="muted small">~${eur(x.raised)} AUM/NAV</span>` : "");
  }
  if (x.raised != null && x.targetSize != null) return progressBar(x.raised, x.targetSize);
  if (x.raised != null) return `<span class="muted small">${eur(x.raised)} raised · target undisclosed</span>`;
  if (x.status === "Pre-marketing") return `<span class="muted small">Pre-marketing</span>`;
  return `<span class="muted small">Undisclosed</span>`;
}

// Deployment vs raised (dry powder) where publicly disclosed; links to the
// fund's disclosed deals (what the capital was spent on).
function deploymentBlock(x) {
  const dl = dealsForFund(x.id);
  const dealNote = dl.length ? `<p class="muted small deploy-note">Disclosed investments: ${dl.length} — see Deal activity below.</p>` : "";
  if (x.evergreen) {
    return `<div class="deploy"><div class="deploy-head"><span>Deployment</span><span class="muted small">evergreen — capital deployed &amp; recycled on a rolling basis</span></div>${dealNote}</div>`;
  }
  if (x.deployedPct == null) {
    return `<div class="deploy"><div class="deploy-head"><span>Deployment / dry powder</span><span class="muted small">not separately disclosed</span></div>${dealNote}</div>`;
  }
  const raised = x.raised;
  const dep = raised != null ? Math.round(raised * x.deployedPct / 100) : null;
  const dry = (raised != null && dep != null) ? raised - dep : null;
  return `<div class="deploy">
    <div class="deploy-head"><span>Deployment${x.deployedEstimated ? " (est.)" : ""}</span><span>${x.deployedPct}% invested${x.deployedAsOf ? ` · as of ${esc(x.deployedAsOf)}` : ""}</span></div>
    <div class="deploy-bar" title="${x.deployedPct}% deployed"><div class="deploy-fill" style="width:${Math.min(100, x.deployedPct)}%"></div></div>
    <div class="deploy-stats">
      <span><strong>${dep != null ? eur(dep) : "—"}</strong> deployed</span>
      <span><strong>${dry != null ? eur(dry) : "—"}</strong> dry powder</span>
      <span><strong>${raised != null ? eur(raised) : "—"}</strong> raised</span>
    </div>
    ${dealNote}
  </div>`;
}

// Notable / high-profile investments a fund is publicly known for. Each entry is
// { name, note?, url? }; renders an honest empty-state when none are compiled.
function notableInvestmentsCard(x) {
  const items = x.notableInvestments || [];
  const body = items.length
    ? `<ul class="link-list">${items.map((n) => {
        const head = n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)}</a>` : `<strong>${esc(n.name)}</strong>`;
        return `<li>${head}${n.note ? ` <span class="muted small">— ${esc(n.note)}</span>` : ""}</li>`;
      }).join("")}</ul>`
    : `<p class="muted small">Notable portfolio investments not yet compiled / not publicly disclosed for this fund.</p>`;
  return `<section class="card"><h2>Notable investments</h2>${body}</section>`;
}

// A prominent note for funds that have been wound down / liquidated / fully realised.
function lifecycleNote(x) {
  if (!x.lifecycle) return "";
  const o = typeof x.lifecycle === "string" ? { status: x.lifecycle } : x.lifecycle;
  return `<div class="lifecycle-note">${lifecycleBadge(x)} <strong>${esc(o.status)}</strong>${o.date ? ` <span class="muted small">· ${esc(o.date)}</span>` : ""}${o.note ? `<p class="muted small">${esc(o.note)}</p>` : ""}</div>`;
}

function chip(text, cls = "") { return `<span class="chip ${cls}">${esc(text)}</span>`; }
function link(href, text, cls = "") { return `<a href="${href}" class="${cls}">${esc(text)}</a>`; }

// "Est." badge for figures that are labelled estimates rather than disclosed facts.
const estBadge = (on) => on ? '<span class="chip est" title="Estimated / not precisely disclosed publicly">Est.</span>' : "";

// Renders a record's source citations + as-of date, when present. No-ops otherwise.
function sources(rec) {
  if (!rec || !rec.sources || !rec.sources.length) return "";
  const links = rec.sources.map((s, i) =>
    `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label || "source " + (i + 1))}</a>`
  ).join(" · ");
  const asOf = rec.asOf ? ` · <span>as of ${esc(rec.asOf)}</span>` : "";
  return `<div class="sources muted small"><span class="src-label">Sources:</span> ${links}${asOf}</div>`;
}

// --------------------------- watchlist (cloud sync + localStorage) ---------
// Watchlist persists to a per-user Cloudflare KV store (via the /api/watchlist
// Pages Function) when the site is served behind Cloudflare Access, so it syncs
// across devices. localStorage is kept as an instant cache / offline fallback,
// so the app still works if the API isn't reachable (e.g. plain static hosting).
const FOLLOW_KEY = "meridian.follows";
const WATCHLIST_API = "/api/watchlist";
const FOLLOW_TYPES = ["manager", "fund", "lp"];
function loadFollows() { try { return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || {}; } catch { return {}; } }
const follows = loadFollows();
let account = null;          // signed-in identity (email) when behind Access
let cloudSync = false;       // true once the watchlist API responds
let pushTimer = null;
function followList(type) { return follows[type] || (follows[type] = []); }
function isFollowed(type, id) { return followList(type).includes(id); }
function persistLocal() { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(follows)); } catch { /* ignore */ } }
// Debounced save to the cloud (no-op when not signed in / not on Cloudflare).
function pushRemote() {
  if (!cloudSync) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const body = {}; FOLLOW_TYPES.forEach((t) => (body[t] = followList(t)));
    fetch(WATCHLIST_API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }, 400);
}
function saveFollows() { persistLocal(); pushRemote(); }
function toggleFollow(type, id) {
  const a = followList(type); const i = a.indexOf(id);
  if (i >= 0) a.splice(i, 1); else a.push(id);
  saveFollows();
}
function followCount() { return FOLLOW_TYPES.reduce((n, t) => n + followList(t).length, 0); }
// Topbar data-freshness line: dataset "last updated" date + the time this view
// was last loaded/refreshed, plus a manual Refresh button that reloads to pull
// the latest deployed data and re-sync the watchlist.
// Most recent item date across the intelligence + deals feeds (content freshness).
const LATEST_ITEM = [...intel, ...deals].reduce((m, x) => (x.date && x.date > m ? x.date : m), "");
function renderDataStatus() {
  const el = document.getElementById("data-status");
  if (!el) return;
  const t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const latest = LATEST_ITEM ? ` · latest item ${esc(fmtDate(LATEST_ITEM))}` : "";
  el.innerHTML = `<span class="ds-text" title="Routine last ran ${esc(fmtDate(LAST_CHECKED))}${LAST_CHECKED_TIME ? ` ${esc(LAST_CHECKED_TIME)}` : ""}; data last changed ${esc(fmtDate(DATA_UPDATED))}">Last refresh ${esc(fmtDate(LAST_CHECKED))}${LAST_CHECKED_TIME ? `, ${esc(LAST_CHECKED_TIME)}` : ""}${latest}</span>`;
}
// Fill the persistent topbar identity area once we know the signed-in user.
// Hidden when not behind Access (device-local mode).
function renderAccountNav() {
  const el = document.getElementById("account-nav");
  if (!el) return;
  if (cloudSync && account) {
    el.innerHTML = `signed in as <strong>${esc(account)}</strong> · <a href="/cdn-cgi/access/logout">Sign out</a>`;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}
// ---- Notifications bell: feed items new since the bell was last opened ------
// Lives in the topbar (outside #app), so it persists across every tab. "New" is
// detected by diffing current item ids against the set last acknowledged
// (localStorage) — robust regardless of publication dates.
const NOTIF_KEY = "meridian.credit.notifSeen";
function notifItems() {
  const out = [];
  deals.forEach((d) => out.push({ id: "d:" + d.id, date: d.date || "", kind: d.type, title: d.headline, href: d.clo ? "#/clos" : "#/deals", goto: (d.clo ? "clos:" : "deals:") + d.id }));
  intel.forEach((i) => out.push({ id: "i:" + i.id, date: i.date || "", kind: i.type, title: i.headline, href: i.clo ? "#/clos" : "#/intel", goto: (i.clo ? "clos:" : "intel:") + i.id }));
  managers.forEach((m) => (m.webNews || []).forEach((w) => out.push({ id: "w:" + m.id + ":" + (w.url || w.title), date: w.date || "", kind: "News", title: w.title, href: "#/manager/" + m.id })));
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function closeNotif() {
  const p = document.getElementById("notif-panel"), b = document.getElementById("notif-bell");
  if (p) p.setAttribute("hidden", "");
  if (b) b.setAttribute("aria-expanded", "false");
}
function renderNotifications() {
  const wrap = document.getElementById("notif");
  if (!wrap) return;
  const all = notifItems();
  const allIds = all.map((x) => x.id);
  let seen;
  try { seen = JSON.parse(localStorage.getItem(NOTIF_KEY) || "null"); } catch { seen = null; }
  const firstVisit = !Array.isArray(seen);
  const seenSet = new Set(firstVisit ? allIds : seen);
  if (firstVisit) { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(allIds)); } catch {} }
  const fresh = firstVisit ? [] : all.filter((x) => !seenSet.has(x.id));
  const n = fresh.length;
  const list = (n ? fresh : all).slice(0, 12);
  wrap.innerHTML = `
    <button type="button" class="notif-bell" id="notif-bell" aria-haspopup="true" aria-expanded="false" aria-label="Notifications${n ? ` — ${n} new` : ""}">
      <span class="notif-ico" aria-hidden="true">🔔</span>${n ? `<span class="notif-badge">${n > 9 ? "9+" : n}</span>` : ""}
    </button>
    <div class="notif-panel" id="notif-panel" role="menu" hidden>
      <div class="notif-head">${n ? `${n} new update${n > 1 ? "s" : ""}` : "No new updates"} <span class="muted small">· checked ${esc(fmtDate(LAST_CHECKED))}${LAST_CHECKED_TIME ? `, ${esc(LAST_CHECKED_TIME)}` : ""}</span></div>
      <ul class="notif-list">
        ${list.length ? list.map((x) => `<li class="notif-item${(n && fresh.includes(x)) ? " is-new" : ""}">
          <a href="${x.href}" ${x.goto ? `data-goto="${esc(x.goto)}"` : ""} class="notif-link">${esc(x.title)}</a>
          <div class="notif-meta muted small">${esc(x.kind)}${x.date ? ` · ${esc(fmtDate(x.date))}` : ""}</div>
        </li>`).join("") : '<li class="notif-empty muted small">Nothing yet.</li>'}
      </ul>
    </div>`;
  const bell = document.getElementById("notif-bell");
  const panel = document.getElementById("notif-panel");
  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel.hasAttribute("hidden")) {
      panel.removeAttribute("hidden"); bell.setAttribute("aria-expanded", "true");
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(allIds)); } catch {}
      const badge = bell.querySelector(".notif-badge"); if (badge) badge.remove();
    } else { closeNotif(); }
  });
  panel.addEventListener("click", (e) => {
    const a = e.target.closest("[data-goto]");
    if (a) { const [view, id] = a.getAttribute("data-goto").split(":"); pendingFocus = { view, id }; }
  });
}
// Close the panel on outside-click and on navigation.
document.addEventListener("click", (e) => {
  if (!e.target.closest("#notif")) closeNotif();
});
window.addEventListener("hashchange", closeNotif);

// devices; if the server is empty but this device has items, migrate them up.
async function initWatchlistSync() {
  let r;
  try { r = await fetch(WATCHLIST_API, { headers: { accept: "application/json" } }); }
  catch { return; }            // offline / not on Cloudflare → localStorage only
  if (!r || !r.ok) return;     // 404 on static hosting, 401 if not authed
  let d; try { d = await r.json(); } catch { return; }
  cloudSync = true;
  account = d.email || null;
  renderAccountNav();
  const sv = d.watchlist || {};
  const svCount = FOLLOW_TYPES.reduce((n, t) => n + ((sv[t] || []).length), 0);
  if (svCount > 0) {
    FOLLOW_TYPES.forEach((t) => (follows[t] = Array.isArray(sv[t]) ? sv[t] : []));
    persistLocal();
  } else if (followCount() > 0) {
    pushRemote();              // first-time migration of this device's list
  }
  router();                    // re-render with synced data + account chip
}
function followBtn(type, id) {
  const on = isFollowed(type, id);
  return `<button type="button" class="follow-btn ${on ? "on" : ""}" data-follow="${type}:${id}" title="${on ? "Following — click to remove from watchlist" : "Add to your watchlist"}" aria-label="Follow">${on ? "★" : "☆"}</button>`;
}

// Star + name as two flex columns, so a wrapping name stays in its own column
// (and never slides back under the star).
function nameCell(type, id, inner) {
  return `<span class="namecell">${followBtn(type, id)}<span class="namecell-text">${inner}</span></span>`;
}

// ----------------------- relationship lookups ------------------------------
function commitmentsForLp(lpId) { return commitments.filter((c) => c.lpId === lpId); }
function commitmentsForManager(managerId) { return commitments.filter((c) => c.managerId === managerId); }

// Actual, publicly-disclosed investors in a specific fund: combines the fund's
// own `investors` list with any fund-level entries in the commitments table.
// Deduped by name; LP-universe entries link through to the investor profile.
function investorsForFund(f) {
  const out = [];
  const seen = new Set();
  const push = (name, lpId, note, url) => {
    const key = (name || "").toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push({ name, lpId: lpId || null, note: note || "", url: url || null });
  };
  (f.investors || []).forEach((i) => push(i.name, i.lpId, i.note, i.url));
  commitments.filter((c) => c.fundId === f.id).forEach((c) => {
    const lp = lpById[c.lpId];
    push(lp ? lp.name : c.lpId, c.lpId, c.note, c.sourceUrl);
  });
  return out;
}

// --------------------------- simple filter state ---------------------------
// Persists per-view filter selections across re-renders within a session.
// Dropdown filters hold ARRAYS of selected values (multi-select). An empty
// array means "All". `period` stays a single string (chart drill-down).
const filterState = {
  funds: { q: "", strategy: [], status: [], geo: [], period: "", sort: { key: "name", dir: "asc" } },
  managers: { q: "", strategy: [], location: [], sort: { key: "name", dir: "asc" } },
  lps: { q: "", type: [], strategy: [], sort: { key: "name", dir: "asc" } },
  intel: { q: "", type: [], year: [] },
  deals: { q: "", type: [], year: [], period: "" },
  clos: { q: "", kind: [], year: [], period: "" },
  news: { q: "" },
};

// Calendar year (string) from an item's date; "" if none.
const yearOf = (d) => (String(d).match(/^(\d{4})/) || [])[1] || "";

// Which multi-select popover (if any) is open — kept open across re-renders.
let openMs = null;
// Pending scroll-to target after navigating to a feed page ({view, id}).
let pendingFocus = null;

// Dashboard quarterly-trend window (indices into the 40-quarter range). null =>
// default to the last 8 quarters (2 years). Persists across re-renders.
const trendState = { start: null, end: null };
// Independent window for the CLOs page's by-quarter chart.
const cloTrendState = { start: null, end: null };

// --------------------------- column-header sorting -------------------------
// Per-view accessor maps: column key -> { type, get(row) }. `type:"num"` sorts
// numerically (nulls last), otherwise alphabetical via localeCompare.
const SORT_COLUMNS = {
  funds: {
    name: { type: "txt", get: (x) => x.name },
    manager: { type: "txt", get: (x) => managerById[x.managerId].name },
    strategy: { type: "txt", get: (x) => x.strategy },
    geo: { type: "txt", get: (x) => x.geoFocus },
    status: { type: "txt", get: (x) => fundCategory(x) },
    target: { type: "num", get: (x) => (x.evergreen ? null : x.targetSize) },
    progress: { type: "num", get: (x) => x.raised },
  },
  managers: {
    name: { type: "txt", get: (m) => m.name },
    hq: { type: "txt", get: (m) => m.hq },
    aum: { type: "num", get: (m) => m.aum },
    funds: { type: "num", get: (m) => fundsByManager(m.id).length },
    live: { type: "num", get: (m) => fundsByManager(m.id).filter((x) => !x.evergreen && !x.lifecycle && x.status !== "Final Close").length },
  },
  lps: {
    name: { type: "txt", get: (l) => l.name },
    type: { type: "txt", get: (l) => l.type },
    hq: { type: "txt", get: (l) => l.hq },
    aum: { type: "num", get: (l) => l.aum },
    pc: { type: "num", get: (l) => l.pcAllocationPct },
    ticket: { type: "num", get: (l) => l.typicalTicket },
    mandate: { type: "txt", get: (l) => l.mandateStatus },
  },
};

// Sort rows per the view's current { key, dir }; missing/empty values sort last.
function applySort(rows, view) {
  const s = filterState[view].sort || (filterState[view].sort = { key: "name", dir: "asc" });
  const col = SORT_COLUMNS[view] && SORT_COLUMNS[view][s.key];
  if (!col) return rows;
  const mult = s.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = col.get(a), vb = col.get(b);
    const ea = va == null || va === "", eb = vb == null || vb === "";
    if (ea && eb) return 0;
    if (ea) return 1;           // empties always last
    if (eb) return -1;
    if (col.type === "num") return (va - vb) * mult;
    return String(va).localeCompare(String(vb)) * mult;
  });
}

// A clickable, sort-aware <th>. Shows ▲/▼ on the active column.
function sortTh(view, key, label, extraClass = "") {
  const s = filterState[view].sort;
  const active = s.key === key;
  const arrow = active ? (s.dir === "asc" ? " ▲" : " ▼") : "";
  return `<th class="sortable${active ? " active" : ""}${extraClass ? " " + extraClass : ""}" data-sortcol="${view}:${key}" role="button" tabindex="0" aria-sort="${active ? (s.dir === "asc" ? "ascending" : "descending") : "none"}">${esc(label)}${arrow}</th>`;
}

// ================================ DASHBOARD =================================
function viewDashboard() {
  // Credit-only universe for the headline aggregates (equity-strategy funds are
  // tracked and listed elsewhere but excluded from private-credit market stats).
  const creditFunds = funds.filter((f) => !isEquity(f));
  const nowD = new Date();
  const curQ = `${nowD.getFullYear()}-Q${Math.floor(nowD.getMonth() / 3) + 1}`;
  const quarterOf = (d) => { const m = /^(\d{4})-(\d{2})/.exec(d || ""); return m ? `${m[1]}-Q${Math.floor((+m[2] - 1) / 3) + 1}` : null; };
  // CLO items are carved out into #/clos, so they're excluded from the Deal
  // Activity and Fundraising aggregates/feeds on the dashboard too.
  const dealsNoClo = deals.filter((d) => !d.clo);
  const intelNoClo = intel.filter((i) => !i.clo);

  // ---- headline KPIs ----
  const dealsThisQuarter = dealsNoClo.filter((d) => quarterOf(d.date) === curQ).length;
  const openProcesses = creditFunds.filter((f) => !f.evergreen && (f.status === "Open" || f.status === "First Close")).length;
  const closesThisQuarter = creditFunds.filter((f) => isClose(f) && fundQuarter(f) === curQ).length;
  const cloClosesThisQuarter = [...deals.filter((d) => d.clo), ...intel.filter((i) => i.clo)]
    .filter((c) => quarterOf(c.date) === curQ).length;
  const kpis = [
    { label: "Deals this quarter", value: dealsThisQuarter, sub: curQ, jump: 'data-jump="deals"' },
    { label: "Open fundraising processes", value: openProcesses, sub: "funds currently in market", jump: 'data-jump="funds" data-status="in-market"' },
    { label: "Fundraising closes this quarter", value: closesThisQuarter, sub: curQ, jump: `data-jump="funds" data-period="${curQ}"` },
    { label: "CLO closes this quarter", value: cloClosesThisQuarter, sub: curQ, jump: 'data-jump="clos"' },
  ];

  // ---- the two charts retained on the dashboard ----
  const byDealType = [...new Set(dealsNoClo.map((d) => d.type))].map((t) => ({ label: t, value: dealsNoClo.filter((d) => d.type === t).length, nav: { jump: "deals", dtype: t } })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const byStatus = FUND_CATEGORIES.map((s) => ({ label: s, value: creditFunds.filter((f) => fundCategory(f) === s).length, nav: { jump: "funds", status: s } })).filter((d) => d.value > 0);

  // ---- latest feeds (headlines + links only; click → item on its feed page) ----
  const dealsByDate = [...dealsNoClo].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const intelByDate = [...intelNoClo].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // CLO items live in their own #/clos section; surface the most recent here too.
  const cloByDate = [...deals.filter((d) => d.clo), ...intel.filter((i) => i.clo)]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // Latest press across the tracked universe (manager news + webNews), deduped.
  const newsByDate = (() => {
    const out = [], seen = new Set();
    managers.forEach((m) => {
      [...(m.news || []), ...(m.webNews || [])].forEach((w) => {
        const base = (w.url || w.title || "").toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
        if (base && seen.has(base + "|" + m.id)) return;
        seen.add(base + "|" + m.id);
        out.push({ ...w, _mname: m.name });
      });
    });
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  })();
  const newsCompact = (x) => `<li class="compact-item">${x.url ? `<a class="compact-head" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)} ↗</a>` : `<span class="compact-head">${esc(x.title)}</span>`}<div class="compact-meta muted small">${x.date ? esc(fmtDate(x.date)) : ""}${x._mname ? ` · ${esc(x._mname)}` : ""}${x.outlet ? ` · ${esc(x.outlet)}` : ""}</div></li>`;

  app.innerHTML = `
    <div class="page-head">
      <h1>Credit Intelligence</h1>
      <p class="muted">European private credit deal flow &amp; market intelligence, with fundraising as a secondary lens · real data compiled from public sources (mid-2026)</p>
    </div>
    <div class="kpi-grid">
      ${kpis.map((k) => `<div class="kpi-card clickable" ${k.jump}><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div><div class="kpi-sub muted">${k.sub}</div></div>`).join("")}
    </div>

    <section class="card feature-card news-panel">
      <h2>Latest news <span class="muted">(${newsByDate.length})</span></h2>
      <p class="muted small">Manager &amp; investor press across the tracked universe. Click a headline to open the source, or open the News tab for the full feed.</p>
      ${newsByDate.length ? `<ul class="compact-list news-cols">${newsByDate.slice(0, 12).map(newsCompact).join("")}</ul>` : '<p class="muted small">No news yet.</p>'}
      <div class="card-foot">${link("#/news", "View all news →")}</div>
    </section>

    <div class="grid-3">
      <section class="card feature-card">
        <h2>Latest deal activity</h2>
        <p class="muted small">Financings, investments, acquisitions, refinancings, restructurings and exits. Click a headline to open it in the deal feed.</p>
        ${dealsByDate.length ? `<ul class="compact-list">${dealsByDate.slice(0, 12).map((d) => compactRow(d, "deals")).join("")}</ul>` : '<p class="muted small">No deal activity yet.</p>'}
        <div class="card-foot">${link("#/deals", "View all deal activity →")}</div>
      </section>
      <section class="card feature-card">
        <h2>Latest fundraising intelligence</h2>
        <p class="muted small">Fund launches, first/final closes, LP mandates, personnel and strategy moves. Click a headline to open it in the fundraising feed.</p>
        ${intelByDate.length ? `<ul class="compact-list">${intelByDate.slice(0, 12).map((i) => compactRow(i, "intel")).join("")}</ul>` : '<p class="muted small">No items yet.</p>'}
        <div class="card-foot">${link("#/intel", "View full fundraising intelligence →")}</div>
      </section>
      <section class="card feature-card">
        <h2>Latest CLO news</h2>
        <p class="muted small">Collateralised loan obligation pricings, resets, platforms, funds &amp; ETFs. Click a headline to open it in the CLOs section.</p>
        ${cloByDate.length ? `<ul class="compact-list">${cloByDate.slice(0, 12).map((c) => compactRow(c, "clos")).join("")}</ul>` : '<p class="muted small">No CLO news yet.</p>'}
        <div class="card-foot">${link("#/clos", "View all CLO activity →")}</div>
      </section>
    </div>

    <div class="grid-2">
      <section class="card"><h2>Deals by type</h2>${byDealType.length ? donutChart(byDealType) : '<p class="muted small">No deals tracked.</p>'}</section>
      <section class="card"><h2>Funds by status</h2>${donutChart(byStatus)}</section>
    </div>`;
}

// ================================== FUNDS ===================================
// Multi-select dropdown. `viewKey` is "view:key" (e.g. "funds:strategy").
// `options` are strings, or {value,label} objects. `selected` is an array.
function multiFilter(viewKey, label, options, selected) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const n = selected.length;
  const summary = n === 0 ? "All" : (n === 1 ? (opts.find((o) => o.value === selected[0]) || { label: selected[0] }).label : `${n} selected`);
  return `<div class="filter ms" data-ms="${viewKey}">
    <span>${label}</span>
    <button type="button" class="ms-btn" aria-haspopup="true" aria-expanded="false">${esc(summary)} <span class="ms-caret" aria-hidden="true">▾</span></button>
    <div class="ms-pop" hidden>
      ${opts.map((o) => `<label class="ms-opt"><input type="checkbox" value="${esc(o.value)}" ${selected.includes(o.value) ? "checked" : ""}> ${esc(o.label)}</label>`).join("")}
    </div>
  </div>`;
}

// Compact feed row for the dashboard: headline (links to the item on its feed
// page) + date and source only — no summary.
function compactRow(rec, view) {
  const head = `<a href="#/${view}" data-goto="${view}:${rec.id}" class="compact-head">${esc(rec.headline)}</a>`;
  const src = rec.sourceUrl ? ` · <a href="${esc(rec.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="muted small">source ↗</a>` : "";
  return `<li class="compact-item">${head}<div class="compact-meta muted small">${fmtDate(rec.date)}${src}</div></li>`;
}

function fundTable(rows) {
  rows = applySort(rows, "funds");
  return `<div class="table-wrap"><table class="data-table">
      <thead><tr>${sortTh("funds", "name", "Fund")}${sortTh("funds", "manager", "Manager")}${sortTh("funds", "strategy", "Strategy")}${sortTh("funds", "geo", "Geography")}${sortTh("funds", "status", "Status")}${sortTh("funds", "target", "Target")}${sortTh("funds", "progress", "Progress", "prog-col")}</tr></thead>
      <tbody>
        ${rows.map((x) => `<tr class="clickable" data-href="#/fund/${x.id}">
          <td>${nameCell("fund", x.id, `<strong>${esc(x.name)}</strong><div class="muted small fund-sub">${x.vintage} · ${esc(x.domicile)} · ${completenessPill(x)}</div>`)}</td>
          <td>${link(`#/manager/${x.managerId}`, managerById[x.managerId].name)}</td>
          <td>${chip(x.strategy)}</td>
          <td>${esc(x.geoFocus)}</td>
          <td>${fundStatusChip(x)} ${lifecycleBadge(x)} ${equityBadge(x)}</td>
          <td>${x.evergreen ? "—" : eur(x.targetSize)}</td>
          <td class="prog-col">${raiseDisplay(x)}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function viewFunds() {
  const f = filterState.funds;
  const inMarket = (x) => !x.evergreen && (x.status === "Open" || x.status === "First Close");
  const rows = funds.filter((x) =>
    (!f.q || (x.name + managerById[x.managerId].name).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.strategy.length || f.strategy.includes(x.strategy)) &&
    (!f.status.length || f.status.some((s) => (s === "in-market" ? inMarket(x) : fundCategory(x) === s))) &&
    (!f.geo.length || f.geo.includes(x.geoFocus)) &&
    (!f.period || (isClose(x) && fundQuarter(x) === f.period))
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Group by category: Open / First Close / Final Close / Evergreen / Pre-marketing.
  // Evergreen funds are open-ended, so they sit in their own category, not "Open".
  const sections = FUND_CATEGORIES
    .map((st) => ({ st, items: rows.filter((x) => fundCategory(x) === st) }))
    .filter((s) => s.items.length);
  const body = sections.length
    ? sections.map((s) => `<section class="fund-section">
        <h2 class="section-head">${esc(s.st)} <span class="chip ${statusClass(s.st)}">${s.items.length}</span></h2>
        ${fundTable(s.items)}
      </section>`).join("")
    : '<p class="empty">No funds match these filters.</p>';

  const periodBanner = f.period
    ? `<div class="active-filter">Showing funds that reached a first/final close in <strong>${esc(f.period)}</strong> <button type="button" class="chip" data-clearfilter="period" title="Clear quarter filter">✕ clear</button></div>`
    : "";

  app.innerHTML = `
    <div class="page-head"><h1>Funds in Market</h1><p class="muted">${rows.length} of ${funds.length} funds${f.period ? ` · closing ${esc(f.period)}` : ""}</p></div>
    ${periodBanner}
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Fund or manager…" value="${esc(f.q)}"></label>
      ${multiFilter("funds:strategy", "Strategy", STRATEGIES, f.strategy)}
      ${multiFilter("funds:status", "Status", [{ value: "in-market", label: "In market (Open + First Close)" }, ...FUND_CATEGORIES], f.status)}
      ${multiFilter("funds:geo", "Geography", GEOS, f.geo)}
    </div>
    ${body}`;
  wireFilters("funds");
}

// Indicative LP fit — shown while a fund is raising (open / first close / evergreen).
// Explicitly NOT confirmed commitments.
function potentialFitCard(x) {
  const interestedLps = lps.filter((l) => l.strategies.includes(x.strategy) && l.mandateStatus !== "Not currently active");
  return `<section class="card">
    <h2>Potential investor fit <span class="muted">(${interestedLps.length})</span></h2>
    <p class="muted small">LPs whose stated interests include ${esc(x.strategy)} — indicative fit while the fund is open, not confirmed commitments.</p>
    <ul class="link-list">
      ${interestedLps.slice(0, 6).map((l) => `<li>${link(`#/lp/${l.id}`, l.name)} <span class="muted small">${esc(l.type)} · ${l.typicalTicket != null ? eur(l.typicalTicket) + " typical ticket" : "ticket undisclosed"}</span></li>`).join("") || '<li class="muted">No active LPs flagged.</li>'}
    </ul>
  </section>`;
}

// Actual, publicly-disclosed investors — shown for funds that have reached final
// close (and evergreen funds). Honest empty-state when no LPs are public.
function actualInvestorsCard(x) {
  const inv = investorsForFund(x);
  const body = inv.length
    ? `<ul class="link-list">${inv.map((i) => `<li>${i.lpId ? link(`#/lp/${i.lpId}`, i.name) : `<strong>${esc(i.name)}</strong>`}${i.note ? ` <span class="muted small">— ${esc(i.note)}</span>` : ""}${i.url ? ` · <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" class="muted small">source</a>` : ""}</li>`).join("")}</ul>`
    : `<p class="muted small">No specific LP commitments to this fund have been disclosed publicly. (Most private funds do not name investors; where cornerstone/anchor LPs are announced — e.g. public pensions, the EIF / British Business Bank, sovereign wealth funds — they are listed here with sources.)</p>`;
  return `<section class="card"><h2>Investors <span class="muted">(${inv.length})</span></h2>
    <p class="muted small">Limited partners publicly disclosed as having committed to this fund.</p>${body}</section>`;
}

// Target IRR (disclosed where known, else indicative strategy range) + any
// publicly-disclosed actual performance (net/gross IRR, MOIC, DPI).
function returnsCard(x) {
  const ti = x.targetIRR;
  const target = ti
    ? `<p><strong>${esc(ti.range)}${ti.basis ? " " + esc(ti.basis) : ""}</strong> <span class="muted small">target — disclosed${ti.asOf ? `, ${esc(ti.asOf)}` : ""}</span>${ti.sourceUrl ? ` · <a href="${esc(ti.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="muted small">source</a>` : ""}</p>`
    : `<p><strong>${esc(STRATEGY_IRR[x.strategy] || "—")} net</strong> <span class="chip est" title="Indicative market-typical range for the strategy, not this fund's disclosed target">indicative</span> <span class="muted small">typical for ${esc(x.strategy)}; the fund's own target is not publicly disclosed</span></p>`;
  const p = x.performance;
  const metrics = p ? [
    p.netIRR != null ? `<span><strong>${p.netIRR}%</strong> net IRR</span>` : "",
    p.grossIRR != null ? `<span><strong>${p.grossIRR}%</strong> gross IRR</span>` : "",
    p.moic != null ? `<span><strong>${p.moic}x</strong> MOIC</span>` : "",
    p.dpi != null ? `<span><strong>${p.dpi}x</strong> DPI</span>` : "",
  ].filter(Boolean).join("") : "";
  const perf = p
    ? `<div class="deploy-stats">${metrics || '<span class="muted small">disclosed</span>'}</div>${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ""}${p.asOf ? `<p class="muted small">as of ${esc(p.asOf)}</p>` : ""}${p.sourceUrl ? sources({ sources: [{ label: "Performance source", url: p.sourceUrl }] }) : ""}`
    : `<p class="muted small">No fund-level performance publicly disclosed. (Net IRR / multiples for private funds are usually only visible via public-pension reports or listed vehicles; shown here when available.)</p>`;
  return `<section class="card"><h2>Target return &amp; performance</h2>
    <h3 class="sub">Target IRR</h3>${target}
    <h3 class="sub">Actual performance</h3>${perf}</section>`;
}

// ---- Data provenance & completeness -----------------------------------------
// Honest, at-a-glance view of WHICH data points are disclosed for a fund, which
// are estimates/indicative, and which are simply not public — so gaps are
// explicit rather than hidden. States: yes (disclosed) · est (estimate) ·
// indicative (strategy proxy, not this fund's figure) · no (gap) · na (n/a).
function dataDimensions(x) {
  const inv = investorsForFund(x);
  const notable = (x.notableInvestments || []).length;
  return [
    { key: "Fundraising target",
      state: x.evergreen ? "na" : (x.targetSize != null ? "yes" : "no"),
      detail: x.evergreen ? "evergreen — no fixed target" : (x.targetSize != null ? eur(x.targetSize) + " target" : "target not disclosed") },
    { key: x.evergreen ? "Current AUM/NAV" : "Amount raised",
      state: x.raised != null ? "yes" : "no",
      detail: x.raised != null ? eur(x.raised) : "not disclosed" },
    { key: "Deployment",
      state: x.evergreen ? "na" : (x.deployedPct != null ? (x.deployedEstimated ? "est" : "yes") : "no"),
      detail: x.evergreen ? "rolling (evergreen)" : (x.deployedPct != null ? `${x.deployedPct}% invested${x.deployedEstimated ? " (est.)" : ""}${x.deployedAsOf ? ` · as of ${x.deployedAsOf}` : ""}` : "not separately disclosed") },
    { key: "Target IRR",
      state: x.targetIRR ? "yes" : "indicative",
      detail: x.targetIRR ? `${x.targetIRR.range}${x.targetIRR.basis ? " " + x.targetIRR.basis : ""} — disclosed` : `${STRATEGY_IRR[x.strategy] || "—"} — indicative strategy range, not this fund's figure` },
    { key: "Actual performance",
      state: x.performance ? "yes" : "no",
      detail: x.performance ? "net IRR / multiples disclosed" : "not publicly disclosed" },
    { key: "Named investors",
      state: inv.length ? "yes" : "no",
      detail: inv.length ? `${inv.length} disclosed` : "none publicly disclosed" },
    { key: "Notable investments",
      state: notable ? "yes" : "no",
      detail: notable ? `${notable} compiled` : "none compiled / disclosed" },
  ];
}
// Disclosed = hard facts (yes) + flagged estimates (est). Indicative/no/na are not
// counted as disclosed; na is excluded from the denominator (not applicable).
function completeness(x) {
  const dims = dataDimensions(x);
  const applicable = dims.filter((d) => d.state !== "na");
  const disclosed = applicable.filter((d) => d.state === "yes" || d.state === "est");
  return { disclosed: disclosed.length, total: applicable.length, gaps: applicable.filter((d) => d.state === "no" || d.state === "indicative").map((d) => d.key) };
}
// Compact inline meter for tables/headers; tooltip spells out the gaps.
function completenessPill(x) {
  const c = completeness(x);
  const lvl = c.disclosed / c.total;
  const cls = lvl >= 0.66 ? "dm-hi" : lvl >= 0.34 ? "dm-mid" : "dm-lo";
  const title = c.gaps.length ? `Not disclosed: ${c.gaps.join(", ")}` : "All tracked data points disclosed";
  return `<span class="data-meter ${cls}" title="${esc(title)}"><span class="dm-bar"><span class="dm-fill" style="width:${Math.round(lvl * 100)}%"></span></span>${c.disclosed}/${c.total} data</span>`;
}
const STATE_ICON = { yes: "✓", est: "~", indicative: "~", no: "—", na: "·" };
const STATE_LABEL = { yes: "Disclosed", est: "Estimate", indicative: "Indicative", no: "Not disclosed", na: "N/A" };
// Full breakdown card: as-of date + per-dimension disclosure status.
function dataProvenanceCard(x) {
  const c = completeness(x);
  const rows = dataDimensions(x).map((d) =>
    `<li class="dim dim-${d.state}"><span class="dim-icon" title="${esc(STATE_LABEL[d.state])}">${STATE_ICON[d.state]}</span>
      <span class="dim-key">${esc(d.key)}</span>
      <span class="dim-detail muted small">${esc(d.detail)}</span></li>`).join("");
  return `<section class="card provenance">
    <h2>Data completeness &amp; provenance</h2>
    <p class="muted small">Record compiled <strong>as of ${esc(x.asOf || "—")}</strong> from public sources. <strong>${c.disclosed} of ${c.total}</strong> tracked data points are publicly disclosed${c.gaps.length ? `; the rest are not public (or shown as an indicative proxy) and are marked below.` : "."}</p>
    <ul class="dim-list">${rows}</ul>
    <p class="muted small">“Indicative” = a market-typical range for the strategy, not this fund’s own figure. “Estimate” = a figure we have approximated and flagged. Everything else links to its source above.</p>
  </section>`;
}

function viewFund(id) {
  const x = fundById[id];
  if (!x) return notFound();
  const m = managerById[x.managerId];
  const related = intelForFund(id);
  const peers = funds.filter((p) => p.strategy === x.strategy && p.id !== id).slice(0, 5);
  // While raising (open/first close/pre-marketing) or evergreen → indicative fit.
  // At final close (and for evergreen) → actual disclosed investor list.
  const showPotential = x.evergreen || x.status === "Open" || x.status === "First Close" || x.status === "Pre-marketing";
  const hasActualInvestors = investorsForFund(x).length > 0;
  const investorCard = showPotential ? potentialFitCard(x) : actualInvestorsCard(x);
  // Evergreen funds show both; a still-raising fund also shows actual investors if any are disclosed.
  const extraInvestorCard = (x.evergreen || (showPotential && hasActualInvestors)) ? actualInvestorsCard(x) : "";

  app.innerHTML = `
    ${breadcrumb([["#/funds", "Funds"], [null, x.name]])}
    <div class="detail-head">
      <div>
        <h1>${nameCell("fund", x.id, esc(x.name))}</h1>
        <p class="muted">${link(`#/manager/${m.id}`, m.name)} · ${esc(x.domicile)} · Vintage ${x.vintage}</p>
        <div>${chip(x.strategy)} ${fundStatusChip(x)} ${lifecycleBadge(x)} ${equityBadge(x)} ${chip(x.geoFocus)}</div>
        <p class="muted small data-asof">Data as of ${esc(x.asOf || "—")} · ${completenessPill(x)}</p>
      </div>
    </div>
    <p class="lead">${esc(x.description)}</p>
    ${lifecycleNote(x)}
    ${sources(x)}
    <div class="grid-2">
      <section class="card">
        <h2>Fundraising</h2>
        ${raiseDisplay(x)}
        <dl class="facts">
          <div><dt>Target size</dt><dd>${x.evergreen ? "Evergreen (open-ended)" : eur(x.targetSize)}</dd></div>
          <div><dt>Hard cap</dt><dd>${eur(x.hardCap)}</dd></div>
          <div><dt>${x.evergreen ? "Current AUM/NAV" : "Raised to date"}</dt><dd>${eur(x.raised)}</dd></div>
          <div><dt>Status</dt><dd>${fundStatusChip(x)}</dd></div>
          <div><dt>Sector focus</dt><dd>${esc(x.sectorFocus)}</dd></div>
          <div><dt>Domicile</dt><dd>${esc(x.domicile)}</dd></div>
        </dl>
        ${deploymentBlock(x)}
      </section>
      ${investorCard}
    </div>
    ${extraInvestorCard}
    ${returnsCard(x)}
    ${dataProvenanceCard(x)}
    <section class="card">
      <h2>Related intelligence</h2>
      ${related.length ? related.map(intelRow).join("") : '<p class="muted">No intelligence items linked to this fund yet.</p>'}
    </section>
    ${notableInvestmentsCard(x)}
    ${dealsForFund(x.id).length ? `<section class="card"><h2>Deal activity <span class="muted">(${dealsForFund(x.id).length})</span></h2>${dealsForFund(x.id).map(dealRow).join("")}</section>` : ""}
    <section class="card">
      <h2>Peer funds — ${esc(x.strategy)}</h2>
      <ul class="link-list">
        ${peers.map((p) => `<li>${link(`#/fund/${p.id}`, p.name)} <span class="muted small">${esc(managerById[p.managerId].name)} · ${chip(p.status, statusClass(p.status))}</span></li>`).join("") || '<li class="muted">No peers found.</li>'}
      </ul>
    </section>`;
}

// ================================ MANAGERS ==================================
// Normalise a manager's HQ string to one or more canonical countries/regions so
// the Managers tab can offer a clean "Location" filter. Handles dual HQs
// ("New York, US / London, UK"), abbreviations (UK/FR/DE…) and bare country
// names. "CA" is disambiguated (Montreal → Canada, else California → US).
const HQ_REGION_BY_TOKEN = {
  "uk": "United Kingdom", "united kingdom": "United Kingdom", "london": "United Kingdom", "edinburgh": "United Kingdom",
  "us": "United States", "united states": "United States", "new york": "United States",
  "fr": "France", "france": "France",
  "de": "Germany", "germany": "Germany",
  "it": "Italy", "italy": "Italy",
  "es": "Spain", "spain": "Spain",
  "se": "Sweden", "sweden": "Sweden",
  "fi": "Finland", "finland": "Finland",
  "nl": "Netherlands", "netherlands": "Netherlands",
  "dk": "Denmark", "denmark": "Denmark",
  "ch": "Switzerland", "switzerland": "Switzerland",
  "lu": "Luxembourg", "luxembourg": "Luxembourg",
  "be": "Belgium", "belgium": "Belgium",
  "il": "Israel", "israel": "Israel",
  "uae": "UAE", "canada": "Canada", "australia": "Australia",
  "hong kong": "Hong Kong", "jersey": "Jersey",
};
const HQ_CANADA_CITY = /montreal|toronto|vancouver|calgary|ottawa/;
function hqRegions(hq) {
  const out = [];
  String(hq || "").split("/").forEach((part) => {
    part = part.trim();
    if (!part) return;
    const segs = part.split(",").map((s) => s.trim());
    const last = segs[segs.length - 1].toLowerCase();
    const city = segs.length > 1 ? segs[0].toLowerCase() : "";
    let region;
    if (last === "ca") region = HQ_CANADA_CITY.test(city) ? "Canada" : "United States";
    else region = HQ_REGION_BY_TOKEN[last] || HQ_REGION_BY_TOKEN[part.toLowerCase()] || segs[segs.length - 1];
    if (region && !out.includes(region)) out.push(region);
  });
  return out;
}

function viewManagers() {
  const f = filterState.managers;
  const LOCATIONS = [...new Set(managers.flatMap((m) => hqRegions(m.hq)))].sort();
  const rows = managers.filter((m) =>
    (!f.q || m.name.toLowerCase().includes(f.q.toLowerCase()) || m.hq.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.strategy.length || f.strategy.some((s) => m.strategies.includes(s))) &&
    (!f.location.length || hqRegions(m.hq).some((r) => f.location.includes(r)))
  );
  const sorted = applySort(rows, "managers");

  app.innerHTML = `
    <div class="page-head"><h1>Managers</h1><p class="muted">${rows.length} of ${managers.length} GPs</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Name or HQ…" value="${esc(f.q)}"></label>
      ${multiFilter("managers:strategy", "Strategy", STRATEGIES, f.strategy)}
      ${multiFilter("managers:location", "Location", LOCATIONS, f.location)}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>${sortTh("managers", "name", "Manager")}${sortTh("managers", "hq", "HQ")}${sortTh("managers", "aum", "AUM")}<th>Strategies</th>${sortTh("managers", "funds", "Funds")}${sortTh("managers", "live", "In&nbsp;mkt")}</tr></thead>
      <tbody>
        ${sorted.map((m) => {
          const fs = fundsByManager(m.id);
          const live = fs.filter((x) => !x.evergreen && !x.lifecycle && x.status !== "Final Close").length;
          const strat = m.strategies.slice(0, 2).map((s) => chip(s)).join(" ") + (m.strategies.length > 2 ? ` <span class="muted small">+${m.strategies.length - 2}</span>` : "") || '<span class="muted small">—</span>';
          return `<tr class="clickable" data-href="#/manager/${m.id}">
            <td>${nameCell("manager", m.id, `<strong>${esc(m.name)}</strong>`)}</td>
            <td class="muted small">${esc(m.hq)}</td>
            <td>${m.aumText ? esc(m.aumText) : "€" + m.aum + "bn"}</td>
            <td>${strat}</td>
            <td>${fs.length}</td>
            <td>${live}</td>
          </tr>`;
        }).join("")}
        ${rows.length === 0 ? '<tr><td colspan="6" class="empty">No managers match these filters.</td></tr>' : ""}
      </tbody>
    </table></div>`;
  wireFilters("managers");
}

// Ownership, financials, headcount and regulatory/account filings (last 2 yrs).
function ownersFilingsBlock(m) {
  const owners = (m.owners && m.owners.length)
    ? `<dl class="facts">${m.owners.map((o) => `<div><dt>${esc(o.name)}</dt><dd>${esc(o.stake)}</dd></div>`).join("")}</dl>`
    : `<p class="muted small">Ownership not separately disclosed in public sources.</p>`;
  const fin = m.financials
    ? `<p>${esc(m.financials.summary)}${m.financials.asOf ? ` <span class="muted small">(as of ${esc(m.financials.asOf)})</span>` : ""}</p>`
    : `<p class="muted small">Financials not yet compiled / not publicly disclosed (most private managers do not publish accounts beyond regulatory filings).</p>`;
  const hc = m.headcount
    ? `<div class="deploy-stats"><span><strong>${m.headcount.investment ?? "—"}</strong> investment professionals</span><span><strong>${m.headcount.other ?? "—"}</strong> other professionals</span><span><strong>${m.headcount.total ?? "—"}</strong> total</span></div>${m.headcount.asOf ? `<p class="muted small">as of ${esc(m.headcount.asOf)}</p>` : ""}`
    : `<p class="muted small">Headcount split not yet compiled / not publicly broken out.</p>`;
  const fil = (m.filings && m.filings.length)
    ? `<ul class="link-list">${m.filings.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)}</a>${x.date ? ` <span class="muted small">· ${esc(x.date)}</span>` : ""}</li>`).join("")}</ul>`
    : `<p class="muted small">No regulatory/account filings compiled yet (UK LLPs file at Companies House; US advisers file SEC Form ADV; listed parents file annual reports).</p>`;
  return `<section class="card">
    <h2>Ownership, financials &amp; filings</h2>
    <h3 class="sub">Owners</h3>${owners}
    <h3 class="sub">Finances</h3>${fin}
    <h3 class="sub">Headcount</h3>${hc}
    <h3 class="sub">Recent regulatory &amp; account filings (last 2 years)</h3>${fil}
    ${m.regSources ? sources({ sources: m.regSources }) : ""}
  </section>`;
}

// Group a dated list into year sections (newest year first; undated last),
// each rendered with a year heading acting as a section break.
function byYear(items, rowFn) {
  const groups = {};
  [...items].sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach((x) => {
    const y = (String(x.date).match(/^(\d{4})/) || [])[1] || "Undated";
    (groups[y] ||= []).push(x);
  });
  return Object.keys(groups)
    .sort((a, b) => (a === "Undated") - (b === "Undated") || b.localeCompare(a))
    .map((y) => `<div class="year-group"><h3 class="year-head">${esc(y)}</h3>${groups[y].map(rowFn).join("")}</div>`)
    .join("");
}

function newsItemRow(x) {
  return `<div class="intel-row"><div class="intel-meta"><span class="muted small">${esc(x.outlet || "")}</span><span class="muted small">${x.date ? esc(fmtDate(x.date)) : ""}</span></div><div class="intel-body"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" class="intel-head">${esc(x.title)}</a></div></div>`;
}

function newsBlock(m) {
  // Combine curated news with the manager's own website announcements (webNews),
  // de-duplicated by URL then title.
  const all = [...(m.news || []), ...(m.webNews || [])];
  const seen = new Set();
  const n = all.filter((x) => {
    const k = (x.url || x.title || "").toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return `<section class="card">
    <h2>In the news</h2>
    ${n.length
      ? byYear(n, newsItemRow)
      : '<p class="muted small">No curated news yet for this manager. (When populated, items are drawn from the manager\'s own website plus the Financial Times, Bloomberg, Wall Street Journal, Yahoo Finance and other reputable outlets.)'}
  </section>`;
}

// Senior legal team — general counsel and other senior legal counsel, with the
// city they are based in and a link to their LinkedIn profile where known.
function legalBlock(m) {
  const people = m.legal || [];
  return `<section class="card">
    <h2>Legal &amp; senior counsel</h2>
    ${people.length
      ? `<ul class="link-list">${people.map((p) => `<li>
          <strong>${esc(p.name)}</strong> <span class="muted small">${esc(p.role)}${p.city ? ` · ${esc(p.city)}` : ""}</span>${p.linkedin ? ` · <a href="${esc(p.linkedin)}" target="_blank" rel="noopener noreferrer" class="muted small">LinkedIn ↗</a>` : ""}
        </li>`).join("")}</ul>`
      : '<p class="muted small">Senior legal contacts not yet compiled for this manager (sourced from the firm\'s own website and LinkedIn where disclosed).</p>'}
  </section>`;
}

function viewManager(id) {
  const m = managerById[id];
  if (!m) return notFound();
  const fs = fundsByManager(id).sort((a, b) => b.vintage - a.vintage);
  const news = intelForManager(id);
  const liveFunds = fs.filter((x) => !x.evergreen && !x.lifecycle && x.status !== "Final Close").length;
  // CLO activity is carved into its own section per manager; the Deal activity
  // and Fundraising sections exclude clo:true items (consistent with #/clos).
  const mgrDeals = dealsForManager(m.id).filter((d) => !d.clo);
  const mgrIntel = news.filter((i) => !i.clo);
  const mgrClo = [
    ...dealsForManager(m.id).filter((d) => d.clo).map((d) => ({ ...d, _kind: "deal" })),
    ...news.filter((i) => i.clo).map((i) => ({ ...i, _kind: "intel" })),
  ];

  app.innerHTML = `
    ${breadcrumb([["#/managers", "Managers"], [null, m.name]])}
    <div class="detail-head"><div>
      <h1>${nameCell("manager", m.id, esc(m.name))}</h1>
      <p class="muted">${esc(m.hq)} · Founded ${m.founded}</p>
      <div>${m.strategies.map((s) => chip(s)).join(" ")}</div>
    </div></div>
    <p class="lead">${esc(m.description)}</p>
    ${sources(m)}
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value kpi-aum">${m.aumText ? esc(m.aumText) : "€" + m.aum + "bn"}</div><div class="kpi-label">Assets under management</div></div>
      <div class="kpi-card"><div class="kpi-value">${fs.length}</div><div class="kpi-label">Funds tracked</div></div>
      <div class="kpi-card"><div class="kpi-value">${liveFunds}</div><div class="kpi-label">In market now</div></div>
      <div class="kpi-card"><div class="kpi-value">${m.founded}</div><div class="kpi-label">Founded</div></div>
    </div>
    <section class="card">
      <h2>Funds <span class="muted">(${fs.length})</span></h2>
      ${fs.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>Fund</th><th>Strategy</th><th>Geography</th><th>Vintage</th><th>Status</th><th>Target</th><th class="prog-col">Progress</th></tr></thead>
        <tbody>${fs.map((x) => `<tr class="clickable" data-href="#/fund/${x.id}">
          <td>${nameCell("fund", x.id, `<strong>${esc(x.name)}</strong>`)}</td><td>${chip(x.strategy)}</td><td>${esc(x.geoFocus)}</td><td>${x.vintage}</td>
          <td>${fundStatusChip(x)} ${lifecycleBadge(x)} ${equityBadge(x)}</td><td>${x.evergreen ? "—" : eur(x.targetSize)}</td>
          <td class="prog-col">${raiseDisplay(x)}</td>
        </tr>`).join("")}</tbody>
      </table></div>`
      : `<p class="muted">${esc(m.fundsNote || "No fund tracked for this manager — see the profile note above (e.g. it is a bank/balance-sheet lender, has no dedicated credit arm, or runs only US/global vehicles).")}</p>`}
    </section>
    ${commitmentsForManager(m.id).length ? `<section class="card"><h2>Known investors <span class="muted">(${commitmentsForManager(m.id).length})</span></h2><ul class="link-list">${commitmentsForManager(m.id).map((c) => `<li>${link(`#/lp/${c.lpId}`, lpById[c.lpId].name)} <span class="muted small">${esc(c.note)}</span></li>`).join("")}</ul></section>` : ""}
    ${ownersFilingsBlock(m)}
    ${legalBlock(m)}

    <div class="section-divider"><span>News, deals &amp; intelligence</span></div>
    ${newsBlock(m)}
    ${mgrDeals.length ? `<section class="card"><h2>Deal activity <span class="muted">(${mgrDeals.length})</span></h2>${byYear(mgrDeals, dealRow)}</section>` : ""}
    <section class="card">
      <h2>Fundraising intelligence</h2>
      ${mgrIntel.length ? byYear(mgrIntel, intelRow) : '<p class="muted">No fundraising intelligence items for this manager yet.</p>'}
    </section>
    <section class="card">
      <h2>CLO activity <span class="muted">(${mgrClo.length})</span></h2>
      <p class="muted small">Collateralised loan obligation pricings, resets, platforms &amp; funds. <a href="#/clos">All CLO activity →</a></p>
      ${mgrClo.length ? byYear(mgrClo, (x) => (x._kind === "deal" ? dealRow(x) : intelRow(x))) : '<p class="muted">This manager does not manage any tracked CLOs.</p>'}
    </section>`;
}

// ================================ INVESTORS =================================
function viewLps() {
  const f = filterState.lps;
  const rows = lps.filter((l) =>
    (!f.q || l.name.toLowerCase().includes(f.q.toLowerCase()) || l.hq.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.type.length || f.type.includes(l.type)) &&
    (!f.strategy.length || f.strategy.some((s) => l.strategies.includes(s)))
  );
  const sorted = applySort(rows, "lps");

  app.innerHTML = `
    <div class="page-head"><h1>Investors / Allocators</h1><p class="muted">${rows.length} of ${lps.length} LPs</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Name or HQ…" value="${esc(f.q)}"></label>
      ${multiFilter("lps:type", "Type", LP_TYPES, f.type)}
      ${multiFilter("lps:strategy", "Interest", STRATEGIES, f.strategy)}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>${sortTh("lps", "name", "Investor")}${sortTh("lps", "type", "Type")}${sortTh("lps", "hq", "HQ")}${sortTh("lps", "aum", "AUM")}${sortTh("lps", "pc", "PC alloc.")}${sortTh("lps", "ticket", "Typical ticket")}${sortTh("lps", "mandate", "Mandate")}</tr></thead>
      <tbody>
        ${sorted.map((l) => `<tr class="clickable" data-href="#/lp/${l.id}">
          <td>${nameCell("lp", l.id, `<strong>${esc(l.name)}</strong>`)}</td><td>${esc(l.type)}</td><td>${esc(l.hq)}</td>
          <td>€${l.aum}bn</td><td>${pct(l.pcAllocationPct)}</td><td>${eur(l.typicalTicket)}</td>
          <td>${chip(l.mandateStatus, mandateClass(l.mandateStatus))}</td>
        </tr>`).join("")}
        ${rows.length === 0 ? '<tr><td colspan="7" class="empty">No investors match these filters.</td></tr>' : ""}
      </tbody>
    </table></div>`;
  wireFilters("lps");
}

function viewLp(id) {
  const l = lpById[id];
  if (!l) return notFound();
  const pcAum = l.pcAllocationPct != null ? (l.aum * l.pcAllocationPct / 100) : null;
  const matches = funds.filter((x) => l.strategies.includes(x.strategy) && (x.status === "Open" || x.status === "First Close" || x.status === "Pre-marketing"));

  app.innerHTML = `
    ${breadcrumb([["#/lps", "Investors"], [null, l.name]])}
    <div class="detail-head"><div>
      <h1>${nameCell("lp", l.id, esc(l.name))}</h1>
      <p class="muted">${esc(l.type)} · ${esc(l.hq)}</p>
      <div>${chip(l.mandateStatus, mandateClass(l.mandateStatus))} ${l.strategies.map((s) => chip(s)).join(" ")}</div>
    </div></div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">€${l.aum}bn</div><div class="kpi-label">Total AUM</div></div>
      <div class="kpi-card"><div class="kpi-value">${pct(l.pcAllocationPct)} ${l.pcAllocationPct != null ? estBadge(l.pcEstimated) : ""}</div><div class="kpi-label">Private credit allocation</div></div>
      <div class="kpi-card"><div class="kpi-value">${pcAum != null ? "€" + pcAum.toFixed(1) + "bn" : "Undisclosed"}</div><div class="kpi-label">Implied PC allocation</div></div>
      <div class="kpi-card"><div class="kpi-value">${eur(l.typicalTicket)}</div><div class="kpi-label">Typical ticket</div></div>
    </div>
    <section class="card">
      <h2>Mandate notes</h2>
      <p class="lead">${esc(l.notes)}</p>
      <dl class="facts">
        <div><dt>Status</dt><dd>${chip(l.mandateStatus, mandateClass(l.mandateStatus))}</dd></div>
        <div><dt>Strategies of interest</dt><dd>${l.strategies.map((s) => chip(s)).join(" ")}</dd></div>
      </dl>
    </section>
    ${commitmentsForLp(l.id).length ? `<section class="card"><h2>Known commitments <span class="muted">(${commitmentsForLp(l.id).length})</span></h2><ul class="link-list">${commitmentsForLp(l.id).map((c) => `<li>${link(`#/manager/${c.managerId}`, managerById[c.managerId].name)}${c.fundId ? ` · ${link(`#/fund/${c.fundId}`, fundById[c.fundId].name, "muted small")}` : ""} <span class="muted small">${esc(c.note)}</span></li>`).join("")}</ul></section>` : ""}
    <section class="card">
      <h2>Matching funds in market <span class="muted">(${matches.length})</span></h2>
      <p class="muted small">Live funds whose strategy aligns with this investor's stated interests.</p>
      <ul class="link-list">
        ${matches.map((x) => `<li>${link(`#/fund/${x.id}`, x.name)} <span class="muted small">${esc(managerById[x.managerId].name)} · ${chip(x.strategy)} · ${chip(x.status, statusClass(x.status))}</span></li>`).join("") || '<li class="muted">No matching live funds.</li>'}
      </ul>
    </section>`;
}

// =============================== INTELLIGENCE ===============================
const INTEL_TYPES = ["Launch", "First Close", "Final Close", "Mandate", "Personnel", "Strategy"];
const intelTypeClass = (t) => ({
  "Launch": "it-launch", "First Close": "it-first", "Final Close": "it-final",
  "Mandate": "it-mandate", "Personnel": "it-personnel", "Strategy": "it-strategy",
}[t] || "");

function intelRow(i) {
  const m = i.managerId ? managerById[i.managerId] : null;
  const ftarget = i.fundId ? `#/fund/${i.fundId}` : (m ? `#/manager/${m.id}` : null);
  const tag = m ? link(`#/manager/${m.id}`, m.name, "muted small") : '<span class="muted small">Market-wide</span>';
  const head = ftarget ? link(ftarget, i.headline, "intel-head") : `<span class="intel-head">${esc(i.headline)}</span>`;
  return `<div class="intel-row" id="row-${i.id}">
    <div class="intel-meta"><span class="chip ${intelTypeClass(i.type)}">${esc(i.type)}</span><span class="muted small">${fmtDate(i.date)}</span></div>
    <div class="intel-body">${head}<p class="muted small">${esc(i.summary)}</p><div>${tag}${i.sourceUrl ? ` · <a href="${esc(i.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="muted small">source ↗</a>` : ""}</div></div>
  </div>`;
}

function viewIntel() {
  const f = filterState.intel;
  // CLO fundraising/platform news is carved out into its own #/clos section.
  const base = intel.filter((i) => !i.clo);
  const rows = base.filter((i) =>
    (!f.q || (i.headline + i.summary).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.type.length || f.type.includes(i.type)) &&
    (!f.year.length || f.year.includes(yearOf(i.date)))
  ).sort((a, b) => String(b.date).localeCompare(String(a.date))); // newest first

  // ---- fundraising charts (moved here from the dashboard) ----
  const creditFunds = funds.filter((x) => !isEquity(x));
  const bnRaised = (list) => Math.round(list.reduce((a, x) => a + (x.raised || 0), 0) / 100) / 10;
  const byStrategy = STRATEGIES.map((s) => ({ label: s, value: bnRaised(creditFunds.filter((x) => x.strategy === s)), nav: { jump: "funds", strategy: s } })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const seeking = (x) => !x.evergreen && !x.lifecycle && (x.status === "Open" || x.status === "First Close" || x.status === "Pre-marketing");
  const bnTarget = (list) => Math.round(list.reduce((a, x) => a + (x.targetSize || 0), 0) / 100) / 10;
  const bySought = STRATEGIES.map((s) => ({ label: s, value: bnTarget(creditFunds.filter((x) => seeking(x) && x.strategy === s)), nav: { jump: "funds", strategy: s, status: "in-market" } })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const byGeo = GEOS.map((g) => ({ label: g, value: bnRaised(creditFunds.filter((x) => x.geoFocus === g)), nav: { jump: "funds", geo: g } })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const qCounts = {};
  creditFunds.filter(isClose).forEach((x) => { const q = fundQuarter(x); if (q) qCounts[q] = (qCounts[q] || 0) + 1; });
  const nowD = new Date();
  let cy = nowD.getFullYear(), cq = Math.floor(nowD.getMonth() / 3) + 1;
  const quarters = [];
  for (let i = 0; i < 20; i++) { quarters.unshift(`${cy}-Q${cq}`); cq--; if (cq < 1) { cq = 4; cy--; } }
  const trend = quarters.map((q) => ({ label: "'" + q.slice(2), value: qCounts[q] || 0, nav: { jump: "funds", period: q } }));

  app.innerHTML = `
    <div class="page-head"><h1>Fundraising Intelligence</h1><p class="muted">${rows.length} of ${base.length} items · European private credit capital formation · <a href="#/clos">CLOs are in their own section →</a></p></div>
    <div class="split-3070">
      <div class="split-left">
        <section class="card"><h2>Capital raised by strategy <span class="muted">(€bn)</span></h2>${byStrategy.length ? barChart(byStrategy, { unit: "€", width: 540 }) : '<p class="muted small">No data.</p>'}</section>
        <section class="card"><h2>Capital sought by strategy <span class="muted">(€bn · disclosed targets, funds in market)</span></h2>${bySought.length ? barChart(bySought, { unit: "€", width: 540 }) : '<p class="muted small">No disclosed target sizes for funds currently in market.</p>'}</section>
        <section class="card"><h2>Capital raised by geography <span class="muted">(€bn)</span></h2>${byGeo.length ? barChart(byGeo, { unit: "€", width: 540 }) : '<p class="muted small">No data.</p>'}</section>
        <section class="card"><h2>Fundraising momentum <span class="muted">(closes / quarter · past 5 years)</span></h2><p class="muted small">Click a quarter to see the funds that reached a first/final close in it.</p>${lineChart(trend, { width: 540, height: 240 })}</section>
      </div>
      <div class="split-right">
        <div class="filters">
          <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Keyword…" value="${esc(f.q)}"></label>
          ${multiFilter("intel:type", "Type", [...new Set(base.map((i) => i.type))].sort(), f.type)}
          ${multiFilter("intel:year", "Year", [...new Set(base.map((i) => yearOf(i.date)).filter(Boolean))].sort((a, b) => b.localeCompare(a)), f.year)}
        </div>
        <section class="card">
          ${rows.length ? byYear(rows, intelRow) : '<p class="empty">No intelligence items match these filters.</p>'}
        </section>
      </div>
    </div>
    <section class="card">
      <h2>Known LP → manager commitments <span class="muted">(${commitments.length})</span></h2>
      <p class="muted small">Publicly reported LP→manager relationships (moved here from the former Mandates tab) — click either side to explore. LP mandates &amp; RFP / fund-launch items appear in the feed above, filterable by type "Mandate" / "Launch".</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Investor</th><th>Manager</th><th>Detail</th></tr></thead>
        <tbody>${commitments.map((c) => `<tr>
          <td><strong>${link(`#/lp/${c.lpId}`, lpById[c.lpId].name)}</strong><div class="muted small">${esc(lpById[c.lpId].type)}</div></td>
          <td>${link(`#/manager/${c.managerId}`, managerById[c.managerId].name)}${c.fundId ? `<div class="muted small">${link(`#/fund/${c.fundId}`, fundById[c.fundId].name)}</div>` : ""}</td>
          <td class="muted small">${esc(c.note)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </section>`;
  wireFilters("intel");
  applyPendingFocus("intel");
}

// ============================== DEAL ACTIVITY ==============================
const dealTypeClass = (t) => ({
  "Investment": "dt-invest", "Financing": "dt-fin", "Disposal / Exit": "dt-exit",
  "Refinancing": "dt-refi", "Restructuring": "dt-restr", "Bankruptcy / Distress": "dt-bank",
  "Acquisition": "dt-acq", "NPL / Portfolio": "dt-npl", "Continuation Vehicle": "dt-cv",
  "Unitranche": "dt-fin", "Structured Credit": "dt-invest", "NAV / Fund Finance": "dt-refi",
}[t] || "");

function dealRow(d) {
  const m = d.managerId ? managerById[d.managerId] : null;
  const tgt = d.fundId ? `#/fund/${d.fundId}` : (m ? `#/manager/${m.id}` : null);
  const tag = m ? link(`#/manager/${m.id}`, m.name, "muted small") : "";
  const head = tgt ? link(tgt, d.headline, "intel-head") : `<span class="intel-head">${esc(d.headline)}</span>`;
  return `<div class="intel-row" id="row-${d.id}">
    <div class="intel-meta"><span class="chip ${dealTypeClass(d.type)}">${esc(d.type)}</span><span class="muted small">${fmtDate(d.date)}</span></div>
    <div class="intel-body">${head}<p class="muted small">${esc(d.summary)}</p><div>${tag}${d.sourceUrl ? ` · <a href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="muted small">source ↗</a>` : ""}</div></div>
  </div>`;
}

function viewDeals() {
  const f = filterState.deals;
  // CLO transactions are carved out into their own #/clos section.
  const base = deals.filter((d) => !d.clo);
  // ---- quarter helper (also used by the by-quarter chart drill-down) ----
  const quarterOf = (d) => { const m = /^(\d{4})-(\d{2})/.exec(d || ""); return m ? `${m[1]}-Q${Math.floor((+m[2] - 1) / 3) + 1}` : null; };
  const rows = base.filter((d) =>
    (!f.q || (d.headline + d.summary + (managerById[d.managerId] ? managerById[d.managerId].name : "")).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.type.length || f.type.includes(d.type)) &&
    (!f.year.length || f.year.includes(yearOf(d.date))) &&
    (!f.period || quarterOf(d.date) === f.period)
  ).sort((a, b) => String(b.date).localeCompare(String(a.date))); // newest first

  // ---- deal charts (moved here from the dashboard) ----
  const dq = {};
  base.forEach((d) => { const q = quarterOf(d.date); if (q) dq[q] = (dq[q] || 0) + 1; });
  const nowD = new Date();
  let dy = nowD.getFullYear(), dqr = Math.floor(nowD.getMonth() / 3) + 1;
  const dQuarters = [];
  for (let i = 0; i < 40; i++) { dQuarters.unshift(`${dy}-Q${dqr}`); dqr--; if (dqr < 1) { dqr = 4; dy--; } }
  const NQ = dQuarters.length;
  // deals-only quarterly series for the windowed chart (fundraising removed).
  const buildTrend = (a, b) => {
    const win = dQuarters.slice(a, b + 1);
    const lab = win.length <= 16 ? (q) => "'" + q.slice(2) : (q) => (q.endsWith("Q1") ? "'" + q.slice(2, 4) : "");
    return win.map((q) => ({ label: lab(q), value: dq[q] || 0, nav: { jump: "deals", period: q } }));
  };
  const tStart = Math.min(Math.max(0, trendState.start ?? (NQ - 8)), NQ - 1);
  const tEnd = Math.min(Math.max(tStart, trendState.end ?? (NQ - 1)), NQ - 1);
  // most active managers by disclosed deal count (top 10).
  const dealMgrCounts = {};
  base.forEach((d) => { if (d.managerId) dealMgrCounts[d.managerId] = (dealMgrCounts[d.managerId] || 0) + 1; });
  const byDealManager = Object.entries(dealMgrCounts)
    .map(([id, value]) => ({ label: managerById[id] ? managerById[id].name : id, value, nav: { jump: "manager/" + id } }))
    .sort((a, b) => b.value - a.value).slice(0, 10);

  app.innerHTML = `
    <div class="page-head"><h1>Deal Activity</h1><p class="muted">${rows.length} of ${base.length} transactions · investments, exits, refinancings, restructurings &amp; distress${f.period ? ` · <strong>${esc(f.period)}</strong> <button type="button" class="link-btn" id="clear-period">clear quarter ✕</button>` : ""} · <a href="#/clos">CLOs are in their own section →</a></p></div>
    <div class="split-3070">
      <div class="split-left">
        <section class="card">
          <h2>Deal activity by quarter</h2>
          <p class="muted small">Deal transactions per quarter. Drag either handle to set the date range (up to 10 years); click any quarter to filter the feed.</p>
          <div class="trend-controls">
            <div class="range-readout"><strong id="trend-start-lbl">${esc(dQuarters[tStart])}</strong> <span class="muted">→</span> <strong id="trend-end-lbl">${esc(dQuarters[tEnd])}</strong></div>
            <div class="range-slider">
              <div class="range-track"></div>
              <div class="range-fill" id="trend-fill" style="left:${(tStart / (NQ - 1)) * 100}%; width:${((tEnd - tStart) / (NQ - 1)) * 100}%"></div>
              <input type="range" id="trend-start" min="0" max="${NQ - 1}" value="${tStart}" aria-label="Range start quarter">
              <input type="range" id="trend-end" min="0" max="${NQ - 1}" value="${tEnd}" aria-label="Range end quarter">
            </div>
          </div>
          <div id="trend-chart">${lineChart(buildTrend(tStart, tEnd), { width: 560, height: 300 })}</div>
        </section>
        <section class="card"><h2>Most active managers <span class="muted">(by deal count)</span></h2>${byDealManager.length ? barChart(byDealManager, { width: 560 }) : '<p class="muted small">No deals tracked.</p>'}</section>
      </div>
      <div class="split-right">
        <div class="filters">
          <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Company, manager…" value="${esc(f.q)}"></label>
          ${multiFilter("deals:type", "Type", [...new Set(base.map((d) => d.type))].sort(), f.type)}
          ${multiFilter("deals:year", "Year", [...new Set(base.map((d) => yearOf(d.date)).filter(Boolean))].sort((a, b) => b.localeCompare(a)), f.year)}
        </div>
        <section class="card">
          ${rows.length ? byYear(rows, dealRow) : '<p class="empty">No deal items match these filters.</p>'}
        </section>
      </div>
    </div>`;
  wireFilters("deals");

  // Clear the active quarter filter set by clicking a column in the by-quarter chart.
  const clearPeriod = document.getElementById("clear-period");
  if (clearPeriod) clearPeriod.addEventListener("click", () => { filterState.deals.period = ""; router(); });

  // Wire the quarterly range sliders (re-render only the chart on drag).
  const sEl = document.getElementById("trend-start");
  const eEl = document.getElementById("trend-end");
  if (sEl && eEl) {
    const fill = document.getElementById("trend-fill");
    const rerender = () => {
      const a = +sEl.value, b = +eEl.value;
      trendState.start = a; trendState.end = b;
      document.getElementById("trend-start-lbl").textContent = dQuarters[a];
      document.getElementById("trend-end-lbl").textContent = dQuarters[b];
      if (fill) { fill.style.left = (a / (NQ - 1)) * 100 + "%"; fill.style.width = ((b - a) / (NQ - 1)) * 100 + "%"; }
      document.getElementById("trend-chart").innerHTML = lineChart(buildTrend(a, b), { width: 560, height: 300 });
    };
    sEl.addEventListener("input", () => { if (+sEl.value > +eEl.value) sEl.value = eEl.value; sEl.style.zIndex = 5; eEl.style.zIndex = 4; rerender(); });
    eEl.addEventListener("input", () => { if (+eEl.value < +sEl.value) eEl.value = sEl.value; eEl.style.zIndex = 5; sEl.style.zIndex = 4; rerender(); });
  }
  applyPendingFocus("deals");
}

// ================================== CLOs ===================================
// Collateralised loan obligations — pricings, new platforms/managers, CLO funds,
// CLO ETFs, awards and CLO-team personnel — carved out of Deal Activity and
// Fundraising Intelligence into one dedicated feed. Items keep their original
// home array (deals / intel, tagged `clo:true`); this view simply gathers them.
function viewClos() {
  const f = filterState.clos;
  const cloDeals = deals.filter((d) => d.clo).map((d) => ({ ...d, _kind: "deal" }));
  const cloIntel = intel.filter((i) => i.clo).map((i) => ({ ...i, _kind: "intel" }));
  const all = [...cloDeals, ...cloIntel];
  const quarterOf = (d) => { const m = /^(\d{4})-(\d{2})/.exec(d || ""); return m ? `${m[1]}-Q${Math.floor((+m[2] - 1) / 3) + 1}` : null; };
  const rows = all.filter((x) =>
    (!f.q || ((x.headline || "") + (x.summary || "")).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.kind.length || f.kind.includes(x._kind === "deal" ? "Deal" : "Fundraising")) &&
    (!f.year.length || f.year.includes(yearOf(x.date))) &&
    (!f.period || quarterOf(x.date) === f.period)
  ).sort((a, b) => String(b.date).localeCompare(String(a.date))); // newest first

  // ---- CLO activity by quarter (draggable 10-year window, like Deal Activity) ----
  const qc = {};
  all.forEach((x) => { const q = quarterOf(x.date); if (q) qc[q] = (qc[q] || 0) + 1; });
  const nowD = new Date();
  let dy = nowD.getFullYear(), dqr = Math.floor(nowD.getMonth() / 3) + 1;
  const dQuarters = [];
  for (let i = 0; i < 40; i++) { dQuarters.unshift(`${dy}-Q${dqr}`); dqr--; if (dqr < 1) { dqr = 4; dy--; } }
  const NQ = dQuarters.length;
  const buildTrend = (a, b) => {
    const win = dQuarters.slice(a, b + 1);
    const lab = win.length <= 16 ? (q) => "'" + q.slice(2) : (q) => (q.endsWith("Q1") ? "'" + q.slice(2, 4) : "");
    return win.map((q) => ({ label: lab(q), value: qc[q] || 0, nav: { jump: "clos", period: q } }));
  };
  const tStart = Math.min(Math.max(0, cloTrendState.start ?? (NQ - 8)), NQ - 1);
  const tEnd = Math.min(Math.max(tStart, cloTrendState.end ?? (NQ - 1)), NQ - 1);

  const mc = {};
  all.forEach((x) => { if (x.managerId) mc[x.managerId] = (mc[x.managerId] || 0) + 1; });
  const byMgr = Object.entries(mc)
    .map(([id, value]) => ({ label: managerById[id] ? managerById[id].name : id, value, nav: { jump: "manager/" + id } }))
    .sort((a, b) => b.value - a.value).slice(0, 10);

  const feedRow = (x) => x._kind === "deal" ? dealRow(x) : intelRow(x);

  app.innerHTML = `
    <div class="page-head"><h1>CLOs</h1><p class="muted">${rows.length} of ${all.length} items · collateralised loan obligation pricings, platforms, funds, ETFs &amp; personnel — carved out of Deals &amp; Fundraising${f.period ? ` · <strong>${esc(f.period)}</strong> <button type="button" class="link-btn" id="clear-period">clear quarter ✕</button>` : ""}</p></div>
    <div class="split-3070">
      <div class="split-left">
        <section class="card">
          <h2>CLO activity by quarter</h2>
          <p class="muted small">CLO pricings &amp; news per quarter. Drag either handle to set the date range (up to 10 years); click any quarter to filter the feed.</p>
          <div class="trend-controls">
            <div class="range-readout"><strong id="trend-start-lbl">${esc(dQuarters[tStart])}</strong> <span class="muted">→</span> <strong id="trend-end-lbl">${esc(dQuarters[tEnd])}</strong></div>
            <div class="range-slider">
              <div class="range-track"></div>
              <div class="range-fill" id="trend-fill" style="left:${(tStart / (NQ - 1)) * 100}%; width:${((tEnd - tStart) / (NQ - 1)) * 100}%"></div>
              <input type="range" id="trend-start" min="0" max="${NQ - 1}" value="${tStart}" aria-label="Range start quarter">
              <input type="range" id="trend-end" min="0" max="${NQ - 1}" value="${tEnd}" aria-label="Range end quarter">
            </div>
          </div>
          <div id="trend-chart">${lineChart(buildTrend(tStart, tEnd), { width: 560, height: 300 })}</div>
        </section>
        ${byMgr.length ? `<section class="card"><h2>Most active CLO managers</h2>${barChart(byMgr, { width: 560 })}</section>` : ""}
      </div>
      <div class="split-right">
        <div class="filters">
          <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Keyword…" value="${esc(f.q)}"></label>
          ${multiFilter("clos:kind", "Source", ["Deal", "Fundraising"], f.kind)}
          ${multiFilter("clos:year", "Year", [...new Set(all.map((x) => yearOf(x.date)).filter(Boolean))].sort((a, b) => b.localeCompare(a)), f.year)}
        </div>
        <section class="card">
          ${rows.length ? byYear(rows, feedRow) : '<p class="empty">No CLO items match these filters.</p>'}
        </section>
      </div>
    </div>`;
  wireFilters("clos");

  // Clear the active quarter filter set by clicking a column in the by-quarter chart.
  const clearPeriod = document.getElementById("clear-period");
  if (clearPeriod) clearPeriod.addEventListener("click", () => { filterState.clos.period = ""; router(); });

  // Wire the quarterly range sliders (re-render only the chart on drag).
  const sEl = document.getElementById("trend-start");
  const eEl = document.getElementById("trend-end");
  if (sEl && eEl) {
    const fill = document.getElementById("trend-fill");
    const rerender = () => {
      const a = +sEl.value, b = +eEl.value;
      cloTrendState.start = a; cloTrendState.end = b;
      document.getElementById("trend-start-lbl").textContent = dQuarters[a];
      document.getElementById("trend-end-lbl").textContent = dQuarters[b];
      if (fill) { fill.style.left = (a / (NQ - 1)) * 100 + "%"; fill.style.width = ((b - a) / (NQ - 1)) * 100 + "%"; }
      document.getElementById("trend-chart").innerHTML = lineChart(buildTrend(a, b), { width: 560, height: 300 });
    };
    sEl.addEventListener("input", () => { if (+sEl.value > +eEl.value) sEl.value = eEl.value; sEl.style.zIndex = 5; eEl.style.zIndex = 4; rerender(); });
    eEl.addEventListener("input", () => { if (+eEl.value < +sEl.value) eEl.value = sEl.value; eEl.style.zIndex = 5; sEl.style.zIndex = 4; rerender(); });
  }
  applyPendingFocus("clos");
}

// ================================== NEWS ===================================
// Aggregated manager/investor press across the whole tracked universe — the
// `news` + `webNews` arrays on every manager, deduped and surfaced as a feed
// (these previously only appeared on each manager's profile and the bell).
function viewNews() {
  const f = filterState.news;
  const all = [];
  const seen = new Set();
  managers.forEach((m) => {
    [...(m.news || []), ...(m.webNews || [])].forEach((w) => {
      const base = (w.url || w.title || "").toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
      const k = base + "|" + m.id;
      if (base && seen.has(k)) return;
      seen.add(k);
      all.push({ ...w, _mid: m.id, _mname: m.name });
    });
  });
  all.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const rows = all.filter((x) => !f.q || `${x.title || ""} ${x.outlet || ""} ${x._mname || ""}`.toLowerCase().includes(f.q.toLowerCase()));
  const newsRow = (x) => `<div class="intel-row"><div class="intel-meta"><span class="chip">News</span><span class="muted small">${x.date ? esc(fmtDate(x.date)) : ""}</span></div><div class="intel-body">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" class="intel-head">${esc(x.title)} ↗</a>` : `<span class="intel-head">${esc(x.title)}</span>`}<div>${link(`#/manager/${x._mid}`, x._mname, "muted small")}${x.outlet ? ` · <span class="muted small">${esc(x.outlet)}</span>` : ""}</div></div></div>`;

  app.innerHTML = `
    <div class="page-head"><h1>News</h1><p class="muted">${rows.length} of ${all.length} items · manager &amp; investor press across the tracked universe</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Headline, outlet, manager…" value="${esc(f.q)}"></label>
    </div>
    <section class="card">${rows.length ? byYear(rows, newsRow) : '<p class="empty">No news items match your search.</p>'}</section>`;
  wireFilters("news");
}

// =============================== WATCHLIST =================================
function viewWatchlist() {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const fm = followList("manager").map((id) => managerById[id]).filter(Boolean).sort(byName);
  const ff = followList("fund").map((id) => fundById[id]).filter(Boolean).sort(byName);
  const fl = followList("lp").map((id) => lpById[id]).filter(Boolean).sort(byName);
  const mIds = new Set(fm.map((m) => m.id)), fIds = new Set(ff.map((f) => f.id));

  // Combined feed for followed managers/funds: in the news, deal activity and
  // fundraising intelligence — tagged so a single year-grouped list can render
  // each item with its own row style.
  const matches = (x) => (x.managerId && mIds.has(x.managerId)) || (x.fundId && fIds.has(x.fundId));
  const dealItems = deals.filter((d) => !d.clo && matches(d)).map((d) => ({ ...d, _kind: "deal" }));
  const intelItems = intel.filter((i) => !i.clo && matches(i)).map((i) => ({ ...i, _kind: "intel" }));
  // CLO activity for followed managers/funds is carved into its own section.
  const cloItems = [
    ...deals.filter((d) => d.clo && matches(d)).map((d) => ({ ...d, _kind: "deal" })),
    ...intel.filter((i) => i.clo && matches(i)).map((i) => ({ ...i, _kind: "intel" })),
  ];
  const newsItems = [];
  fm.forEach((m) => {
    const all = [...(m.news || []), ...(m.webNews || [])];
    const seen = new Set();
    all.forEach((x) => {
      const k = (x.url || x.title || "").toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
      if (seen.has(k)) return;
      seen.add(k);
      newsItems.push({ ...x, _kind: "news", _mid: m.id, _mname: m.name });
    });
  });
  const feed = [...newsItems, ...dealItems, ...intelItems];
  const feedRow = (x) => x._kind === "deal" ? dealRow(x)
    : x._kind === "intel" ? intelRow(x)
    : `<div class="intel-row"><div class="intel-meta"><span class="chip">News</span><span class="muted small">${fmtDate(x.date)}</span></div><div class="intel-body"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" class="intel-head">${esc(x.title)}</a><div>${link(`#/manager/${x._mid}`, x._mname, "muted small")}${x.outlet ? ` · <span class="muted small">${esc(x.outlet)}</span>` : ""}</div></div></div>`;

  const syncNote = cloudSync
    ? `☁ Synced to your account across devices${account ? ` · signed in as <strong>${esc(account)}</strong>` : ""} · <a href="/cdn-cgi/access/logout">Sign out</a>`
    : "Saved on this device only";
  const accountBar = `<div class="account-bar muted small">${syncNote}</div>`;

  if (fm.length + ff.length + fl.length === 0) {
    app.innerHTML = `<div class="page-head"><h1>My Watchlist</h1></div>
      ${accountBar}
      <section class="card"><p class="muted">You're not following anything yet. Click the ☆ star on any manager, fund or investor to add it here — your watchlist builds a personalised intelligence feed${cloudSync ? " and syncs across your devices" : ""}.</p></section>`;
    return;
  }
  const listCard = (title, items, type, render) =>
    `<details class="card wl-cat" open><summary class="wl-cat-head"><h2>${title} <span class="muted">(${items.length})</span></h2><span class="wl-caret" aria-hidden="true"></span></summary>${items.length
      ? `<ul class="link-list">${items.map((x) => `<li>${nameCell(type, x.id, render(x))}</li>`).join("")}</ul>`
      : '<p class="muted small">None followed.</p>'}</details>`;
  app.innerHTML = `
    <div class="page-head"><h1>My Watchlist</h1><p class="muted">${fm.length + ff.length + fl.length} followed · ${cloudSync ? "synced across devices" : "saved on this device"}</p></div>
    ${accountBar}
    <div class="grid-3">
      ${listCard("Managers", fm, "manager", (m) => link(`#/manager/${m.id}`, m.name))}
      ${listCard("Funds", ff, "fund", (f) => `${link(`#/fund/${f.id}`, f.name)} <span class="muted small">${esc(managerById[f.managerId].name)}</span>`)}
      ${listCard("Investors", fl, "lp", (l) => `${link(`#/lp/${l.id}`, l.name)} <span class="muted small">${esc(l.type)}</span>`)}
    </div>
    <section class="card"><h2>News, deals &amp; fundraising <span class="muted">(${feed.length})</span></h2>${feed.length ? byYear(feed, feedRow) : '<p class="muted small">No news, deals or fundraising yet for the managers/funds you follow.</p>'}</section>
    ${cloItems.length ? `<section class="card"><h2>CLO activity <span class="muted">(${cloItems.length})</span></h2><p class="muted small">Collateralised loan obligation activity for the managers/funds you follow. <a href="#/clos">All CLO activity →</a></p>${byYear(cloItems, feedRow)}</section>` : ""}`;
}

// ============================== shared bits ================================
function breadcrumb(parts) {
  return `<nav class="breadcrumb">${parts.map(([href, label], i) =>
    (href ? link(href, label) : `<span>${esc(label)}</span>`) + (i < parts.length - 1 ? '<span class="sep">/</span>' : "")
  ).join("")}</nav>`;
}

function notFound() {
  app.innerHTML = `<div class="page-head"><h1>Not found</h1><p class="muted">That record doesn't exist. ${link("#/", "Back to dashboard")}.</p></div>`;
}

// Re-render current view but keep updated filter state, without losing focus
function wireFilters(view) {
  const inputs = app.querySelectorAll("input[data-filter], select[data-filter]");
  inputs.forEach((el) => {
    const key = el.getAttribute("data-filter");
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      filterState[view][key] = el.value;
      const active = document.activeElement === el;
      const y = window.scrollY;
      router(); // re-render
      window.scrollTo(0, y); // keep position across keystroke re-renders
      if (active) {
        const again = app.querySelector(`[data-filter="${key}"]`);
        if (again) { again.focus(); if (again.setSelectionRange && again.value) { const n = again.value.length; again.setSelectionRange(n, n); } }
      }
    });
  });
  reopenMs();
}

// Re-open the multi-select popover that was open before a re-render.
function reopenMs() {
  if (!openMs) return;
  const ms = app.querySelector(`.ms[data-ms="${openMs}"]`);
  if (!ms) return;
  const pop = ms.querySelector(".ms-pop");
  const btn = ms.querySelector(".ms-btn");
  if (pop) pop.removeAttribute("hidden");
  if (btn) btn.setAttribute("aria-expanded", "true");
}

// After navigating to a feed page via a dashboard headline, scroll to and
// briefly highlight the targeted item.
function applyPendingFocus(view) {
  if (!pendingFocus || pendingFocus.view !== view) return;
  const el = document.getElementById("row-" + pendingFocus.id);
  pendingFocus = null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 2200);
}

// Click delegation: watchlist stars first, then row navigation.
app.addEventListener("click", (e) => {
  const fb = e.target.closest("[data-follow]");
  if (fb) {
    e.stopPropagation();
    const [type, id] = fb.getAttribute("data-follow").split(":");
    const y = window.scrollY;
    toggleFollow(type, id);
    router();
    window.scrollTo(0, y); // keep position; don't jump to top on a star toggle
    return;
  }
  // Multi-select dropdown: toggle its popover.
  const msBtn = e.target.closest(".ms-btn");
  if (msBtn) {
    e.stopPropagation();
    const ms = msBtn.closest(".ms");
    const pop = ms.querySelector(".ms-pop");
    const willOpen = pop.hasAttribute("hidden");
    app.querySelectorAll(".ms-pop").forEach((p) => p.setAttribute("hidden", ""));
    app.querySelectorAll(".ms-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
    if (willOpen) { pop.removeAttribute("hidden"); msBtn.setAttribute("aria-expanded", "true"); openMs = ms.getAttribute("data-ms"); }
    else { openMs = null; }
    return;
  }
  // Keep clicks inside an open popover from bubbling to row/navigation handlers.
  if (e.target.closest(".ms-pop")) { e.stopPropagation(); return; }
  // Dashboard headline → open the item on its feed page.
  const goto = e.target.closest("[data-goto]");
  if (goto) {
    const [view, id] = goto.getAttribute("data-goto").split(":");
    pendingFocus = { view, id };
    // the anchor's href (#/deals or #/intel) changes the hash and triggers router
    return;
  }
  const clear = e.target.closest("[data-clearfilter]");
  if (clear) {
    e.stopPropagation();
    const key = clear.getAttribute("data-clearfilter");
    if (filterState.funds && key in filterState.funds) filterState.funds[key] = "";
    router();
    return;
  }
  const sortcol = e.target.closest("[data-sortcol]");
  if (sortcol) {
    e.stopPropagation();
    const [view, key] = sortcol.getAttribute("data-sortcol").split(":");
    const s = filterState[view].sort;
    if (s.key === key) s.dir = s.dir === "asc" ? "desc" : "asc";
    else { s.key = key; s.dir = "asc"; }
    router();
    return;
  }
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    const route = jump.getAttribute("data-jump");
    const arr = (v) => (v ? [v] : []);
    if (route === "funds") {
      filterState.funds = {
        q: "",
        strategy: arr(jump.getAttribute("data-strategy")),
        status: arr(jump.getAttribute("data-status")),
        geo: arr(jump.getAttribute("data-geo")),
        period: jump.getAttribute("data-period") || "",
        sort: filterState.funds.sort || { key: "name", dir: "asc" },
      };
    } else if (route === "deals") {
      const period = jump.getAttribute("data-period");
      // A quarter click (carries data-period) just sets the quarter, preserving
      // the user's other deal filters; a type jump (dashboard donut) resets them.
      if (period) filterState.deals = { ...filterState.deals, period };
      else filterState.deals = { q: "", type: arr(jump.getAttribute("data-dtype")), year: [], period: "" };
    } else if (route === "intel") {
      filterState.intel = { q: "", type: arr(jump.getAttribute("data-itype")), year: [] };
    } else if (route === "clos") {
      const period = jump.getAttribute("data-period");
      if (period) filterState.clos = { ...filterState.clos, period };
    }
    // Navigating changes the hash (→ router via hashchange); when we're already
    // on the target page the hash doesn't change, so re-render explicitly.
    const target = "#/" + route;
    if (location.hash === target) router();
    else location.hash = target;
    return;
  }
  const row = e.target.closest("[data-href]");
  if (row && !e.target.closest("a")) location.hash = row.getAttribute("data-href");
});

// Keyboard activation for sortable column headers (Enter / Space).
app.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const sortcol = e.target.closest("[data-sortcol]");
  if (!sortcol) return;
  e.preventDefault();
  sortcol.click();
});

// Multi-select: a checkbox toggle updates the filter array and re-renders,
// keeping its popover open.
app.addEventListener("change", (e) => {
  const cb = e.target.closest(".ms-pop input[type=checkbox]");
  if (!cb) return;
  const ms = cb.closest(".ms");
  const [view, key] = ms.getAttribute("data-ms").split(":");
  filterState[view][key] = [...ms.querySelectorAll("input[type=checkbox]:checked")].map((i) => i.value);
  openMs = ms.getAttribute("data-ms");
  const y = window.scrollY;
  router();
  window.scrollTo(0, y); // keep position; the filter sits below the charts
});

// Click anywhere outside an open multi-select closes its popover.
document.addEventListener("click", (e) => {
  if (e.target.closest(".ms")) return;
  if (!openMs) return;
  app.querySelectorAll(".ms-pop").forEach((p) => p.setAttribute("hidden", ""));
  app.querySelectorAll(".ms-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  openMs = null;
});

// ================================= router ==================================
function router() {
  const hash = location.hash || "#/";
  const [, route, arg] = hash.split("/");
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `#/${route}` || (route === "" && a.getAttribute("href") === "#/"));
  });
  const wl = document.getElementById("wl-count");
  if (wl) { const n = followCount(); wl.textContent = n ? n : ""; wl.style.display = n ? "" : "none"; }
  window.scrollTo(0, 0);
  switch (route) {
    case "": case undefined: return viewDashboard();
    case "funds": return viewFunds();
    case "fund": return viewFund(arg);
    case "managers": return viewManagers();
    case "manager": return viewManager(arg);
    case "lps": return viewLps();
    case "lp": return viewLp(arg);
    case "news": return viewNews();
    case "intel": return viewIntel();
    case "deals": return viewDeals();
    case "clos": return viewClos();
    case "watchlist": return viewWatchlist();
    default: return notFound();
  }
}

// ---- Swipe to cycle through the primary sections (touch devices) -----------
// A horizontal swipe moves to the next/previous top-level section in nav order
// (wrapping around). Ignored on detail pages and when the gesture starts on an
// interactive control (slider, input, dropdown, link, chart, table) or a screen
// edge (reserved for the browser's back/forward gesture).
const SWIPE_SECTIONS = ["#/", "#/news", "#/deals", "#/intel", "#/clos", "#/managers", "#/funds", "#/lps", "#/watchlist"];
const SWIPE_IGNORE = "input, textarea, select, button, a, .range-slider, .ms, .ms-pop, .table-wrap, .data-table, svg, .donut-wrap, .chart";
let swX = 0, swY = 0, swT = 0, swSkip = true;
document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) { swSkip = true; return; }
  const x = e.touches[0].clientX;
  swSkip = x < 24 || x > window.innerWidth - 24 || !!(e.target.closest && e.target.closest(SWIPE_IGNORE));
  swX = x; swY = e.touches[0].clientY; swT = Date.now();
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (swSkip) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swX, dy = t.clientY - swY;
  if (Date.now() - swT > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
  const cur = location.hash || "#/";
  let i = SWIPE_SECTIONS.indexOf(cur);
  if (i < 0) i = SWIPE_SECTIONS.indexOf(cur.split("?")[0]);
  if (i < 0) return; // not on a primary section (e.g. a manager/fund detail page)
  const n = SWIPE_SECTIONS.length;
  location.hash = SWIPE_SECTIONS[dx < 0 ? (i + 1) % n : (i - 1 + n) % n];
}, { passive: true });

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
router();
renderDataStatus();
renderNotifications();
initWatchlistSync();
