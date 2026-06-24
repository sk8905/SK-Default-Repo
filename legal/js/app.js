// =============================================================================
// Meridian Legal — hash-based router + all views. Renders each view by building an
// HTML string and assigning it to #app.innerHTML. Zero dependencies.
//
// Routes:  #/                dashboard
//          #/list            all updates (multi-select filters + search)
//          #/list?area=…     list pre-filtered (also ?saved=1, ?q=…, ?tier=…)
//          #/item/<id>       single alert detail
//
// Per-user state (saved alerts, last-visit marker) is kept in localStorage — no
// network, no API key. To sync saved alerts across devices later, add a small
// Worker endpoint backed by Cloudflare KV (see docs/cloudflare-setup.md) and
// swap the two functions in the "Saved state" block below.
// =============================================================================

import {
  items, cases, caseSummaries, practiceAreas, firms, tiers, updateTypes, restructurings,
  firmById, areaById, typeById, tierById, LAST_REVIEWED, LAST_CHECKED, LAST_CHECKED_TIME,
} from "./data.js?v=20260624-11";
import { donutChart, columnChart } from "./charts.js?v=20260624-11";

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

// ---- Saved state (localStorage) ---------------------------------------------
const SAVED_KEY = "lexalert.saved";
const VISIT_KEY = "lexalert.lastVisit";

function getSaved() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); }
  catch { return new Set(); }
}
function setSaved(set) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
  updateSavedCount();
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

  // Dashboard lists: law-firm alerts (left) and recent BAILII cases (right).
  const firmList = [...items].sort(byDateDesc).slice(0, 10).map(itemCompact).join("");
  const caseListHtml = [...cases].sort(byDateDesc).slice(0, 10).map(caseCompact).join("");

  // Supporting charts: by source tier + by month.
  const tierData = tiers.map((t) => ({
    label: t.name,
    value: items.filter((i) => (firmById[i.firm] || {}).tier === t.id).length,
    nav: { tier: t.id },
  }));
  const months = [...new Set(items.map((i) => ym(i.date)))].sort().slice(-8);
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

    <div class="grid-2">
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

  const years = [...new Set(items.map((i) => i.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const monthOpts = [...new Set(items.map((i) => ym(i.date)))].sort((a, b) => b.localeCompare(a))
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
    filterState.areas = []; filterState.tiers = []; filterState.types = []; filterState.firms = [];
    filterState.years = []; filterState.months = []; filterState.saved = false; filterState.q = "";
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

function renderResults() {
  const results = document.getElementById("results");
  const countEl = document.getElementById("result-count");
  if (!results) return;
  let rows = items.filter(matchesFilters).map((it) => ({ ...it, _kind: "item" }));
  // In the "Saved" view, also surface saved case-law judgments alongside alerts.
  if (filterState.saved) {
    const savedSet = getSaved();
    rows = rows.concat(cases.filter((c) => savedSet.has(c.id) && caseMatchesFilters(c)).map((c) => ({ ...c, _kind: "case" })));
  }
  rows.sort(byDateDesc);
  const n = rows.length;
  const noun = filterState.saved ? "saved item" : "update";
  countEl.textContent = `${n} ${noun}${n === 1 ? "" : "s"}`;
  results.innerHTML = n
    ? byYear(rows, (x) => (x._kind === "case" ? caseRow(x) : itemRow(x)))
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
  el.innerHTML = matched.length ? byYear(matched, caseRow) : `<div class="empty">No cases match these filters.</div>`;
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

function rxCard(r) {
  const firm = r.firm ? (firmById[r.firm] || { name: r.firm }) : null;
  const saved = getSaved().has(r.id);
  const creditors = (r.creditors || []).length ? esc(r.creditors.join("; ")) : '<span class="muted">Not disclosed</span>';
  const advisers = (r.advisers || []).length ? esc(r.advisers.join(", ")) : '<span class="muted">Not identified</span>';
  const features = (r.features || []).length
    ? `<ul class="rx-features">${r.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : '<span class="muted">—</span>';
  const links = [
    r.articleUrl ? `<a href="${esc(r.articleUrl)}" target="_blank" rel="noopener noreferrer">${esc(firm ? firm.name : "Firm")} analysis ↗</a>` : "",
    r.judgmentUrl ? `<a href="${esc(r.judgmentUrl)}" target="_blank" rel="noopener noreferrer">Judgment${r.citation ? ` — ${esc(r.citation)}` : ""} ↗</a>`
      : (r.citation ? `<span class="muted small">${esc(r.citation)}</span>` : ""),
  ].filter(Boolean).join(' <span class="rx-dot">·</span> ');
  return `<article class="rx-card" id="row-${esc(r.id)}">
    <div class="rx-head">
      <h3 class="rx-company">${esc(r.company)}</h3>
      <div class="rx-chips">
        <span class="chip rx-type rx-${esc(r.type)}">${esc(rxTypeLabel(r.type))}</span>
        <span class="chip rx-out rx-out-${rxOutcomeClass(r.outcome)}">${esc(r.outcome)}</span>
        <button class="save-btn ${saved ? "is-saved" : ""}" data-save="${esc(r.id)}" aria-pressed="${saved}"
          title="${saved ? "Remove from saved" : "Save"}">${saved ? "★" : "☆"}</button>
      </div>
    </div>
    <div class="rx-meta muted small">${r.date ? esc(fmtDate(r.date)) : "undated"}${r.court ? ` · ${esc(r.court)}` : ""}${r.sector ? ` · ${esc(r.sector)}` : ""}</div>
    <dl class="rx-grid">
      <div><dt>Debt</dt><dd>${r.debt ? esc(r.debt) : '<span class="muted">Not disclosed</span>'}</dd></div>
      <div><dt>Largest creditors</dt><dd>${creditors}</dd></div>
      <div><dt>Company advised by</dt><dd>${advisers}</dd></div>
      <div class="rx-feat"><dt>Key features</dt><dd>${features}</dd></div>
    </dl>
    ${r.notes ? `<p class="rx-notes muted small">${esc(r.notes)}</p>` : ""}
    <div class="rx-links">${links}</div>
  </article>`;
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
      <h1>Plans &amp; Schemes</h1>
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
        <div id="rx-count" class="result-count" aria-live="polite"></div>
        <div id="rx-results"></div>
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
  renderRxResults();
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
  el.innerHTML = matched.length ? byYear(matched, rxCard) : '<p class="empty">No matters match these filters.</p>';
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
    status.textContent = `Last refresh ${fmtDate(LAST_CHECKED)}${LAST_CHECKED_TIME ? `, ${LAST_CHECKED_TIME}` : ""}`
      + (latest ? ` · latest item ${fmtDate(latest.date)}` : "");
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
          acct.innerHTML = `signed in as <strong>${esc(d.email)}</strong>`
            + ` · <a href="/cdn-cgi/access/logout">Sign out</a>`;
        }
      })
      .catch(() => { /* not behind Access (e.g. local preview) — leave empty */ });
  }
}

window.addEventListener("hashchange", router);
initChrome();
renderNotifications();
router();
markVisitedSoon();
