# Builder brief (one screen per builder)

Project: EarthFM, Next.js 16 app at /home/aaron/Dev/Hackathons/SpaceApps/EarthFM (App Router, TypeScript, CSS Modules, NO Tailwind).
Read EarthFM/AGENTS.md (Next 16 differs from training data; docs in EarthFM/node_modules/next/dist/docs/).
Figma file key: UcoiUivzN5RV7I2PC4GK6L. Each frame is 1440x900. The main screen (node 28:107) is already built.

## Read first
- EarthFM/screens/Main.tsx and every file in EarthFM/components/ (Stage, Scrim, MapLayer [RouteLegs, Plane, Boat, PinCursor, HoverCard, MainRoute], MapDot, TopLeft, Mixtape [+ShowPlaylistTab], Player [NowListening, SoundPlayer, ShowControls], YearPicker, LiveCaption, Icon [Icon, BleedAsset], asset.ts).
- globals.css tokens (--ink, --paper-80, --lime, ...). Fonts: Geist (var(--sans)), DM Mono (var(--mono)) are already loaded.
- Your reference image: UI/reference/<slug>.png (use the Read tool to view it).

## Get the design
1. Invoke the Skill tool with skill "figma:figma-design-to-code" BEFORE calling get_design_context (mandatory).
2. Load Figma tools with ToolSearch ("select:mcp__plugin_figma_figma__create_session,mcp__plugin_figma_figma__get_design_context,mcp__plugin_figma_figma__get_screenshot").
3. create_session(fileKey, "Build <slug> screen in EarthFM"), then get_design_context(fileKey, nodeId, sessionId, clientFrameworks "react,nextjs", clientLanguages "typescript,css", skillNames "figma-design-to-code"). If a response is sparse, request the visible child nodes too.

## Assets
- Download EVERY asset URL in the response with curl -L into EarthFM/public/figma/<slug>/ .
- If a downloaded file is byte-identical (`cmp`) to one already in EarthFM/public/figma/ (top level), use the existing path and delete your copy.
- Reference assets via the asset() helper: `asset("/figma/<slug>/file.svg")`. Never leave temporary figma.com URLs in code.

## Where you may write (strict: other builders run in parallel)
- ONLY: EarthFM/screens/<Component>.tsx (your screen file, replace its placeholder) and NEW files under EarthFM/components/<slug>/ .
- Do NOT edit any other existing file (shared components, registry, globals.css, layout, config). If a shared component needs a different variant, make a local component in components/<slug>/ (copy + change). Reuse shared components unchanged where they match exactly.
- Keep the same approach as Main: <Stage> artboard, absolute positions for overlays, flex inside panels, CSS Modules, design values from get_design_context exactly. Accessible markup: real <button>s, aria-labels, aria-live for captions.

## Verify (loop until good, max ~5 passes)
- Dev server is ALREADY running on :3000 (do not start/stop it). Your route: http://localhost:3000/screens/<slug>
- Run: `node /home/aaron/Dev/Hackathons/SpaceApps/UI/tools/check.mjs <slug>` -> prints pixel diff % and writes UI/tools/tmp/<slug>.png and tmp/<slug>-diff.png.
- Read both your screenshot and the reference image and compare carefully region by region (text content, positions, sizes, colors, icons, layering). Fix and re-run.
- Target: pixel diff <= 3% AND no visible differences except font anti-aliasing. Note: ~1% is the floor from font rendering.
- Finally run `cd /home/aaron/Dev/Hackathons/SpaceApps/EarthFM && npx tsc --noEmit` and fix errors in YOUR files only.
- Do not git commit. Do not run `next build`.

## Report (final reply, under 150 words)
Final diff %, files created, any remaining mismatch you could not fix and why. Be honest; do not round up.
