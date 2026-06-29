// =============================================================================
// Tiny dependency-free inline-SVG chart helpers.
// Each returns an SVG string. Kept intentionally small and self-contained so
// the prototype runs offline with no build step or CDN.
// =============================================================================

const PALETTE = [
  "#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6",
];

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Turn a datum's optional `nav` object ({jump:"funds", strategy:"…"}) into
// data-* attributes consumed by the app's click delegation.
function navAttrs(nav) {
  if (!nav) return "";
  return Object.entries(nav).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
}

// Horizontal bar chart. data: [{label, value, nav?}]
export function barChart(data, { unit = "", width = 520 } = {}) {
  const rowH = 30, gap = 10, left = 200, right = 70;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = width - left - right;
  const height = data.length * (rowH + gap) + gap;
  const rows = data.map((d, i) => {
    const y = gap + i * (rowH + gap);
    const w = Math.max(2, (d.value / max) * barW);
    const color = PALETTE[i % PALETTE.length];
    const inner = `
      <rect x="0" y="${y}" width="${width}" height="${rowH}" fill="transparent"/>
      <text x="${left - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" class="chart-label">${esc(d.label)}</text>
      <rect x="${left}" y="${y}" width="${w}" height="${rowH}" rx="4" fill="${color}"><title>${esc(d.label)}: ${unit}${d.value.toLocaleString()}</title></rect>
      <text x="${left + w + 8}" y="${y + rowH / 2 + 4}" class="chart-value">${unit}${d.value.toLocaleString()}</text>`;
    return d.nav ? `<g class="bar-row clickable" ${navAttrs(d.nav)}>${inner}</g>` : `<g>${inner}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img">${rows}</svg>`;
}

// Donut chart. data: [{label, value, nav?}]
export function donutChart(data, { size = 220 } = {}) {
  const sum = data.reduce((s, d) => s + d.value, 0); // real total shown in the centre
  const total = sum || 1;                            // geometry divisor (avoid /0)
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, inner = r * 0.6;
  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
    const color = PALETTE[i % PALETTE.length];
    const cls = d.nav ? ' class="clickable"' : "";
    return `<path${cls} ${navAttrs(d.nav)} d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${color}"><title>${esc(d.label)}: ${d.value} (${Math.round(frac * 100)}%)</title></path>`;
  }).join("");
  const legend = data.map((d, i) =>
    `<div class="legend-item ${d.nav ? "clickable" : ""}" ${navAttrs(d.nav)}><span class="legend-swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>${esc(d.label)} <strong>${d.value}</strong></div>`
  ).join("");
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" class="donut" role="img">${arcs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-total">${sum}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-sub">total</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

// Line chart. data: [{label, value}] in chronological order
export function lineChart(data, { unit = "", width = 560, height = 220 } = {}) {
  if (!data || !data.length) return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img"></svg>`;
  const left = 50, right = 20, top = 20, bottom = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotW = width - left - right, plotH = height - top - bottom;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const x = left + i * stepX;
    const y = top + plotH - (d.value / max) * plotH;
    return { x, y, d };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${top + plotH} L ${pts[0].x} ${top + plotH} Z`;
  // Each point can carry a `nav` object → it becomes a clickable column
  // (transparent full-height hit area + dot + x-label) for drill-down.
  const hitW = stepX > 0 ? stepX : plotW;
  const dots = pts.map((p) => {
    const dot = `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#2563eb"></circle>`;
    const lbl = `<text x="${p.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-axis">${esc(p.d.label)}</text>`;
    const tip = `<title>${esc(p.d.label)}: ${unit}${p.d.value.toLocaleString()}</title>`;
    if (!p.d.nav) return `<g>${dot}${lbl}${tip}</g>`;
    const hx = Math.max(0, p.x - hitW / 2);
    return `<g class="line-pt clickable" ${navAttrs(p.d.nav)}>${tip}` +
      `<rect x="${hx.toFixed(1)}" y="${top}" width="${hitW.toFixed(1)}" height="${plotH}" fill="transparent"/>` +
      `${dot}${lbl}</g>`;
  }).join("");
  const xlabels = "";
  const gridY = [0, 0.5, 1].map((f) => {
    const y = top + plotH - f * plotH;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="chart-grid"/>
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" class="chart-axis">${unit}${Math.round(max * f).toLocaleString()}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img">
    ${gridY}
    <path d="${area}" fill="rgba(37,99,235,0.12)"/>
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${dots}${xlabels}
  </svg>`;
}

// Multi-series line chart. series: [{ name, color, points:[{label, value}] }].
// All series share the same x positions (labels + click hit-areas come from the
// first series' points, which may carry a `nav` object for drill-down).
export function multiLineChart(series, { unit = "", width = 1120, height = 240 } = {}) {
  const left = 50, right = 20, top = 24, bottom = 30;
  const base = series[0] ? series[0].points : [];
  const n = base.length;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const plotW = width - left - right, plotH = height - top - bottom;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  const X = (i) => left + i * stepX;
  const Y = (v) => top + plotH - (v / max) * plotH;
  const gridY = [0, 0.5, 1].map((f) => {
    const y = top + plotH - f * plotH;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="chart-grid"/>
      <text x="${left - 8}" y="${y + 4}" text-anchor="end" class="chart-axis">${unit}${Math.round(max * f).toLocaleString()}</text>`;
  }).join("");
  const lines = series.map((s) => {
    const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(p.value).toFixed(1)}`).join(" ");
    const dots = s.points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="3" fill="${s.color}"><title>${esc(s.name)} — ${esc(p.label || "")}: ${unit}${p.value.toLocaleString()}</title></circle>`).join("");
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${dots}`;
  }).join("");
  const hitW = stepX > 0 ? stepX : plotW;
  const xaxis = base.map((p, i) => {
    const lbl = `<text x="${X(i).toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-axis">${esc(p.label || "")}</text>`;
    if (!p.nav) return `<g>${lbl}</g>`;
    const hx = Math.max(0, X(i) - hitW / 2);
    return `<g class="line-pt clickable" ${navAttrs(p.nav)}><rect x="${hx.toFixed(1)}" y="${top}" width="${hitW.toFixed(1)}" height="${plotH}" fill="transparent"/>${lbl}</g>`;
  }).join("");
  const legend = series.map((s) =>
    `<div class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${esc(s.name)}</div>`
  ).join("");
  return `<div class="chart-legend">${legend}</div>
    <svg viewBox="0 0 ${width} ${height}" class="chart" role="img">${gridY}${lines}${xaxis}</svg>`;
}
