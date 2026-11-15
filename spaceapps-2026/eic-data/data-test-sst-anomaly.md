# Data test: can EIC frame pixels be turned back into real numbers?

> Run on Sat 14 Nov 2026, about 19:35–19:45 UTC, on one laptop. Script-computed; no AI judgement in the numbers.
> Source: SVS 5176 "Sea Surface Temperature (SST) Anomaly – Near Real Time", in the EIC gallery's Daily Visualizations section.

## Result

**Yes.** Reading only the pixels of NASA's movie, and NASA's published colour bar for it, gives a daily temperature series
for any region of the ocean. For the region climate scientists use to define El Niño (Niño 3.4: 5°N–5°S, 170°W–120°W)
the decoded series shows a clear event:

| Month | Decoded anomaly (°C) | | Month | Decoded anomaly (°C) |
|---|---:|---|---|---:|
| 2024-06 | +0.43 | | 2025-11 | −0.73 |
| 2024-09 | −0.39 | | 2026-01 | −0.19 |
| 2024-12 | −0.68 | | 2026-03 | +0.51 |
| 2025-03 | +0.47 | | 2026-05 | +1.43 |
| 2025-06 | +0.06 | | 2026-07 | +2.56 |
| 2025-09 | −0.54 | | 2026-09 | +3.27 |
| | | | 2026-10 | +3.35 |

Through 2024 and 2025 the monthly value drifts between about −0.7 and +0.5 °C. From January 2026 it rises every month
until October, and every day since 9 Aug 2026 has been above +3 °C. The lowest day is 26 Aug 2025 (−1.15 °C); the highest are 26 Sep and 3 Oct 2026 (both +3.44 °C).
Day to day the value moves by 0.05 °C on average, so the series is smooth enough to drive sound without sounding like noise.

All 901 daily values for three regions are in `data/sst-anomaly-5176-decoded.csv`
(columns: frame, date, nino34, north_atlantic, tropics_all).

## Checked against NOAA's official index

NOAA publishes a weekly Niño 3.4 anomaly computed from its own sea-temperature analysis:
https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for (public text file, fetched today).
For each of the **128 NOAA weeks** from 29 May 2024 to 4 Nov 2026, the seven decoded daily values centred on that week were averaged and compared.

| Measure | Value |
|---|---|
| Correlation (Pearson r) | **0.984** |
| Mean absolute difference | 0.24 °C |
| Mean of (decoded − NOAA) | +0.18 °C |
| Largest weekly gap | 0.66 °C (week of 1 Apr 2026: NOAA +0.1, decoded +0.76) |
| Range, NOAA | −1.1 to +3.4 °C |
| Range, decoded from frames | −1.00 to +3.41 °C |

So the curve read off the EIC pictures follows the official index closely. The decoded values run about 0.2 °C warm.
That is not surprising: NASA's picture uses a different temperature analysis (JPL MUR) from NOAA's index, possibly a different
baseline period (NASA's page does not state its baseline, so this is a guess), and the decoding passes through a compressed image.
Quote the correlation; do not present the decoded values as measurements. NOAA's index is not NASA data: list it in References if it is quoted.
A fact-checking agent re-ran `tools/datatest_sst.py` on the saved frames and got this CSV back exactly.
The week-by-week pairs are in `data/nino34-decoded-vs-noaa.csv`.

## Why this matters for the build

- It proves the chain **frame → date → place → physical value → sound** is real for at least one EIC product. The sound can be driven by degrees Celsius, not by raw brightness.
- It gives the project an honest validity check that is already done: the decoded curve matches NOAA's published Niño 3.4 index with a correlation of 0.984 (next section).
- The whole test, from NASA's URL to the table, took about five minutes of machine time.

## Method

1. Re-encode NASA's "no dates" movie to 1024×512 and dump its 901 frames as 512×256 JPEGs (the two `ffmpeg` commands in `../06-eic-data-breakdown.md`, section 6). Took 128 s and 7 s.
2. Read NASA's colour bar image for this product: https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/sst_mur_anomaly_auto_colorbar_01_print.jpg . It runs from −4 °C (dark blue) through 0 (white) to +4 °C (dark red), with ticks every 1 °C. Sample the colours along the bar to make a table of colour → °C.
3. For each frame, take the pixels inside the region, give each pixel the °C value of the nearest colour on the bar, and average.
4. Date of frame k (counting from 0) = 11 Nov 2026 − (900 − k) days. The newest date comes from the newest file name in NASA's frame folder (`sst_mur_anomaly_20261111.exr`).

The map is equirectangular with Greenwich in the centre, so longitude and latitude convert to pixels linearly:
x = (lon + 180) / 360 × width, y = (90 − lat) / 180 × height.

Reproduce: `tools/datatest_sst.py <frames_dir> <colorbar.jpg> 2026-11-11 out.csv` (needs numpy and Pillow; 2.6 minutes).

## Limits — read before quoting a number

- **Approximate.** The colours pass through a 512×256 JPEG and a video codec. The average distance between a pixel and its nearest bar colour was 17 on a 0–441 scale: close, not exact. Treat values as good to a few tenths of a degree.
- **Clipped at ±4 °C.** The bar ends there, so stronger anomalies read as 4.
- **Checked for one region only.** The NOAA comparison covers Niño 3.4. The North Atlantic and all-tropics series below have not been compared with anything.
- **NOAA is not a NASA source.** Using its index as a check is fine and should be listed in References; the sound itself should still come from the EIC frames.
- **Rolling window.** NASA's movie always holds the latest 901 days. Re-running tomorrow shifts every frame number by one. Dates, not frame numbers, are the stable key.
- **This is the picture's data, not NASA's data file.** The underlying dataset is JPL's MUR sea surface temperature analysis. If exact values matter, that is the source; the picture is what the challenge asks us to sonify.

## Other regions in the same run

- North Atlantic (60°N–40°N, 50°W–20°W): about +1.3 °C through late 2024, falling to about −1.1 °C in September 2025, and between −0.9 and +0.5 °C since.
- All tropical oceans (20°N–20°S): +0.9 °C in mid-2024, down to +0.3 °C in late 2025, back up to +1.4 °C in November 2026.
