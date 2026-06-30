// =============================================================================
// Meridian Legal — hash-based router + all views. Renders each view by building an
// HTML string and assigning it to #app.innerHTML. Zero dependencies.
//
// Routes:  #/                dashboard
//          #/list            all updates (multi-select filters + search)
//          #/list?area=…     list pre-filtered (also ?saved=1, ?q=…, ?tier=…)
//          #/item/<id>       single alert detail
//
// Per-user state: saved items sync across devices via the /api/saved Worker/KV
// endpoint when behind Cloudflare Access (see the "Saved state" block below),
// with localStorage as an instant cache / offline fallback. The last-visit and
// notification-seen markers stay device-local in localStorage.
// =============================================================================

import {
  items, cases, caseSummaries, practiceAreas, firms, tiers, updateTypes, restructurings,
  firmById, areaById, typeById, tierById, LAST_REVIEWED, LAST_CHECKED, LAST_CHECKED_TIME,
} from "./data.js?v=20260630-2";
import { donutChart, columnChart } from "./charts.js?v=20260630-2";

const app = document.getElementById("app");

// ---- Small helpers ----------------------------------------------------------
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return esc(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; // day-month-year
}
function ym(iso) { return iso.slice(0, 7); } // "2025-03"
// Alert date for display: prefix "≈" when the date is an approximation pending
// source verification (dateEstimated), or "undated" when we have no date yet.
function itemDate(it) {
  if (!it.date) return "undated";
  return (it.dateEstimated ? "≈ " : "") + fmtDate(it.date);
}

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

// Group rows into year sections with a year heading (like Meridian Credit).
function byYear(list, rowFn) {
  const groups = {};
  [...list].sort(byDateDesc).forEach((x) => {
    const y = (x.date || "").slice(0, 4) || "Undated";
    (groups[y] ||= []).push(x);
  });
  return Object.keys(groups)
    .sort((a, b) => (a === "Undated") - (b === "Undated") || b.localeCompare(a))
    .map((y) => `<div class="year-group"><h3 class="year-head">${esc(y)}</h3>${groups[y].map(rowFn).join("")}</div>`)
    .join("");
}

// ---- Feed pagination --------------------------------------------------------
// Long feeds render the first PAGE items with a "Load more" button that reveals
// the next PAGE. The shown count resets to PAGE whenever the filter signature
// for that feed changes (so a new search/filter starts from the top again).
const PAGE = 25;
const pageShown = {};
const pageSig = {};
function pageReset(key, sig) { if (pageSig[key] !== sig) { pageSig[key] = sig; pageShown[key] = PAGE; } }
function pageCount(key) { return pageShown[key] || PAGE; }
function loadMoreBtn(key, remaining) {
  if (remaining <= 0) return "";
  return `<div class="load-more-wrap"><button type="button" class="load-more" data-more="${esc(key)}">Load ${Math.min(PAGE, remaining)} more <span class="lm-rem">· ${remaining} remaining</span></button></div>`;
}
function feedHtml(rows, key, rowFn, sig) {
  pageReset(key, sig);
  const shown = rows.slice(0, pageCount(key));
  return byYear(shown, rowFn) + loadMoreBtn(key, rows.length - shown.length);
}
// "Load more" reveals the next page and re-renders the affected list in place
// (a local re-render, so the sidebar filters keep their selected state).
document.addEventListener("click", (e) => {
  const b = e.target.closest(".load-more");
  if (!b) return;
  const key = b.getAttribute("data-more");
  pageShown[key] = pageCount(key) + PAGE;
  const y = window.scrollY;
  if (key === "alerts") renderResults();
  else if (key === "cases") renderCaseResults();
  else if (key === "rx") renderRxResults();
  window.scrollTo(0, y);
});

// ---- Saved state (localStorage + cloud sync) --------------------------------
// Saved items persist to a per-user Cloudflare KV store (via the /api/saved
// endpoint) when the site is served behind Cloudflare Access, so saved alerts,
// cases and restructuring matters sync across the user's devices. localStorage
// is kept as an instant cache / offline fallback, so the app still works if the
// API isn't reachable (e.g. plain static hosting or local preview).
const SAVED_KEY = "lexalert.saved";
const SAVED_API = "/api/saved";
const VISIT_KEY = "lexalert.lastVisit";
let savedCloud = false;        // true once the saved-items API responds
let savedPushTimer = null;

function getSaved() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); }
  catch { return new Set(); }
}
function setSaved(set) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
  updateSavedCount();
  pushSavedRemote();
}
// Debounced save to the cloud (no-op when not signed in / not on Cloudflare).
function pushSavedRemote() {
  if (!savedCloud) return;
  clearTimeout(savedPushTimer);
  savedPushTimer = setTimeout(() => {
    fetch(SAVED_API, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ saved: [...getSaved()] }),
    }).catch(() => {});
  }, 400);
}
function toggleSaved(id) {
  const s = getSaved();
  s.has(id) ? s.delete(id) : s.add(id);
  setSaved(s);
  return s.has(id);
}
function updateSavedCount() {
  const n = getSaved().size;
  const el = document.getElementById("saved-count");
  if (el) el.textContent = n ? String(n) : "";
}
// On load, reconcile this device's saved set with the per-user cloud copy. We
// UNION the two (saving is additive, so we never want to drop an item saved on
// another device or on this one), persist the merged set locally, and push it
// back up so every device converges. No-op when the API isn't reachable.
async function initSavedSync() {
  let r;
  try { r = await fetch(SAVED_API, { headers: { accept: "application/json" } }); }
  catch { return; }            // offline / not on Cloudflare → localStorage only
  if (!r || !r.ok) return;     // 404 on static hosting, 401 if not authed
  let d; try { d = await r.json(); } catch { return; }
  savedCloud = true;
  const server = Array.isArray(d.saved) ? d.saved : [];
  const local = [...getSaved()];
  const union = new Set([...local, ...server]);
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...union])); } catch { /* ignore */ }
  updateSavedCount();
  // Push only if the merged set differs from what the server already holds.
  if (union.size !== server.length || server.some((id) => !union.has(id))) pushSavedRemote();
  router();                    // re-render so saved stars / Saved view reflect the merge
}

// "New since last visit" — alerts dated after the previous visit timestamp.
function lastVisit() { return localStorage.getItem(VISIT_KEY) || ""; }
function markVisitedSoon() {
  // Record *today* as the visit marker after a short delay so the current
  // session still sees this run's "new" highlights.
  setTimeout(() => { try { localStorage.setItem(VISIT_KEY, new Date().toISOString().slice(0, 10)); } catch {} }, 1500);
}
const prevVisit = lastVisit();
function isNew(item) { return prevVisit && item.date > prevVisit; }

// ---- Shared rendering bits --------------------------------------------------
function areaChip(areaId) {
  const a = areaById[areaId];
  if (!a) return "";
  return `<span class="chip area" style="--c:${a.color}">${esc(a.short)}</span>`;
}
function tierLabel(tierId) { return (tierById[tierId] || {}).name || tierId; }

// Collapsible (folded) multi-select filter group — a disclosure dropdown with the
// same checkboxes inside, to save sidebar space. `selected` is the array of
// currently-selected ids; the group auto-opens when something is selected and
// shows a live count badge. Used by both the alerts and case-law sidebars.
function foldGroup(legend, name, opts, selected) {
  const sel = selected || [];
  return `
    <details class="filter-group filter-fold"${sel.length ? " open" : ""}>
      <summary>${esc(legend)}${sel.length ? ` <span class="fg-badge">${sel.length}</span>` : ""}</summary>
      <div class="fold-body">
        ${opts.map((o) => `
          <label class="check">
            <input type="checkbox" name="${name}" value="${esc(o.id)}" ${sel.includes(o.id) ? "checked" : ""}/>
            <span>${esc(o.name)}</span>
          </label>`).join("")}
      </div>
    </details>`;
}
// Keep a folded group's summary count badge in sync with its checkboxes.
function refreshFoldBadge(cb) {
  const details = cb.closest("details.filter-fold");
  if (!details) return;
  const summary = details.querySelector("summary");
  const count = details.querySelectorAll('input[type="checkbox"]:checked').length;
  let badge = summary.querySelector(".fg-badge");
  if (count) {
    if (!badge) { badge = document.createElement("span"); badge.className = "fg-badge"; summary.appendChild(badge); }
    badge.textContent = count;
  } else if (badge) { badge.remove(); }
}

// A firm-alert as a list row — Meridian Credit style: colored chip + date in the
// meta column, bold headline, full muted summary, then a single muted footer line.
function itemRow(it) {
  const firm = firmById[it.firm] || { name: it.firm, tier: "" };
  const type = (typeById[it.type] || {}).name || it.type;
  const saved = getSaved().has(it.id);
  const areasHtml = (it.areas || [it.area]).map(areaChip).join("");
  const tierTxt = tierLabel(firm.tier);
  const src = it.url || firm.insightsUrl;
  return `<div class="feed-row" id="row-${esc(it.id)}">
    <div class="feed-meta">
      <div class="chips">${areasHtml}</div>
      <span class="feed-date">${itemDate(it)}</span>
    </div>
    <div class="feed-body">
      <a class="feed-title" href="#/item/${esc(it.id)}">${esc(it.title)}</a>
      <p class="feed-summary">${esc(it.summary)}</p>
      <div class="feed-foot">
        <span>${esc(type)}</span> · <span class="firm">${esc(firm.name)}</span>${tierTxt ? ` · ${esc(tierTxt)}` : ""}${it.citation ? ` · <span class="cite">${esc(it.citation)}</span>` : ""}${src ? ` · <a href="${esc(src)}" target="_blank" rel="noopener noreferrer">source ↗</a>` : ""}${isNew(it) ? ' · <span class="chip new">New</span>' : ""}
        <button class="save-btn ${saved ? "is-saved" : ""}" data-save="${esc(it.id)}"
          aria-pressed="${saved}" title="${saved ? "Remove from saved" : "Save this update"}">${saved ? "★ Saved" : "☆ Save"}</button>
      </div>
    </div>
  </div>`;
}

// A BAILII judgment as a list row — same Credit-style layout, AI summary inline,
// linking out to bailii.org.
function caseRow(c) {
  const summary = caseSummaries[c.id] || c.summary || "";
  const saved = getSaved().has(c.id);
  return `<div class="feed-row" id="row-${esc(c.id)}">
    <div class="feed-meta">
      <div class="chips">${areaChip(c.area)}</div>
      <span class="feed-date">${fmtDate(c.date)}</span>
    </div>
    <div class="feed-body">
      <a class="feed-title" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)} ↗</a>
      <p class="feed-summary"><span class="ai-tag">✦ AI summary</span> ${esc(summary)}</p>
      <div class="feed-foot">
        <span>${esc(c.court)}</span> · <span class="cite">${esc(c.citation)}</span> · <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">View judgment on BAILII ↗</a>
        <button class="save-btn ${saved ? "is-saved" : ""}" data-save="${esc(c.id)}"
          aria-pressed="${saved}" title="${saved ? "Remove from saved" : "Save this case"}">${saved ? "★ Saved" : "☆ Save"}</button>
      </div>
    </div>
  </div>`;
}

// Compact dashboard rows — headline + "date · source" line, matching Meridian
// Credit's dashboard feeds.
function itemCompact(it) {
  const firm = firmById[it.firm] || { name: it.firm, insightsUrl: "" };
  const href = it.url || firm.insightsUrl; // prefer the item's own article link
  const src = href
    ? ` · <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="muted small">source ↗</a>` : "";
  return `<li class="compact-item">
    <a class="compact-head" href="#/item/${esc(it.id)}">${esc(it.title)}</a>
    <div class="compact-meta muted small">${itemDate(it)} · ${esc(firm.name)}${src}</div>
  </li>`;
}
function caseCompact(c) {
  return `<li class="compact-item">
    <a class="compact-head" href="#/cases?case=${esc(c.id)}">${esc(c.name)}</a>
    <div class="compact-meta muted small">${fmtDate(c.date)} · ${esc(c.court)} · ${esc(c.citation)}</div>
  </li>`;
}
function rxCompact(r) {
  const kind = r.type === "scheme" ? "Scheme" : "Plan";
  const meta = [r.date ? fmtDate(r.date) : "undated", kind, r.citation ? esc(r.citation) : ""].filter(Boolean).join(" · ");
  return `<li class="compact-item">
    <a class="compact-head" href="#/restructurings?m=${esc(r.id)}">${esc(r.company)}</a>
    <div class="compact-meta muted small">${meta}</div>
  </li>`;
}

// =============================================================================
// VIEW: Dashboard (#/)
// =============================================================================
function viewDashboard() {
  const thisYear = new Date().getFullYear();

  // Five practice-area tiles: number of alerts dated THIS YEAR, click → filtered list.
  const tiles = practiceAreas.map((a) => {
    const n = items.filter((i) => Number(i.date.slice(0, 4)) === thisYear
      && (i.areas || [i.area]).includes(a.id)).length;
    return `<a class="kpi kpi-link" href="#/list?area=${a.id}" style="--c:${a.color}"
      aria-label="${esc(a.name)}: ${n} alerts in ${thisYear}">
      <span class="kpi-num">${n}</span>
      <span class="kpi-label">${esc(a.name)}</span>
      <span class="kpi-sub">alerts in ${thisYear}</span>
    </a>`;
  }).join("");

  // Dashboard lists: law-firm alerts, recent BAILII cases, and schemes/RPs.
  const firmList = [...items].sort(byDateDesc).slice(0, 10).map(itemCompact).join("");
  const caseListHtml = [...cases].sort(byDateDesc).slice(0, 10).map(caseCompact).join("");
  const rxListHtml = [...restructurings].sort(byDateDesc).slice(0, 10).map(rxCompact).join("");

  // Supporting charts: by source tier + by month.
  const tierData = tiers.map((t) => ({
    label: t.name,
    value: items.filter((i) => (firmById[i.firm] || {}).tier === t.id).length,
    nav: { tier: t.id },
  }));
  const months = [...new Set(items.map((i) => ym(i.date)).filter(Boolean))].sort().slice(-8);
  const monthData = months.map((m) => ({
    label: MONTHS[Number(m.slice(5, 7)) - 1] + " " + m.slice(2, 4),
    value: items.filter((i) => ym(i.date) === m).length,
    nav: { month: m },
  }));

  app.innerHTML = `
    <section class="page-head">
      <h1>Legal Intelligence</h1>
      <p class="muted">English-law updates curated from UK Magic Circle, Silver Circle and US-elite London firms, plus recent BAILII judgments</p>
    </section>

    <section class="kpis kpis-5" aria-label="Alerts this year by practice area">${tiles}</section>

    <div class="grid-3">
      <section class="card feature-card">
        <h2>Law-firm alerts</h2>
        <p class="muted small">Latest legal updates &amp; client alerts from UK Magic Circle, Silver Circle and US-elite London firms. Click a headline to open it.</p>
        <ul class="compact-list">${firmList}</ul>
        <div class="card-foot"><a href="#/list">View all alerts →</a></div>
      </section>
      <section class="card feature-card">
        <h2>Recent cases on BAILII</h2>
        <p class="muted small">Latest English-law judgments, linked to bailii.org.</p>
        <ul class="compact-list">${caseListHtml}</ul>
        <div class="card-foot"><a href="#/cases">View all case law →</a></div>
      </section>
      <section class="card feature-card">
        <h2>Schemes &amp; RPs</h2>
        <p class="muted small">Latest restructuring plans &amp; schemes of arrangement before the English court. Click a matter to open it.</p>
        <ul class="compact-list">${rxListHtml}</ul>
        <div class="card-foot"><a href="#/restructurings">View all schemes &amp; RPs →</a></div>
      </section>
    </div>

    <div class="grid-2">
      <section class="card"><h2>Alerts by source tier</h2><p class="muted small">Click a tier to see its alerts.</p>${donutChart(tierData, { size: 200 })}</section>
      <section class="card"><h2>Publishing activity by month</h2><p class="muted small">Click a month to see that month's alerts.</p>${columnChart(monthData, { width: 720, height: 200 })}</section>
    </div>

    <p class="reviewed">Data last reviewed ${fmtDate(LAST_REVIEWED)}.</p>
  `;
}

// =============================================================================
// VIEW: List (#/list) — multi-select filters + search
// =============================================================================
const filterState = { areas: [], tiers: [], types: [], firms: [], years: [], months: [], q: "", saved: false };

function parseHashQuery() {
  const h = location.hash.slice(1); // "/list?area=banking"
  const qi = h.indexOf("?");
  const out = {};
  if (qi >= 0) {
    new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { out[k] = v; });
  }
  return out;
}

function viewList() {
  // Seed filter state from the hash query (shareable deep links).
  const q = parseHashQuery();
  filterState.areas = q.area ? [q.area] : [];
  filterState.tiers = q.tier ? [q.tier] : [];
  filterState.types = q.type ? [q.type] : [];
  filterState.firms = q.firm ? [q.firm] : [];
  filterState.years = q.year ? [q.year] : [];
  filterState.months = q.month ? [q.month] : [];
  filterState.q = q.q || "";
  filterState.saved = q.saved === "1";

  const years = [...new Set(items.map((i) => i.date.slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const monthOpts = [...new Set(items.map((i) => ym(i.date)).filter(Boolean))].sort((a, b) => b.localeCompare(a))
    .map((m) => ({ id: m, name: MONTHS[Number(m.slice(5, 7)) - 1] + " " + m.slice(0, 4) }));

  app.innerHTML = `
    <div class="list-head">
      <h1>${filterState.saved ? "Saved items" : "Legal alerts"}</h1>
      <p class="muted">Filter by practice area, source tier, type or firm, or search the full text.</p>
    </div>
    <div class="list-layout">
      <aside class="filters" aria-label="Filters">
        <div class="filters-top">
          <button id="clear-filters" class="link-btn" type="button">Clear all</button>
        </div>
        ${foldGroup("Practice area", "areas", practiceAreas.map((a) => ({ id: a.id, name: a.name })), filterState.areas)}
        ${foldGroup("Year", "years", years.map((y) => ({ id: y, name: y })), filterState.years)}
        ${foldGroup("Month", "months", monthOpts, filterState.months)}
        ${foldGroup("Source tier", "tiers", tiers, filterState.tiers)}
        ${foldGroup("Type", "types", updateTypes, filterState.types)}
        ${foldGroup("Firm", "firms", firms.map((f) => ({ id: f.id, name: f.name })), filterState.firms)}
      </aside>
      <section class="results-wrap">
        <div class="searchbar">
          <input id="search" type="search" placeholder="Search updates, cases, tags…"
            value="${esc(filterState.q)}" aria-label="Search updates" autocomplete="off"/>
        </div>
        <div id="result-count" class="result-count" aria-live="polite"></div>
        <section class="card"><div id="results" class="feed"></div></section>
      </section>
    </div>
  `;

  // Wire up listeners (panel rendered once; only #results re-renders).
  app.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const name = cb.name;
      filterState[name] = [...app.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => x.value);
      refreshFoldBadge(cb);
      renderResults();
    });
  });
  const search = app.querySelector("#search");
  search.addEventListener("input", () => { filterState.q = search.value; renderResults(); });
  app.querySelector("#clear-filters").addEventListener("click", () => {
    // Clear the facet filters only — keep the "Saved" scope so Clear all doesn't
    // bounce the user out of the saved list back to all alerts.
    filterState.areas = []; filterState.tiers = []; filterState.types = []; filterState.firms = [];
    filterState.years = []; filterState.months = []; filterState.q = "";
    app.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
    app.querySelectorAll(".fg-badge").forEach((b) => b.remove());
    search.value = "";
    renderResults();
  });

  renderResults();
}

function matchesFilters(it) {
  const itAreas = it.areas || [it.area];
  if (filterState.areas.length && !filterState.areas.some((a) => itAreas.includes(a))) return false;
  if (filterState.tiers.length && !filterState.tiers.includes((firmById[it.firm] || {}).tier)) return false;
  if (filterState.types.length && !filterState.types.includes(it.type)) return false;
  if (filterState.firms.length && !filterState.firms.includes(it.firm)) return false;
  if (filterState.years.length && !filterState.years.includes(it.date.slice(0, 4))) return false;
  if (filterState.months.length && !filterState.months.includes(ym(it.date))) return false;
  if (filterState.saved && !getSaved().has(it.id)) return false;
  if (filterState.q.trim()) {
    const q = filterState.q.trim().toLowerCase();
    const hay = [it.title, it.summary, it.citation, it.court, (it.tags || []).join(" "),
      (firmById[it.firm] || {}).name].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

// Does a case pass the sidebar filters? Cases share area / year / month / search;
// the alert-only facets (tier/type/firm) exclude cases when active.
function caseMatchesFilters(c) {
  if (filterState.areas.length && !filterState.areas.includes(c.area)) return false;
  if (filterState.tiers.length || filterState.types.length || filterState.firms.length) return false;
  if (filterState.years.length && !filterState.years.includes(c.date.slice(0, 4))) return false;
  if (filterState.months.length && !filterState.months.includes(ym(c.date))) return false;
  if (filterState.q.trim()) {
    const q = filterState.q.trim().toLowerCase();
    const hay = [c.name, c.citation, c.court, caseSummaries[c.id] || c.summary].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

// Does a restructuring matter pass the sidebar filters? Schemes/RPs have no
// practice area / tier / type / firm, so they're hidden when those facets are
// active (like cases); they do share year / month / search.
function rxMatchesFilters(r) {
  if (filterState.areas.length || filterState.tiers.length || filterState.types.length || filterState.firms.length) return false;
  const yr = (r.date || "").slice(0, 4);
  if (filterState.years.length && !filterState.years.includes(yr)) return false;
  if (filterState.months.length && !filterState.months.includes((r.date || "").slice(0, 7))) return false;
  if (filterState.q.trim()) {
    const q = filterState.q.trim().toLowerCase();
    const hay = [r.company, r.citation, r.court, r.sector, (r.creditors || []).join(" "), (r.advisers || []).join(" ")].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderResults() {
  const results = document.getElementById("results");
  const countEl = document.getElementById("result-count");
  if (!results) return;
  let rows = items.filter(matchesFilters).map((it) => ({ ...it, _kind: "item" }));
  // In the "Saved" view, also surface saved case-law judgments and saved
  // restructuring matters (schemes/RPs) alongside saved alerts.
  if (filterState.saved) {
    const savedSet = getSaved();
    rows = rows.concat(cases.filter((c) => savedSet.has(c.id) && caseMatchesFilters(c)).map((c) => ({ ...c, _kind: "case" })));
    rows = rows.concat(restructurings.filter((r) => savedSet.has(r.id) && rxMatchesFilters(r)).map((r) => ({ ...r, _kind: "rx" })));
  }
  rows.sort(byDateDesc);
  const n = rows.length;
  const noun = filterState.saved ? "saved item" : "update";
  countEl.textContent = `${n} ${noun}${n === 1 ? "" : "s"}`;
  const sig = JSON.stringify([filterState.areas, filterState.tiers, filterState.types, filterState.firms, filterState.years, filterState.months, filterState.q, filterState.saved]);
  results.innerHTML = n
    ? feedHtml(rows, "alerts", (x) => (x._kind === "case" ? caseRow(x) : x._kind === "rx" ? rxRow(x) : itemRow(x)), sig)
    : `<div class="empty">No ${noun}s match these filters.${filterState.saved ? " Save items with the ☆ button." : ""}</div>`;
}

// =============================================================================
// VIEW: Case law (#/cases) — all BAILII cases with AI-generated summaries
// =============================================================================
const caseFilter = { areas: [], courts: [], years: [], q: "" };

// Courts present in the data, in a sensible hierarchy order.
const COURT_ORDER = ["Supreme Court", "Court of Appeal", "High Court (Ch)", "High Court (Comm)", "High Court (KB)", "High Court (QB)"];

function viewCases() {
  // Seed from the hash query (shareable deep links, e.g. #/cases?area=ri).
  const q = parseHashQuery();
  caseFilter.areas = q.area ? [q.area] : [];
  caseFilter.courts = [];
  caseFilter.years = q.year ? [q.year] : [];
  caseFilter.q = q.q || "";

  const courts = COURT_ORDER.filter((ct) => cases.some((c) => c.court === ct));
  const years = [...new Set(cases.map((c) => c.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));

  app.innerHTML = `
    <div class="list-head">
      <h1>Case law</h1>
      <p class="muted">English-law judgments from the Supreme Court, Court of Appeal (Civil Division) and the
        High Court (Chancery, Commercial &amp; King's/Queen's Bench).</p>
    </div>
    <div class="list-layout">
      <aside class="filters" aria-label="Filters">
        <div class="filters-top">
          <button id="clear-filters" class="link-btn" type="button">Clear all</button>
        </div>
        ${foldGroup("Practice area", "areas", practiceAreas.map((a) => ({ id: a.id, name: a.name })), caseFilter.areas)}
        ${foldGroup("Year", "years", years.map((y) => ({ id: y, name: y })), caseFilter.years)}
        ${foldGroup("Court", "courts", courts.map((ct) => ({ id: ct, name: ct })), caseFilter.courts)}
      </aside>
      <section class="results-wrap">
        <div class="searchbar">
          <input id="case-search" type="search" placeholder="Search cases, citations…"
            value="${esc(caseFilter.q)}" aria-label="Search case law" autocomplete="off"/>
        </div>
        <div id="case-count" class="result-count" aria-live="polite"></div>
        <section class="card"><div id="case-results" class="feed"></div></section>
      </section>
    </div>
  `;

  app.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    cb.addEventListener("change", () => {
      caseFilter[cb.name] = [...app.querySelectorAll(`input[name="${cb.name}"]:checked`)].map((x) => x.value);
      refreshFoldBadge(cb);
      renderCaseResults();
    });
  });
  const search = app.querySelector("#case-search");
  search.addEventListener("input", () => { caseFilter.q = search.value; renderCaseResults(); });
  app.querySelector("#clear-filters").addEventListener("click", () => {
    caseFilter.areas = []; caseFilter.courts = []; caseFilter.years = []; caseFilter.q = "";
    app.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
    app.querySelectorAll(".fg-badge").forEach((b) => b.remove());
    search.value = "";
    renderCaseResults();
  });

  renderCaseResults();

  // Deep-link from the dashboard "Recent cases" list: scroll to & flash the case.
  const focusId = parseHashQuery().case;
  if (focusId) {
    const el = document.getElementById("row-" + focusId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 2200);
    }
  }
}

function renderCaseResults() {
  const el = document.getElementById("case-results");
  const countEl = document.getElementById("case-count");
  if (!el) return;
  const matched = cases.filter((c) => {
    if (caseFilter.areas.length && !caseFilter.areas.includes(c.area)) return false;
    if (caseFilter.courts.length && !caseFilter.courts.includes(c.court)) return false;
    if (caseFilter.years.length && !caseFilter.years.includes(c.date.slice(0, 4))) return false;
    if (caseFilter.q.trim()) {
      const hay = [c.name, c.citation, c.court, caseSummaries[c.id] || c.summary].join(" ").toLowerCase();
      if (!hay.includes(caseFilter.q.trim().toLowerCase())) return false;
    }
    return true;
  }).sort(byDateDesc);
  countEl.textContent = `${matched.length} case${matched.length === 1 ? "" : "s"}`;
  el.innerHTML = matched.length ? feedHtml(matched, "cases", caseRow, JSON.stringify(caseFilter)) : `<div class="empty">No cases match these filters.</div>`;
}

// =============================================================================
// VIEW: Detail (#/item/<id>)
// =============================================================================
function viewItem(id) {
  const it = items.find((x) => x.id === id);
  if (!it) {
    app.innerHTML = `<div class="empty">Update not found. <a href="#/list">Back to all updates</a></div>`;
    return;
  }
  const firm = firmById[it.firm] || { name: it.firm, tier: "", insightsUrl: "#" };
  const type = (typeById[it.type] || {}).name || it.type;
  const saved = getSaved().has(it.id);
  const areasHtml = (it.areas || [it.area]).map(areaChip).join(" ");
  const tagsHtml = (it.tags || []).map((t) =>
    `<a class="tag" href="#/list?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(" ");
  const pointsHtml = (it.points || []).map((p) => `<li>${esc(p)}</li>`).join("");

  // Related: same primary area, different item, newest first.
  const related = items
    .filter((x) => x.id !== it.id && (x.areas || [x.area]).some((a) => (it.areas || [it.area]).includes(a)))
    .sort(byDateDesc).slice(0, 4).map(itemRow).join("");

  app.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="#/">Dashboard</a> ›
      <a href="#/list?area=${esc(it.area)}">${esc(areaById[it.area] ? areaById[it.area].name : it.area)}</a> ›
      <span aria-current="page">Update</span>
    </nav>

    <article class="detail">
      <div class="detail-chips">${areasHtml} <span class="chip type">${esc(type)}</span>${isNew(it) ? '<span class="chip new">New</span>' : ""}</div>
      <h1>${esc(it.title)}</h1>
      <div class="detail-meta">
        <span class="firm-big tier-${esc(firm.tier)}">${esc(firm.name)}</span>
        <span class="tier tier-${esc(firm.tier)}">${esc(tierLabel(firm.tier))}</span>
        <time datetime="${esc(it.date)}">${itemDate(it)}</time>
        ${it.jurisdiction ? `<span class="juris">${esc(it.jurisdiction)}</span>` : ""}
      </div>

      ${(it.court || it.citation) ? `<div class="case-bar">
        ${it.court ? `<span><span class="lbl">Court</span> ${esc(it.court)}</span>` : ""}
        ${it.citation ? `<span><span class="lbl">Citation</span> ${esc(it.citation)}</span>` : ""}
      </div>` : ""}

      <button class="save-btn big ${saved ? "is-saved" : ""}" data-save="${esc(it.id)}"
        aria-pressed="${saved}">${saved ? "★ Saved" : "☆ Save this update"}</button>

      <h2>Summary</h2>
      <p class="detail-summary">${esc(it.summary)}</p>

      ${pointsHtml ? `<h2>Key points</h2><ul class="points">${pointsHtml}</ul>` : ""}

      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}

      <div class="source-box">
        <span class="lbl">Source</span>
        <a href="${esc(it.url || firm.insightsUrl)}" target="_blank" rel="noopener noreferrer">
          ${esc(firm.name)} — ${it.url ? "read the article" : "insights / know-how"} ↗</a>
        <p class="source-note">${it.url
          ? "Links to the cited publication."
          : "Links to the firm's public landing page."} This summary is written for
          this prototype and is not legal advice — confirm against the firm's actual publication.</p>
      </div>
    </article>

    ${related ? `<section class="related">
      <h2 class="section-head">Related updates</h2>
      <div class="feed">${related}</div>
    </section>` : ""}
  `;
}

// =============================================================================
// =============================================================================
// VIEW: Plans & Schemes (#/restructurings) — Part 26A restructuring plans and
// distressed Part 26 schemes of arrangement since 2020, with an All / Plans /
// Schemes type filter (plus search, outcome and year).
// =============================================================================
const rxFilter = { type: "all", q: "", years: [], outcomes: [] };

function rxTypeLabel(t) { return t === "scheme" ? "Scheme (Pt 26)" : "Plan (Pt 26A)"; }
function rxOutcomeClass(o) {
  const t = (o || "").toLowerCase();
  if (t.includes("refus") || t.includes("overturn") || (t.includes("appeal") && t.includes("allow"))) return "neg";
  if (t.includes("upheld") || t.includes("dismiss")) return "pos";
  if (t.includes("conven") || t.includes("withdraw")) return "neu";
  return "pos";
}

function rxOutcomeShort(o) {
  const t = (o || "").toLowerCase();
  if (t.includes("overturn") || (t.includes("appeal") && t.includes("allow"))) return "Overturned on appeal";
  if (t.includes("upheld") || (t.includes("appeal") && t.includes("dismiss"))) return "Upheld on appeal";
  if (t.includes("refus")) return "Refused";
  if (t.includes("conven")) return "Convening";
  if (t.includes("withdraw")) return "Withdrawn";
  return "Sanctioned";
}

// A restructuring matter as a feed row — same layout as the alerts/case-law
// feeds: type chip + date in the meta column, company title (linking to the
// judgment), key detail lines, and a muted footer with the citation and links.
function rxRow(r) {
  const firm = r.firm ? (firmById[r.firm] || { name: r.firm }) : null;
  const saved = getSaved().has(r.id);
  const typeFull = r.type === "scheme" ? "Part 26 scheme of arrangement" : "Part 26A restructuring plan";
  const features = (r.features || []).length
    ? `<ul class="rx-features">${r.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "";
  const lines = [
    r.debt ? `<p class="feed-summary">${esc(r.debt)}</p>` : "",
    (r.creditors || []).length ? `<p class="rx-line"><span class="rx-lbl">Largest creditors</span> ${esc(r.creditors.join("; "))}</p>` : "",
    (r.advisers || []).length ? `<p class="rx-line"><span class="rx-lbl">Company advised by</span> ${esc(r.advisers.join(", "))}</p>` : "",
    features,
    r.notes ? `<p class="rx-line muted">${esc(r.notes)}</p>` : "",
  ].join("");
  const foot = [
    r.articleUrl ? `<a href="${esc(r.articleUrl)}" target="_blank" rel="noopener noreferrer">${esc(firm ? firm.name : "Firm")} analysis ↗</a>` : "",
    r.judgmentUrl ? `<a href="${esc(r.judgmentUrl)}" target="_blank" rel="noopener noreferrer">Judgment ↗</a>` : "",
  ].filter(Boolean).join(" · ");
  const compact = [r.court ? esc(r.court) : "", r.citation ? `<span class="cite">${esc(r.citation)}</span>` : "", r.sector ? esc(r.sector) : ""].filter(Boolean).join(" · ");
  // Collapsed by default — the COMPANY NAME (inside <summary>) is the expand/
  // collapse toggle. The Save button sits on the summary line (always visible);
  // clicking it saves without toggling (the global handler calls preventDefault).
  // Expanding reveals debt/creditors/advisers/features and the firm/judgment links.
  return `<div class="feed-row rx-row" id="row-${esc(r.id)}">
    <div class="feed-meta">
      <div class="chips"><span class="chip rx-type rx-${esc(r.type)}" title="${esc(typeFull)}">${r.type === "scheme" ? "Scheme" : "Plan"}</span></div>
      <span class="feed-date">${r.date ? esc(fmtDate(r.date)) : "undated"}</span>
    </div>
    <div class="feed-body">
      <details class="rx-det">
        <summary class="rx-summary">
          <span class="rx-title-line">
            <span class="feed-title rx-name">${esc(r.company)}</span>
            <span class="chip rx-out rx-out-${rxOutcomeClass(r.outcome)}" title="${esc(r.outcome)}">${esc(rxOutcomeShort(r.outcome))}</span>
            <button class="save-btn rx-save ${saved ? "is-saved" : ""}" data-save="${esc(r.id)}"
              aria-pressed="${saved}" title="${saved ? "Remove from saved" : "Save this matter"}">${saved ? "★ Saved" : "☆ Save"}</button>
          </span>
          ${compact ? `<span class="rx-compact">${compact}</span>` : ""}
        </summary>
        <div class="rx-expand">
          ${lines}
          ${foot ? `<div class="feed-foot">${foot}</div>` : ""}
        </div>
      </details>
    </div>
  </div>`;
}

function viewRestructurings() {
  const q = parseHashQuery();
  rxFilter.type = ["plan", "scheme"].includes(q.type) ? q.type : "all";
  rxFilter.q = q.q || "";
  rxFilter.years = [];
  rxFilter.outcomes = [];
  const years = [...new Set(restructurings.map((r) => (r.date || "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const outcomes = [...new Set(restructurings.map((r) => r.outcome))].sort();
  const seg = (val, label) => `<button type="button" class="seg-btn${rxFilter.type === val ? " active" : ""}" data-rxtype="${val}">${label}</button>`;

  app.innerHTML = `
    <div class="list-head">
      <h1>Schemes and RPs</h1>
      <p class="muted">English-law restructuring plans (Companies Act 2006 <strong>Part 26A</strong>) and
        distressed schemes of arrangement (<strong>Part 26</strong>) before the court since 2020 — company,
        debt, largest creditors, key features, the company's advisers, a tracked-firm analysis and the judgment.</p>
    </div>
    <div class="list-layout">
      <aside class="filters" aria-label="Filters">
        <div class="seg" role="group" aria-label="Type filter">
          ${seg("all", "All")}${seg("plan", "Plans")}${seg("scheme", "Schemes")}
        </div>
        ${foldGroup("Outcome", "outcomes", outcomes.map((o) => ({ id: o, name: o })), rxFilter.outcomes)}
        ${foldGroup("Year", "years", years.map((y) => ({ id: y, name: y })), rxFilter.years)}
      </aside>
      <section class="results-wrap">
        <div class="searchbar">
          <input id="rx-search" type="search" placeholder="Search company, citation, sector, creditor…"
            value="${esc(rxFilter.q)}" aria-label="Search plans and schemes" autocomplete="off"/>
        </div>
        <div class="rx-bar">
          <div id="rx-count" class="result-count" aria-live="polite"></div>
          <button type="button" class="link-btn" id="rx-toggle-all" aria-expanded="false">Expand all</button>
        </div>
        <section class="card"><div id="rx-results" class="feed"></div></section>
      </section>
    </div>`;

  app.querySelectorAll("[data-rxtype]").forEach((b) => b.addEventListener("click", () => {
    rxFilter.type = b.getAttribute("data-rxtype");
    app.querySelectorAll("[data-rxtype]").forEach((x) => x.classList.toggle("active", x === b));
    renderRxResults();
  }));
  app.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => cb.addEventListener("change", () => {
    rxFilter[cb.name] = [...app.querySelectorAll(`input[name="${cb.name}"]:checked`)].map((x) => x.value);
    refreshFoldBadge(cb);
    renderRxResults();
  }));
  const search = app.querySelector("#rx-search");
  search.addEventListener("input", () => { rxFilter.q = search.value; renderRxResults(); });
  app.querySelector("#rx-toggle-all").addEventListener("click", (e) => {
    const dets = app.querySelectorAll(".rx-det");
    const anyClosed = [...dets].some((d) => !d.open);
    dets.forEach((d) => { d.open = anyClosed; });
    e.currentTarget.textContent = anyClosed ? "Collapse all" : "Expand all";
    e.currentTarget.setAttribute("aria-expanded", String(anyClosed));
  });
  renderRxResults();

  // Deep-link from a notification: scroll to, expand & flash the matter.
  const focusId = q.m;
  if (focusId) {
    const el = document.getElementById("row-" + focusId);
    if (el) {
      const det = el.querySelector(".rx-det");
      if (det) det.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 2200);
    }
  }
}

function renderRxResults() {
  const el = document.getElementById("rx-results");
  const countEl = document.getElementById("rx-count");
  if (!el) return;
  const matched = restructurings.filter((r) => {
    if (rxFilter.type !== "all" && r.type !== rxFilter.type) return false;
    if (rxFilter.years.length && !rxFilter.years.includes((r.date || "").slice(0, 4))) return false;
    if (rxFilter.outcomes.length && !rxFilter.outcomes.includes(r.outcome)) return false;
    if (rxFilter.q.trim()) {
      const hay = [r.company, r.citation, r.sector, r.debt, (r.creditors || []).join(" "),
        (r.advisers || []).join(" "), (r.features || []).join(" ")].join(" ").toLowerCase();
      if (!hay.includes(rxFilter.q.trim().toLowerCase())) return false;
    }
    return true;
  });
  const plans = matched.filter((r) => r.type === "plan").length;
  const schemes = matched.filter((r) => r.type === "scheme").length;
  countEl.textContent = `${matched.length} matter${matched.length !== 1 ? "s" : ""} · ${plans} plan${plans !== 1 ? "s" : ""}, ${schemes} scheme${schemes !== 1 ? "s" : ""}`;
  el.innerHTML = matched.length ? feedHtml(matched, "rx", rxRow, JSON.stringify(rxFilter)) : '<p class="empty">No matters match these filters.</p>';
  const allBtn = document.getElementById("rx-toggle-all");
  if (allBtn) { allBtn.textContent = "Expand all"; allBtn.setAttribute("aria-expanded", "false"); allBtn.style.display = matched.length ? "" : "none"; }
}

// =============================================================================
// Router + global click delegation
// =============================================================================
function router() {
  const hash = location.hash || "#/";
  const path = hash.slice(1).split("?")[0]; // strip query
  window.scrollTo(0, 0);

  if (path === "/" || path === "") viewDashboard();
  else if (path === "/list") viewList();
  else if (path === "/cases") viewCases();
  else if (path === "/restructurings") viewRestructurings();
  else if (path.startsWith("/item/")) viewItem(decodeURIComponent(path.slice("/item/".length)));
  else viewDashboard();

  updateSavedCount();
  syncNavActive(hash);
}

function syncNavActive(hash) {
  document.querySelectorAll(".mainnav .nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === hash);
  });
}

// Delegate: save buttons + chart drill-down (data-area / data-tier).
document.addEventListener("click", (e) => {
  const saveBtn = e.target.closest("[data-save]");
  if (saveBtn) {
    e.preventDefault();
    const id = saveBtn.getAttribute("data-save");
    const nowSaved = toggleSaved(id);
    saveBtn.classList.toggle("is-saved", nowSaved);
    saveBtn.setAttribute("aria-pressed", String(nowSaved));
    saveBtn.textContent = nowSaved
      ? (saveBtn.classList.contains("big") ? "★ Saved" : "★ Saved")
      : (saveBtn.classList.contains("big") ? "☆ Save this update" : "☆ Save");
    // If we're viewing "saved only", drop the card immediately.
    if (filterState.saved && document.getElementById("results")) renderResults();
    return;
  }
  const navEl = e.target.closest("[data-area],[data-tier],[data-year],[data-month]");
  if (navEl) {
    const params = new URLSearchParams();
    if (navEl.dataset.area) params.set("area", navEl.dataset.area);
    if (navEl.dataset.tier) params.set("tier", navEl.dataset.tier);
    if (navEl.dataset.year) params.set("year", navEl.dataset.year);
    if (navEl.dataset.month) params.set("month", navEl.dataset.month);
    location.hash = "#/list?" + params.toString();
  }
});

// Keyboard activation for chart drill-down elements.
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-area],[data-tier],[data-year],[data-month]")) {
    e.preventDefault();
    e.target.click();
  }
});

// ---- Top-bar chrome: "Updated …" status + Cloudflare Access identity --------
// ---- Notifications bell: feed items new since the bell was last opened ------
// In the topbar (outside #app) so it persists across every tab. "New" is the set
// of current item ids not yet acknowledged (localStorage).
const NOTIF_KEY = "meridian.legal.notifSeen";
function notifItems() {
  const out = [];
  items.forEach((it) => out.push({ id: "u:" + it.id, date: it.date || "", kind: (typeById[it.type] || {}).name || it.type, title: it.title, href: "#/item/" + it.id }));
  cases.forEach((c) => out.push({ id: "c:" + c.id, date: c.date || "", kind: c.court || "Case", title: c.name, href: "#/cases?case=" + c.id }));
  restructurings.forEach((r) => out.push({ id: "r:" + r.id, date: r.date || "", kind: r.type === "scheme" ? "Scheme" : "Plan", title: r.company, href: "#/restructurings?m=" + r.id }));
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
          <a href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener noreferrer"' : ""} class="notif-link">${esc(x.title)}${x.ext ? " ↗" : ""}</a>
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
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("#notif")) closeNotif();
});
window.addEventListener("hashchange", closeNotif);

function initChrome() {
  const status = document.getElementById("data-status");
  if (status) {
    const latest = [...items].sort(byDateDesc)[0];
    status.innerHTML = `<span class="ds-part">Last refresh ${fmtDate(LAST_CHECKED)}${LAST_CHECKED_TIME ? `, ${LAST_CHECKED_TIME}` : ""}${latest ? " ·" : ""}</span>`
      + (latest ? ` <span class="ds-part">Latest item ${fmtDate(latest.date)}</span>` : "");
    status.title = `Routine last ran ${fmtDate(LAST_CHECKED)}${LAST_CHECKED_TIME ? ` ${LAST_CHECKED_TIME}` : ""}; data last changed ${fmtDate(LAST_REVIEWED)}`;
  }
  // Same pattern as the Meridian app / landing page: behind Cloudflare Access
  // this returns the verified email; otherwise we leave the slot empty.
  const acct = document.getElementById("account-nav");
  if (acct) {
    fetch("/api/me", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (d && d.email) {
          acct.innerHTML = `Signed in as <strong>${esc(d.email)}</strong>`
            + ` · <a href="/cdn-cgi/access/logout">Sign out</a>`;
        }
      })
      .catch(() => { /* not behind Access (e.g. local preview) — leave empty */ });
  }
}

// ---- Swipe to cycle through the primary sections (touch devices) -----------
// A horizontal swipe moves to the next/previous top-level section in nav order
// (wrapping around): Dashboard → Legal alerts → Case law → Schemes & RPs → Saved.
// Ignored when the gesture starts on an interactive control or a screen edge.
const SWIPE_SECTIONS = ["#/", "#/list", "#/cases", "#/restructurings", "#/list?saved=1"];
const SWIPE_IGNORE = "input, textarea, select, button, a, summary, .filters, svg, .donut-wrap, .chart";
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
  if (i < 0) return; // not on a primary section (e.g. a single-alert detail page)
  const n = SWIPE_SECTIONS.length;
  location.hash = SWIPE_SECTIONS[dx < 0 ? (i + 1) % n : (i - 1 + n) % n];
}, { passive: true });

window.addEventListener("hashchange", router);
initChrome();
renderNotifications();
router();
markVisitedSoon();
initSavedSync();   // pull + merge the per-user saved list across devices (behind Access)
