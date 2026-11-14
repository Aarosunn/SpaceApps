#!/usr/bin/env node
// Print what each seed's daily challenge contains, so test and demo seeds can be chosen with a fair mix.
// It runs the site's own dailyRounds(), so it stays right when the round order or the pools change.
//
// Usage: node seed_audit.mjs <path/to/site/js/game.js> <path/to/site/data/rounds.json> [first seed=101] [last seed=110]
// Tested on Node 24 against the game.js in plans/2026-11-14-earthsound-v2.md.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [gamePath, roundsPath, first = '101', last = '110'] = process.argv.slice(2);
if (!gamePath || !roundsPath) {
  console.error('usage: node seed_audit.mjs <game.js> <rounds.json> [first seed] [last seed]');
  process.exit(1);
}
const { dailyRounds } = await import(pathToFileURL(resolve(gamePath)).href);
const pools = JSON.parse(readFileSync(roundsPath, 'utf8'));

const tally = {}, optionSets = {};
for (let seed = Number(first); seed <= Number(last); seed++) {
  const rounds = dailyRounds(pools, seed);
  console.log(seed, rounds.map((r) => `${r.type}=${r.answer}`).join(' | '));
  for (const r of rounds) {
    tally[r.type] ??= {};
    tally[r.type][r.answer] = (tally[r.type][r.answer] || 0) + 1;
    (optionSets[r.type] ??= new Set()).add([...r.options].sort().join('|'));
  }
}
// For round types whose choices never change (Brighter/Dimmer, the two summers, the four layers):
// how well "always give the same answer" would score on these seeds.
for (const [type, counts] of Object.entries(tally)) {
  if (optionSets[type].size !== 1) continue;
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  const top = Math.max(...Object.values(counts));
  console.log(`${type}: ${JSON.stringify(counts)}; always giving one answer scores ${Math.round((100 * top) / n)}%`);
}
