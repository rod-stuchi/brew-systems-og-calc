/* The dial: an inline SVG built once per sheet view, then moved by draw().
   0.990–1.130 across a 270° sweep; ticks every 0.002, majors every 0.010,
   labels every 0.020. The knob body turns with a single rotate(). */
(function () {
  const { MIN, MAX } = Gravity;
  const NS = 'http://www.w3.org/2000/svg';
  const C = 120, A0 = -135, A1 = 135;
  const ang = (v) => A0 + (A1 - A0) * (Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN);
  const pt = (r, a) => { const t = a * Math.PI / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; };
  function arc(r, a0, a1) {
    const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  // Colors are tokens; SVG presentation attributes cannot read var(), styles can.
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) {
      const v = String(attrs[k]);
      if (v.includes('var(')) e.style.setProperty(k, v); else e.setAttribute(k, v);
    }
    parent && parent.appendChild(e); return e;
  }

  function build(svg) {
    const K = {};
    svg.innerHTML = '';
    el('path', { d: arc(104, A0, A1), fill: 'none', stroke: 'var(--line)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    K.fill = el('path', { d: '', fill: 'none', stroke: 'var(--amber)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    for (let p = 0; p <= 140; p += 2) {
      const v = MIN + p / 1000, a = ang(v), major = p % 10 === 0;
      const [x0, y0] = pt(major ? 90 : 94, a), [x1, y1] = pt(98, a);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: major ? 'var(--muted)' : 'var(--knob-edge)', 'stroke-width': major ? 1.5 : 1 }, svg);
      if (p % 20 === 10) {
        const [lx, ly] = pt(80, a);
        const t = el('text', { x: lx, y: ly + 3, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 9, 'font-family': 'var(--f-body)' }, svg);
        t.textContent = v.toFixed(3);
      }
    }
    K.og = el('path', { d: '', fill: 'var(--amber)' }, svg);
    K.ogText = el('text', { 'text-anchor': 'middle', fill: 'var(--amber)', 'font-size': 8, 'font-weight': 700, 'font-family': 'var(--f-body)' }, svg);
    K.ogText.textContent = 'OG';
    el('circle', { cx: C, cy: C, r: 66, fill: 'var(--knob)', stroke: 'var(--knob-edge)', 'stroke-width': 1.5 }, svg);
    K.rot = el('g', {}, svg);
    for (let i = 0; i < 36; i++) {
      const a = i * 10, [x0, y0] = pt(62, a), [x1, y1] = pt(66, a);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'var(--knob-edge)', 'stroke-width': 1.2 }, K.rot);
    }
    el('line', { x1: C, y1: C - 60, x2: C, y2: C - 48, stroke: 'var(--amber)', 'stroke-width': 4, 'stroke-linecap': 'round' }, K.rot);
    el('circle', { cx: C, cy: C, r: 46, fill: 'var(--surface)', stroke: 'var(--line)' }, svg);
    return K;
  }

  function draw(K, current, og) {
    const a = ang(current);
    K.fill.setAttribute('d', a - A0 > 0.5 ? arc(104, A0, a) : '');
    K.rot.setAttribute('transform', `rotate(${a} ${C} ${C})`);
    const ao = ang(og), [x, y] = pt(108, ao), [l, m] = pt(114, ao - 2.2), [n, o] = pt(114, ao + 2.2);
    K.og.setAttribute('d', `M${x} ${y} L${l} ${m} L${n} ${o} Z`);
    const [tx, ty] = pt(118, ao + (ao > 120 ? -6 : 0));
    K.ogText.setAttribute('x', tx); K.ogText.setAttribute('y', ty - 1);
  }

  window.Knob = { build, draw };
})();
