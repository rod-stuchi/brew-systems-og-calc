/* The formulas page: read-only. Works the equations through for the active
   sheet, or for the handoff's check values when nothing is saved yet. */
(function () {
  const G = window.Gravity;
  const CHECK = { name: '', og: 1.062, current: 1.044 };

  function example() {
    const s = Store.load();
    const wcf = s && s.wcf > 0 ? s.wcf : 1.04;
    const formula = s && G.FORMULAS[s.formula] ? s.formula : 'old';
    const sheet = s && (s.sheets.find(x => x.id === s.active) || s.sheets[0]);
    const src = sheet || CHECK;
    const fg = {};
    for (const k in G.FORMULAS) fg[k] = G.calc(src.og, src.current, wcf, k).fg;
    const c = G.calc(src.og, src.current, wcf, formula);
    return {
      name: sheet ? (sheet.name.trim() || `Batch ${s.sheets.indexOf(sheet) + 1}`) : 'Check values',
      og: src.og, sg: src.current, wcf, formula,
      ob: c.ob, rb: c.rb, fg, abv: c.abv, att: c.att, pts: c.pts,
    };
  }

  document.addEventListener('alpine:init', () => {
    Alpine.data('formulasPage', () => ({
      ex: example(),
      f(v, n) { return v.toFixed(n); },
      pct(v, n) { return Math.max(0, v).toFixed(n); },
      // Back to the calculator the way it was left, when that is where we came from.
      back(e) {
        let same = false;
        try { same = new URL(document.referrer).origin === location.origin; } catch (err) {}
        if (same && history.length > 1) { e.preventDefault(); history.back(); }
      },
    }));
  });
})();
