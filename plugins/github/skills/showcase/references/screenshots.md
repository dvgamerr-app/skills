# Capturing screenshots from mock data

Goal: realistic, safe, reproducible screenshots without touching real data.

## Plan

1. **Isolated data.** Create a database outside the repo (the scratchpad directory), run the
   project's migrations against it, and seed it with a script kept in the scratchpad. Use
   fictional names (bilingual if the audience is, for example Thai and English), fake IDs and
   tokens, and spread timestamps so lists look alive. Include variety: an active item, an
   inactive one, a failing one, a selected one.
2. **Run the app locally** with its documented development auth bypass and the temporary
   database. Pass empty values for any real credentials so the user's `.env` does not apply.
   Never print `.env`.
3. **Drive a real browser** with Playwright installed in the scratchpad only (never add it to the
   repo). An installed Chrome via `executablePath` avoids a browser download. Viewport 390x844
   at device scale 2 for mobile-first apps; wait for network idle and fonts.
4. **Mock what cannot work offline** with route interception (third-party quota calls and so on).
   Remove ugly error banners. Write down every such tweak so the report can disclose it.
5. **Optimise.** Quantise PNGs (sharp `palette: true`, 128 colours) to stay under about 100 KB.
6. **Look at them** with the Read tool. Check for spinners, dev overlays, localhost URLs in
   visible text, cut-off content and real data.
7. **Clean up.** Stop every server; confirm the dev ports are free; `git status` should show only
   the new image files.

## File names

Keep stable names that the README and site reference: `bots.png`, `rooms.png`, `composer.png`,
`monitor.png`, `api-keys.png`, `forwards.png`, `settings.png` (adapt to the product).

## Delegation

This is self-contained and slow, so hand it to a background subagent with exact output names,
the data rules above, and the cleanup requirements, and write the docs meanwhile. Do not use
the same ports or files from the main thread while it runs.
