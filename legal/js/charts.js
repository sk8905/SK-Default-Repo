// =============================================================================
// Tiny dependency-free inline-SVG chart helpers for the Legal Alerts dashboard.
// Each returns an SVG (or SVG+legend) string. No chart library, no CDN, no build.
// =============================================================================

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Turn an optional `nav` object ({area:"banking"}) into data-* attributes used
// by the app's click delegation for drill-down.
function navAttrs(nav) {
  if (!nav) return "";
  return Object.entries(nav).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
}

// Horizontal bar chart. data: [{label, value, color?, nav?}]
export function barChart(data, { width = 520 } = {}) {
  const rowH = 28, gap = 10, left = 150, right = 50;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = width - left - right;
  const height = data.length * (rowH + gap) + gap;
  const rows = data.map((d, i) => {
    const y = gap + i * (rowH + gap);
    const w = Math.max(2, (d.value / max) * barW);
    const color = d.color || "#2563eb";
    const inner = `
      <text x="${left - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" class="chart-label">${esc(d.label)}</text>
      <rect x="${left}" y="${y}" width="${w}" height="${rowH}" rx="4" fill="${color}"><title>${esc(d.label)}: ${d.value}</title></rect>
      <text x="${left + w + 8}" y="${y + rowH / 2 + 4}" class="chart-value">${d.value}</text>`;
    return d.nav
      ? `<g class="bar-row clickable" tabindex="0" role="link" aria-label="${esc(d.label)}: ${d.value}" ${navAttrs(d.nav)}>${inner}</g>`
      : `<g>${inner}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="Bar chart">${rows}</svg>`;
}

// Donut chart. data: [{label, value, color?, nav?}]
export function donutChart(data, { size = 200 } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6, inner = r * 0.62;
  let angle = -Math.PI / 2;
  const palette = ["#2563eb", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444", "#0ea5e9"];
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
    const color = d.color || palette[i % palette.length];
    const cls = d.nav ? ' class="clickable"' : "";
    return `<path${cls} ${navAttrs(d.nav)} d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${inner} ${inner} 0 ${large} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)} Z" fill="${color}"><title>${esc(d.label)}: ${d.value} (${Math.round(frac * 100)}%)</title></path>`;
  }).join("");
  const legend = data.map((d, i) =>
    `<div class="legend-item ${d.nav ? "clickable" : ""}" ${navAttrs(d.nav)}><span class="legend-swatch" style="background:${d.color || palette[i % palette.length]}"></span>${esc(d.label)} <strong>${d.value}</strong></div>`
  ).join("");
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" class="donut" role="img" aria-label="Donut chart">${arcs}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="donut-total">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-sub">alerts</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

// Column chart over time. data: [{label, value}] chronological.
export function columnChart(data, { width = 560, height = 200 } = {}) {
  const left = 36, right = 12, top = 16, bottom = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotW = width - left - right, plotH = height - top - bottom;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(46, slot * 0.62);
  const gridY = [0, 0.5, 1].map((f) => {
    const y = top + plotH - f * plotH;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="chart-grid"/>
      <text x="${left - 6}" y="${y + 4}" text-anchor="end" class="chart-axis">${Math.round(max * f)}</text>`;
  }).join("");
  const cols = data.map((d, i) => {
    const h = (d.value / max) * plotH;
    const x = left + i * slot + (slot - barW) / 2;
    const y = top + plotH - h;
    return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="#2563eb"><title>${esc(d.label)}: ${d.value}</title></rect>
      <text x="${(x + barW / 2).toFixed(1)}" y="${height - 9}" text-anchor="middle" class="chart-axis">${esc(d.label)}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="Alerts over time">${gridY}${cols}</svg>`;
}
