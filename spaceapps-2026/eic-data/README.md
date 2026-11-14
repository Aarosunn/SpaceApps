# eic-data — everything we know about NASA's EIC content, saved for people and agents

Snapshot: **Saturday 2026-11-14, 17:15–20:50 UTC** (12:15–15:50 Eastern). Built for the Jukebox challenge.
Start with `../06-eic-data-breakdown.md` (the plain-language answer) and `../07-earthsound-spec-check.md` (the Earthsound v2 spec checked against this evidence).
This folder is the evidence behind them.

"EIC" = NASA's **Earth Information Center**. Its content lives on NASA's Scientific Visualization Studio (SVS) site as
gallery 40467: https://svs.gsfc.nasa.gov/gallery/earth-information-center/ . Every SVS page has a numeric id
(for example 5176) and a public JSON record at `https://svs.gsfc.nasa.gov/api/<id>`.

## How much to trust each file

| Trust level | Meaning | Files |
|---|---|---|
| **Script** | Copied or computed by a script from NASA's servers. No AI judgement. Re-runnable. | `gallery-tree.md`, `frame-sets.md`, `dated-frame-sets.md`, `movies.md`, `data-test-sst-anomaly.md` and `data/`, and the "Raw NASA record" half of every `pages/<id>.md` |
| **Browser capture** | Read off the live official Space Apps site in a real browser. | `../sources/live-official-site-2026-11-14.md` |
| **AI, re-checked** | Written by one AI agent from the raw records and from frames it looked at, then attacked by a second agent whose job was to refute it. Corrections are listed at the bottom of each sheet. | The analysis half of 34 page sheets: 3912, 4285, 4897, 4950, 4960, 4993, 5011, 5046, 5064, 5067, 5072, 5099, 5101, 5113, 5120, 5147, 5148, 5149, 5150, 5151, 5152, 5153, 5154, 5176, 5196, 5313, 5315, 5425, 5533, 5544, 5577, 5584, 5669, 13786 |
| **AI, single pass** | One agent, no second check. Each cites its evidence (file and line, or what a frame shows). | The analysis half of 50 page sheets: 4170, 4685, 4810, 4889, 4968, 4983, 5041, 5047, 5054, 5058, 5081, 5087, 5097, 5098, 5107, 5110, 5111, 5115, 5116, 5117, 5118, 5119, 5121, 5126, 5175, 5190, 5191, 5207, 5209, 5235, 5382, 5453, 10480, 10721, 12647, 12772, 13417, 13543, 14367, 14369, 14371, 14507, 14568, 14606, 14696, 14700, 14713, 20322, 30521, 31196. Also `catalog.md`, `official-resources.md`, `doc-review/`, `gallery-explained.md`, `panel/` |

Each page sheet says at its top which of these it is. If you are about to build on a number, re-check it (commands below). It takes seconds.

`06-eic-data-breakdown.md` and `07-earthsound-spec-check.md` were fact-checked by five further agents; what they found and what was changed is in `fact-check.md`.

**History.** The first analysis run (Claude Fable agents) stopped when its usage allowance ran out, after the document reviews and 31 page analyses. A second run (Claude Sonnet agents, shorter time budgets) did the remaining page analyses, the second-agent re-checks, the fact-check, the competitor and licensing scans and the review of the Earthsound v2 spec. Sonnet-run items are shallower than the first run's; the page sheets do not say which run wrote them, but the ten named resources, the Dixie fire page and 20 daily pages were analysed in the first run. Nothing in either run involved listening to a sound or testing on a device.

## Files

| File | What it answers |
|---|---|
| `catalog.md` | One row per analysed page: what it is, **what one frame equals**, whether it is one frame per day, where the date comes from, whether it is still updating. |
| `dated-frame-sets.md` | Every frame folder whose **file names carry a date or time**: cadence, first and newest date, gaps, file format. This is the "when do we get the dates" table. |
| `official-resources.md` | The 10 SVS pages named in the challenge, one by one, in full. |
| `data-test-sst-anomaly.md` | A worked test: frames of SVS 5176 decoded to degrees Celsius and compared with NOAA's index (r = 0.984). |
| `data/` | The numbers from that test: 901 daily decoded values for three ocean regions, and the weekly comparison with NOAA. Also `lightning-40-frames-dated.csv`: NASA's date for each of the 40 lightning frames the Earthsound spec uses, beside the plan's own north/south counts and answer key. |
| `fact-check.md` | What five fact-checking agents found wrong or unsupported in `06` and `07`, and, in the table at its end, what was done about each. |
| `panel/spec-issues.md`, `panel/spec-gaps.md` | Two critics' lists for the Earthsound v2 spec and plan: issues, and missing information. |
| `panel/improvements.md`, `panel/judge.md` | Proposed improvements to Earthsound v2 (each three engineer-hours or less) and a judge's ranking: do now, do if time, do not. |
| `competitors.md` | What other 2026 Jukebox teams are building, from their public repositories. |
| `licensing-and-rules.md` | Usage, credit and Space Apps rules for building on NASA visuals. |
| `gallery-explained.md` | What the EIC is and how the gallery is organised. |
| `gallery-tree.md` | The full gallery tree: every page, its section, release and update dates. |
| `frame-sets.md` | All 200 frame folders: file counts, formats, first and last file names, whether the folder can be listed. |
| `movies.md` | All 561 movie files: pixels, duration, frame rate, frame count, codec, audio, size, Last-Modified, URL. |
| `pages/<id>.md` | One sheet per SVS page (94): the analysis on top where there is one, the complete raw NASA record underneath. |
| `doc-review/` | Structured reads of the team's older documents: `spec.md` (the challenge text), `rules.md` (rules and deadline, read against the live 2026 guides), `winners.md` (what wins), `plan.md` (the Phase 1 plan and its assumptions), `other-challenges.md` (the other 13 challenges and fallbacks). |
| `tools/` | The scripts that produced the script-level files (standard-library Python, plus ffmpeg, numpy and Pillow for the frame and data-test scripts), and two Node scripts that check an Earthsound build by running the site's own code: `seed_audit.mjs` (what each seed's rounds are) and `grid_audit.mjs` (what the Jukebox map plays). |

## Re-check a claim yourself

All of these work without a login. Replace the ids and URLs.

```bash
# The page record (title, description, datasets, every media file)
curl -s -A "Mozilla/5.0" https://svs.gsfc.nasa.gov/api/5176 | python -m json.tool | less

# What is in a frame folder right now (file names carry the dates)
curl -s -A "Mozilla/5.0" "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/frames/4096x2048_2x1_30p/sst_mur_anomaly/" | grep -o 'sst_mur_anomaly_[0-9]*\.exr' | sort -u | tail -3

# When a file was last re-rendered, and how big it is
curl -sI -A "Mozilla/5.0" "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/sst_anomaly_30_sec_4096x2048_2x1_30p.mp4" | grep -i -E "last-modified|content-length"

# Duration, frame rate and codec of a movie without downloading it (needs ffmpeg)
ffmpeg -hide_banner -i "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/sst_anomaly_30_sec_4096x2048_2x1_30p.mp4" 2>&1 | grep -E "Duration|Video:"

# A few frames from a movie without downloading it
tools/frames.sh "<movie url>" out 5

# The cross-origin header (this is why a web page cannot read SVS pixels directly)
curl -sI -A "Mozilla/5.0" -H "Origin: https://example.github.io" https://svs.gsfc.nasa.gov/api/5176 | grep -i access-control
```

## Rebuild the script-level files

```bash
python -I tools/crawl_svs.py     <evidence_dir>          # gallery tree -> raw JSON per page   (about 2 minutes, 94 requests)
python -I tools/collect_media.py <evidence_dir>          # download menus, frame-folder listings, file headers (about 5 minutes)
python    tools/probe_movies.py  <evidence_dir>          # optional: duration/fps/codec of every movie (needs imageio-ffmpeg)
python -I tools/build_bundles.py <evidence_dir>          # one raw evidence sheet per page
python -I tools/render_static.py <evidence_dir> . "<snapshot label>"                    # gallery-tree.md, frame-sets.md, movies.md
python -I tools/render_dated.py  <evidence_dir> . "<snapshot label>" 2026-11-14T19:15:00   # dated-frame-sets.md
python    tools/datatest_sst.py  <frames_dir> <colorbar.jpg> <newest date> out.csv        # the pixel-to-temperature test
python    tools/lightning_dates.py ../notes/feasibility/data/lit labels.txt out.csv        # NASA's date for each lightning frame (needs numpy, Pillow)
```

`labels.txt` for the last command is https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005011/labels.txt (download it first).

`<evidence_dir>` is any empty folder. The scripts are polite (cached, a few requests at a time). Please keep them that way:
NASA started timing out our connections when about 20 ran at once.

## Check an Earthsound build

Two scripts run the site's own JavaScript, so they stay right when that code changes. `<site>` is the folder that holds `js/` and `data/`.

```bash
node tools/seed_audit.mjs <site>/js/game.js <site>/data/rounds.json 101 110   # each seed's five rounds, and whether one answer dominates
node tools/grid_audit.mjs <site>/js/sound.js <site>/data/grids.json           # pitches each Jukebox layer uses, share of empty cells, a few named places
```

## Things that will bite you (all verified on 2026-11-14)

- **The scripts cannot reach spaceappschallenge.org** (no TLS connection for non-browser clients). Use a browser for that site.
- **SVS answers plain HTTP requests fine**, but sends `Access-Control-Allow-Origin` for a single unrelated origin. A web page on another domain can *play* an SVS video, but cannot read its pixels or fetch the SVS API. Copy the media you need into your own site.
- **Frame folders are mostly EXR** (343,555 of the 491,570 files in the 187 top-level folders). Browsers and most image libraries cannot open EXR. PNG and JPEG folders exist for some products.
- **A movie with no date on screen may still have a date table beside it.** The flat lightning movie (5011) has `labels.txt` and the ocean-currents movie (3912) has `flat_ecco2_dates.txt`, one line per frame. The first analysis of 5011 missed its table. Look at the page's folder before deciding a movie cannot be dated.
- **A re-check agent's correction to a file table is recorded as a note under "Gotchas", not applied to the table.** Read the gotchas of a page sheet before trusting its table.
- **"Updated daily" is per file, not per page.** On several daily pages the `.mp4` is re-rendered every day while the `.webm` copy or the frame folder is months or years old. Check `Last-Modified`.
- **Daily files change under you.** Anything in this folder about "newest date" was true at the snapshot time only.
- **Time zones differ by product.** File-name timestamps are UTC. Labels burned into the GEOS weather and air-quality movies are US Eastern time.

## Local-only evidence (not in the repository)

The laptop that produced these files keeps a local evidence folder, written `<evidence>/` wherever an agent cites it here. It holds the raw API JSON for all 94 pages,
the saved page HTML, about 1,400 preview frames extracted from the movies, the agents' structured outputs,
and the scripts the critic agents used to run the plan's code (`tmp/specsim/`, `tmp/critic_gaps_*.py`).
It is about 290 MB. The script-level part is rebuilt by the commands above, so it was left out of the repository on purpose.
A citation such as `<evidence>/bundles/5176.md` cannot be opened from the repository; the same raw record is the lower half of `pages/5176.md`.
