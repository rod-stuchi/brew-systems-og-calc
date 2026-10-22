/* Corrected gravity over time, as a small SVG line chart. Takes points
   already corrected ({t, g}, oldest first) and the width to draw at. */
(function () {
  const fmtDate = (t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  function render(svg, pts, width) {
    const W = Math.max(280, width), H = 120, pl = 44, pr = 12, pt_ = 12, pb = 18;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    if (pts.length < 2) { svg.innerHTML = ''; return; }
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
    let gMax = Math.max(...pts.map(p => p.g)), gMin = Math.min(...pts.map(p => p.g));
    const pad = Math.max(0.002, (gMax - gMin) * 0.15); gMax += pad; gMin -= pad;
    const X = t => pl + (W - pl - pr) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
    const Y = g => pt_ + (H - pt_ - pb) * (gMax - g) / (gMax - gMin);
    let o = '';
    [gMax - pad, gMin + pad].forEach(g => {
      o += `<line x1="${pl}" x2="${W - pr}" y1="${Y(g)}" y2="${Y(g)}" style="stroke:var(--line)" stroke-dasharray="3 3"/>`;
      o += `<text x="${pl - 6}" y="${Y(g) + 3}" text-anchor="end" font-size="10" style="fill:var(--muted);font-family:var(--f-body)">${g.toFixed(3)}</text>`;
    });
    const line = pts.map(p => `${X(p.t).toFixed(1)},${Y(p.g).toFixed(1)}`).join(' ');
    const area = `${X(t0)},${H - pb} ${line} ${X(t1)},${H - pb}`;
    o += `<polygon points="${area}" style="fill:var(--amber-soft)" opacity=".7"/>`;
    o += `<polyline points="${line}" fill="none" style="stroke:var(--amber)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      o += `<circle cx="${X(p.t)}" cy="${Y(p.g)}" r="${last ? 4 : 2.5}" style="fill:${last ? 'var(--amber)' : 'var(--surface)'};stroke:var(--amber)" stroke-width="1.5"/>`;
    });
    o += `<text x="${pl}" y="${H - 4}" font-size="10" style="fill:var(--muted);font-family:var(--f-body)">${fmtDate(t0)}</text>`;
    o += `<text x="${W - pr}" y="${H - 4}" text-anchor="end" font-size="10" style="fill:var(--muted);font-family:var(--f-body)">${fmtDate(t1)}</text>`;
    svg.innerHTML = o;
  }

  window.Spark = { fmtDate, render };
})();
