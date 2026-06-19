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
  items, practiceAreas, firms, tiers, updateTypes,
  firmById, areaById, typeById, tierById, LAST_REVIEWED,
} from "./data.js?v=20260618-1";
import { barChart, donutChart, columnChart } from "./charts.js?v=20260618-1";

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

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

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

function itemCard(it) {
  const firm = firmById[it.firm] || { name: it.firm, tier: "" };
  const type = (typeById[it.type] || {}).name || it.type;
  const saved = getSaved().has(it.id);
  const areasHtml = (it.areas || [it.area]).map(areaChip).join("");
  return `<article class="card item-card">
    <a class="card-link" href="#/item/${esc(it.id)}" aria-label="${esc(it.title)}">
      <div class="card-top">
        <div class="chips">${areasHtml}<span class="chip type">${esc(type)}</span>${isNew(it) ? '<span class="chip new">New</span>' : ""}</div>
        <time class="card-date" datetime="${esc(it.date)}">${fmtDate(it.date)}</time>
      </div>
      <h3 class="card-title">${esc(it.title)}</h3>
      <p class="card-summary">${esc(it.summary).slice(0, 220)}${it.summary.length > 220 ? "…" : ""}</p>
      <div class="card-meta">
        <span class="firm">${esc(firm.name)}</span>
        <span class="tier tier-${esc(firm.tier)}">${esc(tierLabel(firm.tier))}</span>
        ${it.citation ? `<span class="cite">${esc(it.citation)}</span>` : ""}
      </div>
    </a>
    <button class="save-btn ${saved ? "is-saved" : ""}" data-save="${esc(it.id)}"
      aria-pressed="${saved}" title="${saved ? "Remove from saved" : "Save this update"}">
      ${saved ? "★ Saved" : "☆ Save"}
    </button>
  </article>`;
}

// =============================================================================
// VIEW: Dashboard (#/)
// =============================================================================
function viewDashboard() {
  const sorted = [...items].sort(byDateDesc);
  const total = items.length;
  const thisYear = new Date().getFullYear();
  const ytd = items.filter((i) => Number(i.date.slice(0, 4)) === thisYear).length;
  const newCount = items.filter(isNew).length;

  // by practice area
  const areaData = practiceAreas.map((a) => ({
    label: a.short,
    value: items.filter((i) => (i.areas || [i.area]).includes(a.id)).length,
    color: a.color,
    nav: { area: a.id },
  }));
  // by tier
  const tierData = tiers.map((t) => ({
    label: t.name,
    value: items.filter((i) => (firmById[i.firm] || {}).tier === t.id).length,
    nav: { tier: t.id },
  }));
  // by month (last 8 distinct months present)
  const months = [...new Set(items.map((i) => ym(i.date)))].sort().slice(-8);
  const monthData = months.map((m) => ({
    label: MONTHS[Number(m.slice(5, 7)) - 1] + " " + m.slice(2, 4),
    value: items.filter((i) => ym(i.date) === m).length,
  }));

  const latest = sorted.slice(0, 6).map(itemCard).join("");

  const areaCards = practiceAreas.map((a) => {
    const n = items.filter((i) => (i.areas || [i.area]).includes(a.id)).length;
    const recent = items.filter((i) => (i.areas || [i.area]).includes(a.id)).sort(byDateDesc)[0];
    return `<a class="area-card" href="#/list?area=${a.id}" style="--c:${a.color}">
      <div class="area-card-head"><strong>${esc(a.name)}</strong><span class="area-count">${n}</span></div>
      <p class="area-blurb">${esc(a.blurb)}</p>
      ${recent ? `<span class="area-recent">Latest: ${esc(recent.title)}</span>` : ""}
    </a>`;
  }).join("");

  app.innerHTML = `
    <section class="page-head">
      <h1>Legal &amp; Case-Law Intelligence</h1>
      <p class="lead">Practical-Law-style updates across <strong>banking</strong>,
        <strong>restructuring &amp; insolvency</strong>, <strong>corporate</strong>,
        <strong>funds regulatory</strong> and <strong>fund tax</strong> — curated from the public
        insights, know-how and legal-update pages of UK Magic Circle, UK Silver Circle and the
        London offices of US-elite firms.</p>
      <div class="hero-actions">
        <a class="btn primary" href="#/list">Browse all updates</a>
        <a class="btn" href="#/list?saved=1">Saved updates</a>
      </div>
    </section>

    <section class="kpis" aria-label="Summary">
      <div class="kpi"><span class="kpi-num">${total}</span><span class="kpi-label">Tracked alerts</span></div>
      <div class="kpi"><span class="kpi-num">${practiceAreas.length}</span><span class="kpi-label">Practice areas</span></div>
      <div class="kpi"><span class="kpi-num">${firms.length}</span><span class="kpi-label">Source firms</span></div>
      <div class="kpi"><span class="kpi-num">${ytd}</span><span class="kpi-label">Dated ${thisYear}</span></div>
      ${newCount ? `<div class="kpi accent"><span class="kpi-num">${newCount}</span><span class="kpi-label">New since last visit</span></div>` : ""}
    </section>

    <section class="grid-2">
      <div class="panel">
        <h2>Alerts by practice area</h2>
        ${barChart(areaData, { width: 520 })}
      </div>
      <div class="panel">
        <h2>By source tier</h2>
        ${donutChart(tierData, { size: 200 })}
      </div>
    </section>

    <section class="panel">
      <h2>Publishing activity by month</h2>
      ${columnChart(monthData, { width: 720, height: 200 })}
    </section>

    <section>
      <h2 class="section-head">Browse by practice area</h2>
      <div class="area-cards">${areaCards}</div>
    </section>

    <section>
      <div class="section-head-row">
        <h2 class="section-head">Latest updates</h2>
        <a class="see-all" href="#/list">See all →</a>
      </div>
      <div class="cards">${latest}</div>
    </section>

    <p class="reviewed">Data last reviewed ${fmtDate(LAST_REVIEWED)}.</p>
  `;
}

// =============================================================================
// VIEW: List (#/list) — multi-select filters + search
// =============================================================================
const filterState = { areas: [], tiers: [], types: [], firms: [], q: "", saved: false };

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
  filterState.q = q.q || "";
  filterState.saved = q.saved === "1";

  const checkboxGroup = (legend, name, opts) => `
    <fieldset class="filter-group">
      <legend>${esc(legend)}</legend>
      ${opts.map((o) => `
        <label class="check">
          <input type="checkbox" name="${name}" value="${esc(o.id)}"
            ${filterState[name].includes(o.id) ? "checked" : ""}/>
          <span>${esc(o.name)}</span>
        </label>`).join("")}
    </fieldset>`;

  app.innerHTML = `
    <div class="list-head">
      <h1>${filterState.saved ? "Saved updates" : "All updates"}</h1>
      <p class="muted">Filter by practice area, source tier, type or firm, or search the full text.</p>
    </div>
    <div class="list-layout">
      <aside class="filters" aria-label="Filters">
        <div class="filters-top">
          <button id="clear-filters" class="link-btn" type="button">Clear all</button>
        </div>
        <label class="check toggle">
          <input type="checkbox" id="saved-only" ${filterState.saved ? "checked" : ""}/>
          <span>Saved only ★</span>
        </label>
        ${checkboxGroup("Practice area", "areas", practiceAreas.map((a) => ({ id: a.id, name: a.name })))}
        ${checkboxGroup("Source tier", "tiers", tiers)}
        ${checkboxGroup("Type", "types", updateTypes)}
        ${checkboxGroup("Firm", "firms", firms.map((f) => ({ id: f.id, name: f.name })))}
      </aside>
      <section class="results-wrap">
        <div class="searchbar">
          <input id="search" type="search" placeholder="Search updates, cases, tags…"
            value="${esc(filterState.q)}" aria-label="Search updates" autocomplete="off"/>
        </div>
        <div id="result-count" class="result-count" aria-live="polite"></div>
        <div id="results" class="cards"></div>
      </section>
    </div>
  `;

  // Wire up listeners (panel rendered once; only #results re-renders).
  app.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const name = cb.name;
      filterState[name] = [...app.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => x.value);
      renderResults();
    });
  });
  const savedOnly = app.querySelector("#saved-only");
  savedOnly.addEventListener("change", () => { filterState.saved = savedOnly.checked; renderResults(); });
  const search = app.querySelector("#search");
  search.addEventListener("input", () => { filterState.q = search.value; renderResults(); });
  app.querySelector("#clear-filters").addEventListener("click", () => {
    filterState.areas = []; filterState.tiers = []; filterState.types = []; filterState.firms = [];
    filterState.saved = false; filterState.q = "";
    app.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
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
  if (filterState.saved && !getSaved().has(it.id)) return false;
  if (filterState.q.trim()) {
    const q = filterState.q.trim().toLowerCase();
    const hay = [it.title, it.summary, it.citation, it.court, (it.tags || []).join(" "),
      (firmById[it.firm] || {}).name].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderResults() {
  const results = document.getElementById("results");
  const countEl = document.getElementById("result-count");
  if (!results) return;
  const matched = items.filter(matchesFilters).sort(byDateDesc);
  countEl.textContent = `${matched.length} update${matched.length === 1 ? "" : "s"}`;
  results.innerHTML = matched.length
    ? matched.map(itemCard).join("")
    : `<div class="empty">No updates match these filters.${filterState.saved ? " Save some updates with the ☆ button." : ""}</div>`;
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
    .sort(byDateDesc).slice(0, 3).map(itemCard).join("");

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
        <time datetime="${esc(it.date)}">${fmtDate(it.date)}</time>
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
        <a href="${esc(firm.insightsUrl)}" target="_blank" rel="noopener noreferrer">
          ${esc(firm.name)} — insights / know-how ↗</a>
        <p class="source-note">Links to the firm's public landing page. This summary is written for
          this prototype and is not legal advice — confirm against the firm's actual publication.</p>
      </div>
    </article>

    ${related ? `<section class="related">
      <h2 class="section-head">Related updates</h2>
      <div class="cards">${related}</div>
    </section>` : ""}
  `;
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
  else if (path.startsWith("/item/")) viewItem(decodeURIComponent(path.slice("/item/".length)));
  else viewDashboard();

  updateSavedCount();
  syncNavActive(hash);
}

function syncNavActive(hash) {
  document.querySelectorAll(".mainnav .nav-link, .mobile-nav .nav-link").forEach((a) => {
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
  const navEl = e.target.closest("[data-area],[data-tier]");
  if (navEl) {
    const params = new URLSearchParams();
    if (navEl.dataset.area) params.set("area", navEl.dataset.area);
    if (navEl.dataset.tier) params.set("tier", navEl.dataset.tier);
    location.hash = "#/list?" + params.toString();
  }
});

// Keyboard activation for chart drill-down elements.
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-area],[data-tier]")) {
    e.preventDefault();
    e.target.click();
  }
});

// Mobile nav toggle.
const navToggle = document.getElementById("nav-toggle");
const mobileNav = document.getElementById("mobile-nav");
if (navToggle && mobileNav) {
  navToggle.addEventListener("click", () => {
    const open = mobileNav.hasAttribute("hidden");
    if (open) mobileNav.removeAttribute("hidden"); else mobileNav.setAttribute("hidden", "");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  mobileNav.addEventListener("click", (e) => {
    if (e.target.closest("a")) { mobileNav.setAttribute("hidden", ""); navToggle.setAttribute("aria-expanded", "false"); }
  });
}

// ---- Top-bar chrome: "Updated …" status + Cloudflare Access identity --------
function initChrome() {
  const status = document.getElementById("data-status");
  if (status) {
    const latest = [...items].sort(byDateDesc)[0];
    status.textContent = `Updated ${fmtDate(LAST_REVIEWED)}`
      + (latest ? ` · latest update ${fmtDate(latest.date)}` : "");
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
router();
markVisitedSoon();
