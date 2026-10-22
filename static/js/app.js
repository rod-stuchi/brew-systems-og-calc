/* The app's behavior: one reactive state object, saved to localStorage.
   Ported from the prototype's render loop to Alpine templates; the math is
   gravity.js, the dial is knob.js, the chart is spark.js. */
(function () {
  const G = window.Gravity;
  const KEY = 'beer-og-calc.v1';
  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- Storage: one key, every access guarded ---------- */
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

  document.addEventListener('alpine:init', () => {
    /* ---------- Root: state, sheets, readout, log ---------- */
    Alpine.data('ogApp', () => {
      let saveT, armT, logT;
      return {
        state: initialState(),
        notes: G.NOTES,
        settingsOpen: false,
        ogText: '',
        armed: false,
        logged: false,
        resizeTick: 0,

        init() {
          this.$watch('state', () => { clearTimeout(saveT); saveT = setTimeout(() => write(this.state), 200); });
          this.syncOg();
          this.$watch('state.active', () => { this.syncOg(); this.disarm(); this.logged = false; this.revealTab(); });
          this.revealTab();
        },

        get sheet() { return this.state.sheets.find(s => s.id === this.state.active) || null; },
        calcFor(s, sg) { return G.calc(s.og, sg, this.state.wcf, this.state.formula); },
        get c() { return this.sheet ? this.calcFor(this.sheet, this.sheet.current) : null; },
        label(s, i) { return s.name.trim() || `Batch ${i + 1}`; },
        tabLine(s) { return `${s.og.toFixed(3)} → ${this.calcFor(s, s.current).fg.toFixed(3)}`; },
        pct(v, n) { return Math.max(0, v).toFixed(n); },

        get warning() {
          const s = this.sheet, c = this.c;
          if (!s) return '';
          if (s.current >= s.og) return 'Reading equals the OG, so nothing has fermented yet.';
          if (c.fg < 0.996) return 'This is below what beer usually reaches. Check the OG and the reading.';
          return '';
        },

        /* Sheets */
        select(id) { this.state.active = id; },
        addSheet() {
          const prev = this.sheet;
          const og = prev ? prev.og : 1.050;
          const s = { id: uid(), name: '', og, current: og, readings: [] };
          this.state.sheets.push(s);
          this.state.active = s.id;
          this.$nextTick(() => { const n = document.getElementById('name'); if (n) n.focus(); });
        },
        revealTab() {
          this.$nextTick(() => {
            const t = document.querySelector('.tab[aria-selected="true"]');
            if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          });
        },

        /* Delete needs a second tap within 4 s; no confirm(). */
        armDelete() {
          if (!this.armed) {
            this.armed = true;
            clearTimeout(armT); armT = setTimeout(() => { this.armed = false; }, 4000);
            return;
          }
          this.disarm();
          const i = this.state.sheets.indexOf(this.sheet);
          this.state.sheets.splice(i, 1);
          this.state.active = this.state.sheets.length ? this.state.sheets[Math.max(0, i - 1)].id : null;
        },
        disarm() { clearTimeout(armT); this.armed = false; },
        get deleteMsg() {
          const s = this.sheet;
          if (!this.armed || !s) return '';
          return `Removes “${this.label(s, this.state.sheets.indexOf(s))}” and its ${s.readings.length} readings.`;
        },

        /* OG field: live while typing once it parses past 1.005, committed on change. */
        syncOg() { this.ogText = this.sheet ? this.sheet.og.toFixed(3) : ''; },
        setOg(v) {
          const s = this.sheet;
          s.og = v; if (s.current > v) s.current = v;
        },
        liveOg() {
          const v = G.parseGravity(this.ogText);
          if (v != null && v > 1.005) this.setOg(v);
        },
        commitOg() {
          const v = G.parseGravity(this.ogText);
          if (v != null) this.setOg(v);
          this.syncOg();
        },

        /* The dial's single way of changing the reading: clamped to the OG. */
        nudge(steps) {
          const s = this.sheet; if (!s) return;
          const v = G.r3(Math.min(Math.min(G.MAX, s.og), Math.max(G.MIN, s.current + steps / 1000)));
          if (v !== s.current) s.current = v;
        },

        /* Settings: only an in-range factor is applied, as in the prototype. */
        setWcf(str) {
          const v = parseFloat(String(str).replace(',', '.'));
          if (v >= 0.9 && v <= 1.2) this.state.wcf = v;
        },

        /* Readings */
        logReading() {
          const s = this.sheet;
          s.readings.push({ t: Date.now(), sg: s.current });
          this.logged = true;
          clearTimeout(logT); logT = setTimeout(() => { this.logged = false; }, 1200);
        },
        deleteReading(t) {
          const s = this.sheet;
          s.readings = s.readings.filter(r => r.t !== t);
        },
        get rows() {
          const s = this.sheet;
          return s ? [...s.readings].sort((a, b) => b.t - a.t) : [];
        },
        get logMeta() {
          const s = this.sheet;
          if (!s || !s.readings.length) return '';
          const n = s.readings.length;
          const days = (Date.now() - Math.min(...s.readings.map(r => r.t))) / 864e5;
          return `${n} reading${n > 1 ? 's' : ''} · day ${Math.max(0, days).toFixed(1)}`;
        },
        fmtDate: Spark.fmtDate,

        /* Chart: dependencies are read here, synchronously, so the effect
           re-runs on any change; drawing waits a tick so a box that has just
           been shown can be measured. */
        spark(box) {
          const s = this.sheet; if (!s) return;
          const pts = [...s.readings].sort((a, b) => a.t - b.t).map(r => ({ t: r.t, g: this.calcFor(s, r.sg).fg }));
          this.resizeTick;
          this.$nextTick(() => Spark.render(box.querySelector('svg'), pts, box.clientWidth - 16));
        },
      };
    });

    /* ---------- Dial input ---------- */
    // DOM nodes and timers live in the closure, not in reactive data: Alpine
    // would wrap them in proxies, and setAttribute through a proxy throws.
    Alpine.data('knob', () => {
      let K = null, drag = null, holdT1, holdT2;
      return {
        draw(svg) {
          const s = this.sheet; if (!s) return;
          if (!K) K = Knob.build(svg);
          Knob.draw(K, s.current, s.og);
        },
        down(e) {
          drag = { x: e.clientX, y: e.clientY, acc: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus({ preventScroll: true });
        },
        // 5 px = 0.001; up or right raises the value.
        move(e) {
          if (!drag) return;
          drag.acc += ((e.clientX - drag.x) - (e.clientY - drag.y)) / 5;
          drag.x = e.clientX; drag.y = e.clientY;
          const st = Math.trunc(drag.acc);
          if (st) { drag.acc -= st; this.nudge(st); }
        },
        up() { drag = null; },
        key(e) {
          const map = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
          if (map[e.key]) { e.preventDefault(); this.nudge(map[e.key]); }
        },
        // ± buttons repeat while held.
        hold(dir) {
          this.stop(); this.nudge(dir);
          holdT1 = setTimeout(() => { holdT2 = setInterval(() => this.nudge(dir), 70); }, 380);
        },
        stop() { clearTimeout(holdT1); clearInterval(holdT2); },
      };
    });
  });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
})();
