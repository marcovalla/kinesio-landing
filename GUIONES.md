# Guiones de video · Landing Kinesiología

Modelo usado: Higgsfield `seedance1_5`, 4 s, sin audio. Cada clip se convierte en loop
sin corte (adelante + reversa) con ffmpeg:

```bash
ffmpeg -i raw.mp4 -filter_complex "[0:v]setpts=1.4*PTS,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p" \
  -an -c:v libx264 -crf 25 -preset slow -movflags +faststart assets/<nombre>-loop.mp4
```

## 1. Fondo · Inicio → Tratamientos → Método — HECHO (2026-09-28)
`assets/bg-loop.mp4` · 16:9 · 720p (4.8 créditos)

Concepto: "Un consultorio que respira calma". Travelling lateral muy lento, luz dorada,
cortinas de lino, mitad izquierda despejada para el texto.

```
Very slow cinematic lateral tracking shot, left to right, in slow motion, inside a serene premium physiotherapy studio at golden morning hour. Warm sunlight pours through tall windows with sheer linen curtains gently swaying, soft light beams and floating dust particles. The left half of the frame is a calm, uncluttered warm off-white plaster wall with soft light and shadow, empty negative space. In the right third: a physiotherapy treatment table dressed in crisp white linen, sage-green resistance bands hanging neatly on a light oak wall rail, a pale exercise ball, a tall green plant. Light oak floor. Palette of bone white, sage green and natural wood, airy, bright, minimal, luxurious wellness clinic, shallow depth of field, steady smooth camera, no people, no text, no logos.
```

## 2. Sobre mí · "Escucho antes de tratar" — HECHO (2026-10-17)
`assets/about-loop.mp4` · 3:4 · 480p (2.4 créditos). Reemplazó a `feature-loop.mp4` (movido a `_raw/`).

Concepto: la escucha y el cuidado. Primer plano de manos evaluando, sin caras.

```
Intimate slow-motion close-up of a physiotherapist's hands gently assessing a patient's shoulder and neck, fingertips pressing softly, patient wearing a light linen top. Soft diffused warm window light, bone white and sage green palette, creamy blurred background of a bright minimal clinic, slow subtle camera push-in, calm, caring, attentive mood, premium editorial look, no faces, no text, no logos.
```
Flags: `--aspect_ratio 3:4 --duration 4 --resolution 480p --generate_audio false`

## 3. Cierre · "¿Te duele algo? Hablemos hoy." — PENDIENTE
Reemplaza `assets/hero-loop.mp4` en la sección CTA · 16:9 · 480p (2.4). Se ve al 30%
de opacidad detrás de un degradé oscuro, así que la resolución baja no se nota.

Concepto: el resultado. Moverse libre, sin dolor.

```
Slow-motion silhouette of a woman on a rooftop terrace at golden sunset, slowly raising her arms overhead in a free, pain-free stretch, backlit by warm sun, soft lens flare, gentle breeze moving her hair and loose linen clothes, calm and hopeful mood, warm muted tones, steady camera, no text, no logos.
```
Flags: `--aspect_ratio 16:9 --duration 4 --resolution 480p --generate_audio false`
