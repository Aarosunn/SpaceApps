#!/usr/bin/env node
// Check what the Jukebox tab will actually play: for each layer in grids.json, how many cells are empty,
// how many different pitches the map uses, and what a few well-known places sound like.
// It runs the site's own freqFromUnit(), with the same scaling explore.js uses: (value - min) / (max - min).
//
// Usage: node grid_audit.mjs <path/to/site/js/sound.js> <path/to/site/data/grids.json>
// A healthy layer uses many pitches and puts bright cities well above empty land and sea.
// Tested on Node 24 against the sound.js in plans/2026-11-14-earthsound-v2.md.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [soundPath, gridsPath] = process.argv.slice(2);
if (!soundPath || !gridsPath) {
  console.error('usage: node grid_audit.mjs <sound.js> <grids.json>');
  process.exit(1);
}
const { freqFromUnit } = await import(pathToFileURL(resolve(soundPath)).href);
const { step, layers } = JSON.parse(readFileSync(gridsPath, 'utf8'));

const PLACES = [['Chicago', 41.9, -87.6], ['Tokyo', 35.7, 139.7], ['Dhaka', 23.8, 90.4], ['Sahara', 23, 10],
  ['mid-Atlantic', 30, -40], ['central Pacific', 0, -140], ['Southern Ocean', -60, 0]];
const pct = (k, n) => `${(100 * k / n).toFixed(1)}%`;

for (const layer of layers) {
  const rows = layer.values;
  const cell = (lat, lon) => rows[Math.min(rows.length - 1, Math.floor((90 - lat) / step))][Math.min(rows[0].length - 1, Math.floor((lon + 180) / step))];
  const hz = (v) => (v === null ? null : Math.round(freqFromUnit((v - layer.min) / (layer.max - layer.min)) * 10) / 10);
  const pitches = new Map();
  let empty = 0, n = 0;
  for (const row of rows) for (const v of row) {
    n++;
    if (v === null) empty++;
    else pitches.set(hz(v), (pitches.get(hz(v)) || 0) + 1);
  }
  const sorted = [...pitches.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n${layer.id} "${layer.label}"  min ${layer.min}  max ${layer.max}  cells ${n}`);
  console.log(`  empty cells (silent, read out as no data): ${empty} (${pct(empty, n)})`);
  console.log(`  different pitches used: ${sorted.length}; the two most common cover ${pct((sorted[0]?.[1] || 0) + (sorted[1]?.[1] || 0), n - empty)} of the cells that sound`);
  console.log('  most common: ' + sorted.slice(0, 5).map(([f, k]) => `${f} Hz ${pct(k, n - empty)}`).join(', '));
  console.log('  places: ' + PLACES.map(([name, lat, lon]) => `${name} ${cell(lat, lon) === null ? 'empty' : `${cell(lat, lon)} -> ${hz(cell(lat, lon))} Hz`}`).join('; '));
}
