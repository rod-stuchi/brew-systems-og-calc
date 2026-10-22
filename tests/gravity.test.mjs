// The handoff's check values, against the same gravity.js the page loads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import G from '../static/js/gravity.js';

const close = (actual, expected, places) =>
  assert.equal(actual.toFixed(places), expected.toFixed(places), `${actual} ≉ ${expected}`);

test('check values: OG 1.062, reading 1.044, wcf 1.04', () => {
  const notes = G.calc(1.062, 1.044, 1.04, 'notes');
  close(notes.fg, 1.0338, 4);
  close(notes.abv, 3.704, 3);
  close(G.calc(1.062, 1.044, 1.04, 'old').fg, 1.0305, 4);
  close(G.calc(1.062, 1.044, 1.04, 'new').fg, 1.0273, 4);
});

test('attenuation and points follow from FG', () => {
  const c = G.calc(1.062, 1.044, 1.04, 'old');
  close(c.att, (1.062 - c.fg) / 0.062 * 100, 6);
  close(c.pts, (c.fg - 1) * 1000, 6);
});

test('an unknown formula falls back to the classic cubic', () => {
  assert.equal(G.calc(1.062, 1.044, 1.04, 'bogus').fg, G.calc(1.062, 1.044, 1.04, 'old').fg);
});

test('parseGravity accepts every form the OG field takes', () => {
  for (const s of ['1.062', '1,062', '1062', '62', ' 1.062 ']) assert.equal(G.parseGravity(s), 1.062, s);
});

test('parseGravity rejects junk and out-of-range values', () => {
  for (const s of ['', 'abc', '1.5', '0.5', '1300']) assert.equal(G.parseGravity(s), null, s);
});
