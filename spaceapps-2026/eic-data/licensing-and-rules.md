# Usage, credit and Space Apps rules for building on NASA visuals

> Snapshot: 2026-11-14, 17:15-20:50 UTC. Analysis fields were written by an AI agent from the raw NASA records and preview frames; where marked *re-checked*, a second agent independently tried to refute them. Raw facts (file names, counts, sizes, timestamps) come from scripts, not AI. Re-verify anything you build on: see `README.md`.

> This investigation was adversarially re-checked by a second agent.

## Question

What are the usage, credit and rules constraints on building a submission from NASA SVS visuals (5313, 3912, 5011, 5196) plus generated audio?

## Answer

The prior record largely holds up. You can build Earthsound v2 on SVS 5313, 3912, 5011 and 5196. The challenge text allows using SVS videos and images as data (sources/jukebox.txt line 27). NASA's media page says NASA content is generally not copyrighted and that NASA should be acknowledged as the source. The four bundles carry no third-party, music or "excised" notices. Do not put the NASA meatball, worm logotype, seal or mission logos in your own UI or demo. List every external library, font, sample and image in References. Declare AI use. Do not phrase AI-written text as "according to NASA". Open items: the 2026 Space Apps AI, watermark and branding wording has not been read from an official source (03-rules-and-deadline.md lines 59-67 and 107 are from snippets and a third-party kit). The nasa.gov "Super Intelligence" section and its Executive Order 14434 citation are unverified. I did not re-open about ten frames: I viewed 3, plus the first check that 5147 shows the meatball and GMAO. The file saved to disk has full prior findings plus checker notes.

## Findings

| # | claim | status | evidence | impact |
|---|---|---|---|---|
| 1 | NASA media guidelines text is as quoted: content generally not subject to US copyright, usable for educational or informational purposes incl. web pages; NASA should be acknowledged; factual use not implying endorsement needs no permission; Insignia, Logotype, identifiers not public domain. | verified | Re-fetched https://www.nasa.gov/nasa-brand-center/images-and-media/ today (18.6k chars of text). All quoted sentences found. Page Last Updated: Oct 27, 2026. |  |
| 2 | The nasa.gov 'Super Intelligence (SI) Applications' section exists with the prior wording (attribution to NASA not permitted, Insignia not with SI-generated imagery, SI products marked, 'according to NASA' prohibited, no implied permission). The section is framed around using NASA data for SI development. Applying it to this app's generated audio and LLM text is an inference. EO 14434 (29 Sept 2026) is cited on the page but not independently confirmed. | verified | Same fetch. 'Per the Sept. 29, 2026, Executive Order 14434...'; 'attribution of the information directly to NASA is not permitted ... does not permit our Insignia (i.e., NASA Meatball, Worm logotype, or Seal) to appear with SI generated imagery'. |  |
| 3 | Bundles with third-party imagery notice ('may not be excised or remixed'): 14367 (Pond5.com; music Universal Production Music 'The Grand Journey'), 14369 (Pond5.com and NOAA; music Downloading Landscapes and Swift Response, NOT named as UPM), 14507 (Jane Goodall Institute), 14713 (Shutterstock and Starling Photo; UPM music). 14696, 14606, 14568, 14700 name Universal Production Music music and carry truncated 'some individual ima...' boilerplate; their third-party image source is not read. 40467 matched only because it lists 14507 in its gallery. | verified | bundles/14369.md:12, 14367.md:46, 14507.md:41, 14713.md:46-47, 14696.md:47-48, 14606.md:52, 14568.md:12, 14700.md:51. grep -il for pond5\|shutterstock\|universal production\|excised\|jane goodall\|starling\|getty\|istock returned exactly: 14367 14369 14507 14568 14606 14696 14700 14713 40467 INDEX. |  |
| 4 | 5313, 3912, 5011, 5196 bundles contain no pond5, shutterstock, universal production, excised, permission, copyright, music or licens text. | verified | Grep (?i) of those terms over bundles/{5313,3912,5011,5196}.md returned No matches. |  |
| 5 | Official judging guide has the originality/copyright checkbox: all external resources (code, text, images, even open source) must be in the References field; no copyrighted music, images or text without permission. It has no logo, watermark or AI text. | verified | sources/guide-judging.txt lines 9 and 41; grep for logo\|insignia\|watermark\|AI\|copyright\|music\|reference found only those two lines. |  |
| 6 | Space Apps NASA-branding rule, AI declaration and watermark rule, and OSI licence rule are NOT confirmed from an official 2026 source. | inferred | 03-rules-and-deadline.md lines 59-67 tagged [SNIPPET] or third-party kit; line 107 says changes released 13 Nov are UNKNOWN. |  |
| 7 | Challenge text allows using SVS videos and images as data and lists 5313, 3912, 5196, 5011. | verified | sources/jukebox.txt line 27: 'Participants can use the videos and images as data for processing the audio files.' Lines 29, 30, 34, 35 name the four pages. Line 6 asks for original, generated audio. |  |
| 8 | Logos in frames: the NASA meatball plus 'GMAO' box sits top-left on GEOS daily movies; the 4 pages you build on show none in the frames viewed. The check is single-frame only, so it does not rule out end cards. | verified | Read frames/5147/fresh_g371871/first_frame.jpg: meatball and 'GMAO' top-left, '30 Oct 2026 05:00:00 EDT' bottom-left. Read frames/5313/g374656/f4_t42.00.jpg: inset maps, colour bar, no logo. Read frames/5011/g372298/f4_t99.00.jpg: yellow dots, dashed lines, no logo. Prior record also reports nlfull_0, nlfull_12, lit f_11.0, SST ecco2 and 5196 frames with no logo (not re-opened). |  |
| 9 | Prior 'logo not found in 5313, 3912, 5011, 5196 outside viewed frames' is unknown for end cards and untested times. | unknown | Only single frames inspected by both analysts. |  |

## Recommendations

- DO use frames and values from 5313, 3912, 5011, 5196 as the data (jukebox.txt line 27).
- DO credit NASA SVS as the source on the page and in References, naming each page, e.g. 'NASA Scientific Visualization Studio, SVS <id> <title>, <visualizers/scientists from the page Credits>, https://svs.gsfc.nasa.gov/<id>/'. Use the per-page credit lines in the prior record's last-but-one recommendation.
- DO list every library, font, soundfont and image in References (official checkbox, guide-judging.txt lines 9 and 41).
- DO declare AI use and mark AI-generated products as such. The wording of the 2026 field and watermark rule is unconfirmed; have a teammate read the official 2026 submission guide in a browser before submitting.
- DO NOT put the NASA meatball, worm, seal or mission logos in your UI, thumbnails, demo video or slides. DO NOT use GEOS 5147-5154 frames uncropped.
- DO NOT use frames or audio from SVS pages 14367, 14369, 14507, 14713 (and treat 14696, 14606, 14568, 14700 as same-risk until the image source is read) as excised or remixed assets. DO NOT use any SVS music (UPM etc.) or the 13786 SYSTEM Sounds audio.
- DO NOT write 'according to NASA' in AI-written text or imply NASA review, endorsement or partnership. Add: 'Earthsound is an independent project made for NASA Space Apps 2026; it is not endorsed by NASA.'
- DO pick an OSI-approved licence for the repo (inferred from a third-party kit).

## Open questions

- What does the official 2026 Project Submission Guide say about AI disclosure, watermarking and NASA branding?
- Which third-party image source do 14696, 14606, 14568 and 14700 name in their truncated notice?
- Do 5313, 3912, 5011 or 5196 movies have end cards or logos at times not viewed?
- Is EO 14434 real and current, and does the SI section apply to hackathon submissions?
- Which dataset names does each of the four bundles list under 'Datasets credited by NASA'? Copy them into References.

## Corrections made by the checking agent

- 14369 third parties corrected to Pond5.com and NOAA (bundles/14369.md:12); its music is Downloading Landscapes and Swift Response, not UPM as the prior table said.
- 14696, 14606, 14568, 14700: prior table said 'none read'; they carry the 'some individual ima...' excised boilerplate (14696.md:48), third-party image source unread.
- Resolved open question: 40467 matches only via the 14507 title in its gallery listing.
- Scoped the nasa.gov AI section: it is guidance for SI development using NASA data, and EO 14434 stays unverified; applying it to this app's audio and text is inference (page last updated Oct 27, 2026).
- Added a limit to the logo claim: the check is single frames, so end cards and untested times are unknown (re-viewed 5147, 5313 t=42, 5011 t=99).
- Prior recommendation 'DO NOT use ... or use only the visuals' was self-contradictory; replaced with a single do-not rule for flagged pages. Saved to analysis/investigate/licensing-rules.checked.json.
