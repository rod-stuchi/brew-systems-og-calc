/* Storage: one localStorage key, the prototype's shape, every access guarded.
   Shared by the calculator (reads and writes) and the formulas page (reads). */
(function () {
  const G = window.Gravity;
  const KEY = 'beer-og-calc.v1';
  const uid = () => Math.random().toString(36).slice(2, 9);

  function seed() {
    const id = uid(), now = Date.now(), d = 864e5;
    return {
      wcf: 1.04, formula: 'old', active: id,
      sheets: [{
        id, name: 'Pale Ale (example)', og: 1.062, current: 1.044,
        readings: [{ t: now - 4 * d, sg: 1.056 }, { t: now - 3 * d, sg: 1.050 }, { t: now - 2 * d, sg: 1.046 }, { t: now - 0.3 * d, sg: 1.044 }],
      }],
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.sheets)) return s;
    } catch (e) {}
    return null;
  }
  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function initialState() {
    const s = load() || seed();
    if (!G.FORMULAS[s.formula]) s.formula = 'old';
    if (!(s.wcf > 0)) s.wcf = 1.04;
    if (!s.sheets.some(x => x.id === s.active)) s.active = s.sheets.length ? s.sheets[0].id : null;
    return s;
  }

  window.Store = { KEY, uid, seed, load, write, initialState };
})();
