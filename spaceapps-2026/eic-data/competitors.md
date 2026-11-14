# What other 2026 Jukebox teams are building

> Snapshot: 2026-11-14, 17:15-20:50 UTC. Analysis fields were written by an AI agent from the raw NASA records and preview frames; where marked *re-checked*, a second agent independently tried to refute them. Raw facts (file names, counts, sizes, timestamps) come from scripts, not AI. Re-verify anything you build on: see `README.md`.

> This investigation was adversarially re-checked by a second agent.

## Question

What are other 2026 teams building for the Earth Information Jukebox, and what does nobody do?

## Answer

The original conclusion mostly holds. The crowd is large but shallow, and almost all repos were created 2026-11-13 or 2026-11-14. In the READMEs read, no one combines a free cursor that hears the value under the pointer on frames from SVS 5313, 3912 and 5011 with a daily date-seeded ear-training game. No README claims blind or low-vision listener testing. Corrections: the SVS id usage counts did not reproduce and are now unknown. eluaden's pixel-to-value decoding is shipped, not "soon". VidhantSingh's four SVS pages are only links, and its demo scenes are synthetic. The corrected record is saved at <evidence>/analysis/investigate/competitors.checked.json.

## Table

| Repo | Data | Mechanic | Created |
|---|---|---|---|
| VidhantSingh-lab/earth-jukebox | links to 5313, 3912, 5196, 5011; synthetic demos | image-feature mapping and scan sweep | 2026-11-14 |
| eluaden/earth-jukebox | 5175 and 5235 real frames, legend decode | regional means, drone/texture/pulse layers, audio legend | 2026-11-14 |
| Popop3325/The-Earth-Information-Jukebox | 5544 NDVI | colour to NDVI, score, game | not checked |

## Findings

| # | claim | status | evidence | impact |
|---|---|---|---|---|
| 1 | Search volume is high and nearly all repos are new. | verified | gh search repos 'earth jukebox' --created >=2026-10-01 --limit 40 returned 40 repos (the cap), almost all created 2026-11-13 or 2026-11-14. The search rate limit was 30, with 30 remaining. |  |
| 2 | VidhantSingh-lab/earth-jukebox lists 5313, 3912, 5196 and 5011 as links, but its demo scenes are synthetic. | verified | README lines 102-108 list the four pages. Line 15 says the Ocean Flow, Night Lights and CO2 demo scenes are synthetic and not NASA observations. Created 2026-11-14T11:57Z, pushed 12:10Z. Its scan sweep and feature mapping use image statistics, not values under a cursor. |  |
| 3 | eluaden/earth-jukebox ships legend-based pixel-to-value decoding, on other SVS pages. | verified | README lines 89-110 describe working in-browser extraction (src/data/extract.js) for SVS 5175 (TEMPO NO2, 12 scans) and SVS 5235 (sea level, 91 frames). It maps each pixel to the nearest legend colour and states about plus or minus 1 unit. It reads regional means around city labels, not a free cursor. Created 2026-11-14T16:03Z, pushed 20:18Z. The analyst's '(soon)' came from a stale table row; the README is internally inconsistent on this. |  |
| 4 | SVS id usage counts (3912=27, 5011=22, 5313=21, 5196=19) are not reproducible. | unknown | gh search code 'svs.gsfc.nasa.gov/5313' --limit 100 returned 1 distinct repo in my run, not 21. Code search is unstable. |  |
| 5 | Popop3325 uses SVS 5544 NDVI (900 days), decodes colour to NDVI, and includes a game. | verified | README lines 5, 12, 31, 47 and 63. How the game works, and whether it is date-seeded, is not in the README. |  |
| 6 | No README read mentions blind or low-vision listener testing, or a daily date-seeded challenge. | inferred | Checked the three README greps this run, plus the analyst's twelve-README grep. This is README-level evidence only, and demo videos were not checked. |  |

## Recommendations

- Lead the demo with a free cursor that plays the value under it, with legend decoding, on 5313, 3912 and 5011. No README read does this on these pages.
- Make the daily date-seeded 5-round ear-training challenge a headline feature. No README read mentions one.
- Get 2 to 3 blind or low-vision listeners to try it before Sunday, and quote them.
- Add an audio legend (hear lowest and highest) and an integrity note. eluaden already has the audio legend, so match it on honesty.
- Do not claim to be first to use SVS 5313, 3912, 5011 or 5196. VidhantSingh links them, though it ships no real data from them.
- Do not cite SVS id popularity rankings until the code-search counts are reproduced.

## Corrections made by the checking agent

- SVS id usage counts downgraded to unknown: my re-run of gh search code for 5313 returned 1 repo, not 21.
- eluaden pixel-to-value extraction is shipped, not just 'soon' (README lines 89-110, SVS 5175 and 5235). It does not use our pages. The repo was pushed 2026-11-14T20:18Z.
- VidhantSingh's four pages are links only; its demo scenes are synthetic (README line 15). Created 2026-11-14T11:57Z.
- Removed the recommendation to re-run the 5176 and 4950 counts, and added a recommendation to position against eluaden on honesty.
- Reconfirmed the search-volume finding: 40 repos returned, hitting the cap.
