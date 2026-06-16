// =============================================================================
// Meridian Credit Intelligence — application shell, router and views.
// Plain ES modules, no framework. Hash-based routing for a clickable prototype.
// =============================================================================

import {
  STRATEGIES, FUND_STATUS, GEOS, LP_TYPES,
  managers, funds, lps, intel,
  managerById, fundById, lpById,
  fundsByManager, intelForManager, intelForFund,
} from "./data.js";
import { barChart, donutChart, lineChart } from "./charts.js";

const app = document.getElementById("app");

// ----------------------------- formatting utils ----------------------------
const eur = (m) => (m == null ? "Undisclosed" : "€" + (m >= 1000 ? (m / 1000).toFixed(m % 1000 === 0 ? 0 : 1) + "bn" : m + "m"));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pct = (n) => (n == null ? "Undisclosed" : Math.round(n) + "%");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const statusClass = (s) => ({
  "Pre-marketing": "st-pre", "Open": "st-open", "First Close": "st-first", "Final Close": "st-final",
}[s] || "");
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

// --------------------------- simple filter state ---------------------------
// Persists per-view filter selections across re-renders within a session.
const filterState = {
  funds: { q: "", strategy: "", status: "", geo: "" },
  managers: { q: "", strategy: "" },
  lps: { q: "", type: "", strategy: "" },
  intel: { q: "", type: "" },
};

// ================================ DASHBOARD =================================
function viewDashboard() {
  const open = funds.filter((f) => f.status === "Open" || f.status === "First Close");
  const totalRaised = funds.reduce((s, f) => s + (f.raised || 0), 0);
  const finalClosesYTD = funds.filter((f) => f.status === "Final Close" && f.vintage >= 2025).length;
  const trackedRaise = intel.filter((i) => i.type === "Final Close" || i.type === "First Close").length;

  // helper: capital raised in approximate €bn (one decimal) for chart readability
  const bnRaised = (list) => Math.round(list.reduce((a, f) => a + (f.raised || 0), 0) / 100) / 10;

  // capital raised by strategy (€bn)
  const byStrategy = STRATEGIES.map((s) => ({
    label: s, value: bnRaised(funds.filter((f) => f.strategy === s)),
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  // funds by status
  const byStatus = FUND_STATUS.map((s) => ({ label: s, value: funds.filter((f) => f.status === s).length })).filter((d) => d.value > 0);

  // capital by geography (€bn)
  const byGeo = GEOS.map((g) => ({
    label: g, value: bnRaised(funds.filter((f) => f.geoFocus === g)),
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  // fundraising momentum — closes (first+final) per quarter, last 6 quarters
  const qKey = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`; };
  const qCounts = {};
  intel.filter((i) => i.type === "First Close" || i.type === "Final Close")
    .forEach((i) => { const k = qKey(i.date); qCounts[k] = (qCounts[k] || 0) + 1; });
  const trend = Object.keys(qCounts).sort().slice(-6).map((k) => ({
    label: "'" + k.slice(2), value: qCounts[k],
  }));

  const kpis = [
    { label: "Tracked funds", value: funds.length, sub: `${managers.length} managers` },
    { label: "Funds in market", value: open.length, sub: "open or at first close" },
    { label: "Capital raised (tracked)", value: eur(totalRaised), sub: "across tracked funds" },
    { label: "Final closes (2025–26)", value: finalClosesYTD, sub: `${trackedRaise} close events` },
  ];

  app.innerHTML = `
    <div class="page-head">
      <h1>Market Dashboard</h1>
      <p class="muted">European private credit fundraising at a glance · real data compiled from public sources (mid-2026)</p>
    </div>
    <div class="kpi-grid">
      ${kpis.map((k) => `<div class="kpi-card"><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div><div class="kpi-sub muted">${k.sub}</div></div>`).join("")}
    </div>
    <div class="grid-2">
      <section class="card"><h2>Capital raised by strategy <span class="muted">(€bn)</span></h2>${barChart(byStrategy, { unit: "€", width: 540 })}</section>
      <section class="card"><h2>Funds by status</h2>${donutChart(byStatus)}</section>
      <section class="card"><h2>Capital raised by geography <span class="muted">(€bn)</span></h2>${barChart(byGeo, { unit: "€", width: 540 })}</section>
      <section class="card"><h2>Fundraising momentum <span class="muted">(closes / quarter)</span></h2>${lineChart(trend)}</section>
    </div>
    <section class="card">
      <h2>Latest intelligence</h2>
      ${intel.slice(0, 6).map(intelRow).join("")}
      <div class="card-foot">${link("#/intel", "View full intelligence feed →")}</div>
    </section>`;
}

// ================================== FUNDS ===================================
function selectFilter(id, label, options, current) {
  return `<label class="filter"><span>${label}</span>
    <select data-filter="${id}">
      <option value="">All</option>
      ${options.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select></label>`;
}

function viewFunds() {
  const f = filterState.funds;
  const rows = funds.filter((x) =>
    (!f.q || (x.name + managerById[x.managerId].name).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.strategy || x.strategy === f.strategy) &&
    (!f.status || x.status === f.status) &&
    (!f.geo || x.geoFocus === f.geo)
  ).sort((a, b) => (b.raised || 0) - (a.raised || 0));

  app.innerHTML = `
    <div class="page-head"><h1>Funds in Market</h1><p class="muted">${rows.length} of ${funds.length} funds</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Fund or manager…" value="${esc(f.q)}"></label>
      ${selectFilter("strategy", "Strategy", STRATEGIES, f.strategy)}
      ${selectFilter("status", "Status", FUND_STATUS, f.status)}
      ${selectFilter("geo", "Geography", GEOS, f.geo)}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Fund</th><th>Manager</th><th>Strategy</th><th>Geography</th><th>Status</th><th>Target</th><th class="prog-col">Progress</th></tr></thead>
      <tbody>
        ${rows.map((x) => `<tr class="clickable" data-href="#/fund/${x.id}">
          <td><strong>${esc(x.name)}</strong><div class="muted small">${x.vintage} · ${esc(x.domicile)}</div></td>
          <td>${esc(managerById[x.managerId].name)}</td>
          <td>${chip(x.strategy)}</td>
          <td>${esc(x.geoFocus)}</td>
          <td>${chip(x.status, statusClass(x.status))}</td>
          <td>${x.evergreen ? "—" : eur(x.targetSize)}</td>
          <td class="prog-col">${raiseDisplay(x)}</td>
        </tr>`).join("")}
        ${rows.length === 0 ? '<tr><td colspan="7" class="empty">No funds match these filters.</td></tr>' : ""}
      </tbody>
    </table></div>`;
  wireFilters("funds");
}

function viewFund(id) {
  const x = fundById[id];
  if (!x) return notFound();
  const m = managerById[x.managerId];
  const related = intelForFund(id);
  const peers = funds.filter((p) => p.strategy === x.strategy && p.id !== id).slice(0, 5);
  const interestedLps = lps.filter((l) => l.strategies.includes(x.strategy) && l.mandateStatus !== "Not currently active");

  app.innerHTML = `
    ${breadcrumb([["#/funds", "Funds"], [null, x.name]])}
    <div class="detail-head">
      <div>
        <h1>${esc(x.name)}</h1>
        <p class="muted">${link(`#/manager/${m.id}`, m.name)} · ${esc(x.domicile)} · Vintage ${x.vintage}</p>
        <div>${chip(x.strategy)} ${chip(x.status, statusClass(x.status))} ${chip(x.geoFocus)}</div>
      </div>
    </div>
    <p class="lead">${esc(x.description)}</p>
    ${sources(x)}
    <div class="grid-2">
      <section class="card">
        <h2>Fundraising</h2>
        ${raiseDisplay(x)}
        <dl class="facts">
          <div><dt>Target size</dt><dd>${x.evergreen ? "Evergreen (open-ended)" : eur(x.targetSize)}</dd></div>
          <div><dt>Hard cap</dt><dd>${eur(x.hardCap)}</dd></div>
          <div><dt>${x.evergreen ? "Current AUM/NAV" : "Raised to date"}</dt><dd>${eur(x.raised)}</dd></div>
          <div><dt>Status</dt><dd>${chip(x.status, statusClass(x.status))}</dd></div>
          <div><dt>Sector focus</dt><dd>${esc(x.sectorFocus)}</dd></div>
          <div><dt>Domicile</dt><dd>${esc(x.domicile)}</dd></div>
        </dl>
      </section>
      <section class="card">
        <h2>Potential investor fit <span class="muted">(${interestedLps.length})</span></h2>
        <p class="muted small">LPs whose stated interests include ${esc(x.strategy)}.</p>
        <ul class="link-list">
          ${interestedLps.slice(0, 6).map((l) => `<li>${link(`#/lp/${l.id}`, l.name)} <span class="muted small">${esc(l.type)} · ${l.typicalTicket != null ? eur(l.typicalTicket) + " typical ticket" : "ticket undisclosed"}</span></li>`).join("") || '<li class="muted">No active LPs flagged.</li>'}
        </ul>
      </section>
    </div>
    <section class="card">
      <h2>Related intelligence</h2>
      ${related.length ? related.map(intelRow).join("") : '<p class="muted">No intelligence items linked to this fund yet.</p>'}
    </section>
    <section class="card">
      <h2>Peer funds — ${esc(x.strategy)}</h2>
      <ul class="link-list">
        ${peers.map((p) => `<li>${link(`#/fund/${p.id}`, p.name)} <span class="muted small">${esc(managerById[p.managerId].name)} · ${chip(p.status, statusClass(p.status))}</span></li>`).join("") || '<li class="muted">No peers found.</li>'}
      </ul>
    </section>`;
}

// ================================ MANAGERS ==================================
function viewManagers() {
  const f = filterState.managers;
  const rows = managers.filter((m) =>
    (!f.q || m.name.toLowerCase().includes(f.q.toLowerCase()) || m.hq.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.strategy || m.strategies.includes(f.strategy))
  ).sort((a, b) => b.aum - a.aum);

  app.innerHTML = `
    <div class="page-head"><h1>Managers</h1><p class="muted">${rows.length} of ${managers.length} GPs</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Name or HQ…" value="${esc(f.q)}"></label>
      ${selectFilter("strategy", "Strategy", STRATEGIES, f.strategy)}
    </div>
    <div class="card-grid">
      ${rows.map((m) => {
        const fs = fundsByManager(m.id);
        const live = fs.filter((x) => x.status !== "Final Close").length;
        return `<div class="manager-card clickable" data-href="#/manager/${m.id}">
          <div class="manager-card-head"><h3>${esc(m.name)}</h3><span class="muted small">${esc(m.hq)}</span></div>
          <p class="muted small">${esc(m.description)}</p>
          <div class="manager-stats">
            <div><strong>€${m.aum}bn</strong><span class="muted small">AUM</span></div>
            <div><strong>${fs.length}</strong><span class="muted small">funds</span></div>
            <div><strong>${live}</strong><span class="muted small">in market</span></div>
          </div>
          <div>${m.strategies.map((s) => chip(s)).join(" ")}</div>
        </div>`;
      }).join("")}
      ${rows.length === 0 ? '<p class="empty">No managers match these filters.</p>' : ""}
    </div>`;
  wireFilters("managers");
}

function viewManager(id) {
  const m = managerById[id];
  if (!m) return notFound();
  const fs = fundsByManager(id).sort((a, b) => b.vintage - a.vintage);
  const news = intelForManager(id);
  const liveFunds = fs.filter((x) => x.status !== "Final Close").length;

  app.innerHTML = `
    ${breadcrumb([["#/managers", "Managers"], [null, m.name]])}
    <div class="detail-head"><div>
      <h1>${esc(m.name)}</h1>
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
      <h2>Funds</h2>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Fund</th><th>Strategy</th><th>Vintage</th><th>Status</th><th>Target</th><th class="prog-col">Progress</th></tr></thead>
        <tbody>${fs.map((x) => `<tr class="clickable" data-href="#/fund/${x.id}">
          <td><strong>${esc(x.name)}</strong></td><td>${chip(x.strategy)}</td><td>${x.vintage}</td>
          <td>${chip(x.status, statusClass(x.status))}</td><td>${x.evergreen ? "—" : eur(x.targetSize)}</td>
          <td class="prog-col">${raiseDisplay(x)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </section>
    <section class="card">
      <h2>Intelligence</h2>
      ${news.length ? news.map(intelRow).join("") : '<p class="muted">No intelligence items for this manager yet.</p>'}
    </section>`;
}

// ================================ INVESTORS =================================
function viewLps() {
  const f = filterState.lps;
  const rows = lps.filter((l) =>
    (!f.q || l.name.toLowerCase().includes(f.q.toLowerCase()) || l.hq.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.type || l.type === f.type) &&
    (!f.strategy || l.strategies.includes(f.strategy))
  ).sort((a, b) => b.aum - a.aum);

  app.innerHTML = `
    <div class="page-head"><h1>Investors / Allocators</h1><p class="muted">${rows.length} of ${lps.length} LPs</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Name or HQ…" value="${esc(f.q)}"></label>
      ${selectFilter("type", "Type", LP_TYPES, f.type)}
      ${selectFilter("strategy", "Interest", STRATEGIES, f.strategy)}
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Investor</th><th>Type</th><th>HQ</th><th>AUM</th><th>PC alloc.</th><th>Typical ticket</th><th>Mandate</th></tr></thead>
      <tbody>
        ${rows.map((l) => `<tr class="clickable" data-href="#/lp/${l.id}">
          <td><strong>${esc(l.name)}</strong></td><td>${esc(l.type)}</td><td>${esc(l.hq)}</td>
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
      <h1>${esc(l.name)}</h1>
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
  return `<div class="intel-row">
    <div class="intel-meta"><span class="chip ${intelTypeClass(i.type)}">${esc(i.type)}</span><span class="muted small">${fmtDate(i.date)}</span></div>
    <div class="intel-body">${head}<p class="muted small">${esc(i.summary)}</p><div>${tag}${i.sourceUrl ? ` · <a href="${esc(i.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="muted small">source ↗</a>` : ""}</div></div>
  </div>`;
}

function viewIntel() {
  const f = filterState.intel;
  const rows = intel.filter((i) =>
    (!f.q || (i.headline + i.summary).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.type || i.type === f.type)
  ); // already in reverse-chronological order

  app.innerHTML = `
    <div class="page-head"><h1>Fundraising Intelligence</h1><p class="muted">${rows.length} of ${intel.length} items</p></div>
    <div class="filters">
      <label class="filter search"><span>Search</span><input type="search" data-filter="q" placeholder="Keyword…" value="${esc(f.q)}"></label>
      ${selectFilter("type", "Type", INTEL_TYPES, f.type)}
    </div>
    <section class="card">
      ${rows.length ? rows.map(intelRow).join("") : '<p class="empty">No intelligence items match these filters.</p>'}
    </section>`;
  wireFilters("intel");
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
  const inputs = app.querySelectorAll("[data-filter]");
  inputs.forEach((el) => {
    const key = el.getAttribute("data-filter");
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      filterState[view][key] = el.value;
      const active = document.activeElement === el;
      router(); // re-render
      if (active) {
        const again = app.querySelector(`[data-filter="${key}"]`);
        if (again) { again.focus(); if (again.setSelectionRange && again.value) { const n = again.value.length; again.setSelectionRange(n, n); } }
      }
    });
  });
}

// Row click delegation
app.addEventListener("click", (e) => {
  const row = e.target.closest("[data-href]");
  if (row && !e.target.closest("a")) location.hash = row.getAttribute("data-href");
});

// ================================= router ==================================
function router() {
  const hash = location.hash || "#/";
  const [, route, arg] = hash.split("/");
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `#/${route}` || (route === "" && a.getAttribute("href") === "#/"));
  });
  window.scrollTo(0, 0);
  switch (route) {
    case "": case undefined: return viewDashboard();
    case "funds": return viewFunds();
    case "fund": return viewFund(arg);
    case "managers": return viewManagers();
    case "manager": return viewManager(arg);
    case "lps": return viewLps();
    case "lp": return viewLp(arg);
    case "intel": return viewIntel();
    default: return notFound();
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
router();
