/* Refractometer correction math. Pure — no DOM, no state — so the page and
   `node --test` load the same file. Formulas are copied verbatim from the
   prototype; "notes" is the user's own and stays exactly as written. */
(function (root) {
  const MIN = 0.990, MAX = 1.130;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  const brix = (sg, wcf) => ((((182.4601 * sg - 775.6821) * sg + 1262.7794) * sg - 669.5622)) / wcf;
  const FORMULAS = {
    old: (ob, rb) => 1.001843 - 0.002318474 * ob - 0.000007775 * ob ** 2 - 0.000000034 * ob ** 3
                     + 0.00574 * rb + 0.00003344 * rb ** 2 + 0.000000086 * rb ** 3,
    new: (ob, rb) => 1.0000 - 0.0044993 * ob + 0.011774 * rb + 0.00027581 * ob ** 2
                     - 0.0012717 * rb ** 2 - 0.0000072800 * ob ** 3 + 0.000063293 * rb ** 3,
    notes: (ob, rb) => 1.001843 - 0.0023184 * ob + 0.000007775 * ob ** 2 - 0.000000034 * ob ** 3
                     + 0.00574 * rb + 0.00003344 * rb ** 2 + 0.000000086 * rb ** 3,
  };
  const NOTES = {
    old: 'The widely published form of Sean Terrill\'s cubic, using original and current Brix. Each Brix value is divided by the correction factor first.',
    new: 'Terrill\'s 2011 refit from a larger data set. Usually reads a few points lower than the classic cubic mid-fermentation.',
    notes: 'Exactly what is in your Apple Note. It has a plus sign on the original-Brix squared term, where the published formula has a minus, so it reads higher.',
  };

  function calc(og, sg, wcf, formula) {
    const ob = brix(og, wcf), rb = brix(sg, wcf);
    const fg = (FORMULAS[formula] || FORMULAS.old)(ob, rb);
    const abv = (og - fg) * 131.25;
    const att = og > 1 ? (og - fg) / (og - 1) * 100 : 0;
    return { ob, rb, fg, abv, att, pts: (fg - 1) * 1000 };
  }

  // Accepts "1.062", "1,062", "1062" and "62".
  function parseGravity(str) {
    let n = parseFloat(String(str).trim().replace(',', '.'));
    if (!isFinite(n)) return null;
    if (n >= 990 && n <= 1200) n = n / 1000;
    else if (n >= 2 && n < 200) n = 1 + n / 1000;
    if (n < 0.98 || n > 1.2) return null;
    return r3(n);
  }

  const api = { MIN, MAX, r3, brix, FORMULAS, NOTES, calc, parseGravity };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Gravity = api;
})(globalThis);
