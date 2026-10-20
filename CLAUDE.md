# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-page landing for a kinesiology (physiotherapy) practice, written in Spanish (Rioplatense voseo: "Volvé", "Contame", "Escribime"). No build step, no package manager, no tests: everything (HTML, CSS, JS) lives in `index.html`. Libraries load from CDN: Lenis 1.1.13 (smooth scroll), GSAP 3.12.5 + ScrollTrigger, three.js 0.160 (spine model). Fonts: Cormorant Garamond (serif) + Jost (sans) from Google Fonts.

Always preview through a local static server, never by opening `index.html` directly (`file://`): the spine model is fetched and won't load, and videos need HTTP for reliable autoplay/preload:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Placeholders still to fill

Content is template data: "Nombre Apellido", "M.P. 0000", the Instagram/Ubicación links, and the WhatsApp config at the top of the main `<script>` (`WHATSAPP_NUMBER`, `WHATSAPP_MESSAGE`). Every element with `data-wa` gets its `href` set to the generated `wa.me` URL at runtime — add `data-wa` to new WhatsApp CTAs rather than hard-coding links.

## Page architecture

Two visual layers that the scroll animation choreographs:

1. **Fixed video backdrop** (`.backdrop` → `#bgVideo`, `.haze`, `#hazeFull`, `.grain`) sits behind the first three `section.scene[data-scene]` elements (`#inicio`, `#tratamientos`, `#metodo`). On desktop (>900px) each scene's `[data-float]` content fades/floats in and out with scrubbed timelines while the video stays put and slowly "drifts" (scale/xPercent). The right-side `#rail` tracks the active scene via `li[data-for=<scene id>]` — a new scene needs a matching rail item.
2. **`#sheet`** — a paper-colored panel that scrolls up over the video, containing `#sobre-mi`, `#testimonios`, the CTA section and the footer. When it covers the viewport the background video is paused, the rail fades, and the header gets `.on-sheet`.

Animation hooks are data attributes, not classes: `data-intro` / `data-intro-line` (load intro in hero), `data-scene` + `data-float` (scene float), `data-fade` (fade-up inside the sheet), `data-clip` (portrait clip-path reveal). Breakpoint logic uses `gsap.matchMedia` at 900px; on mobile scenes only fade in since they're taller than the viewport.

Fallback: if GSAP fails to load or `prefers-reduced-motion` is set, JS skips all animation and `showAll()` forces `[data-fade]` visible; CSS also kills animations/transitions. Keep both paths working when adding animated elements (the `.js` class on `<html>` gates initial hidden states).

Design tokens are CSS custom properties on `:root` (`--bone`, `--paper`, `--ink*`, `--sage*`, `--bronze`, `--serif`, `--sans`, `--pad`, `--ease`).

## Spine model (`#postura`)

The 3D spine in the "Postura" section uses three.js 0.160 (import map in `<head>`) and loads `assets/columna.glb` when the section nears the viewport. The bones come from BodyParts3D (CC BY 4.0, credit in the footer — keep it). `tools/columna-bp3d.mjs` builds the GLB from the OBJ files in `_raw/bp3d/` (`cd tools && npm install && node columna-bp3d.mjs`): it straightens each vertebra into its own frame, so the page applies every curve itself (`SEG` angles per joint, scoliosis via `latTilt`/`latShape`), and adds discs, ribs, the sacrum and the skull (its teeth come from BodyParts3D's IS-A package, the rest from the PART-OF one). The GLB has no normals (computed on load) and stores the mm-per-unit scale in the scene extras. The page fetches the GLB (`assets/columna.glb?v=N`; bump `N` after rebuilding it so browsers drop the cached copy), so it only works over HTTP (never `file://`).

## Video assets

`assets/*-loop.mp4` (+ `*-poster.jpg`) are AI-generated clips (Higgsfield `seedance1_5`, 4 s, no audio) turned into seamless loops; originals are kept in `_raw/`. `GUIONES.md` holds the prompts, flags, status of each clip (bg and about done; CTA clip pending) and the ffmpeg loop command:

```bash
ffmpeg -i raw.mp4 -filter_complex "[0:v]setpts=1.4*PTS,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p" \
  -an -c:v libx264 -crf 25 -preset slow -movflags +faststart assets/<nombre>-loop.mp4
```

Where each clip is used: `bg-loop` = fixed backdrop (preloaded in `<head>`), `about-loop` = "Sobre mí" portrait (3:4), `hero-loop` = CTA section background at low opacity (`preload="none"`). Update `GUIONES.md` when a clip is regenerated.
