# Theron Company Website

Static site for GitHub Pages, styled with Tailwind CSS v4.

## Local preview

```bash
cd company-website
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Styling (Tailwind)

Styles are authored as Tailwind utility classes in `index.html`. The compiled
stylesheet `css/styles.css` is committed, so GitHub Pages needs no build step.

To rebuild after changing classes or `src/input.css`:

```bash
# one-time: download the standalone Tailwind CLI (no Node required)
mkdir -p .tools
curl -sLo .tools/tailwindcss https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64
chmod +x .tools/tailwindcss

# compile
./.tools/tailwindcss -i src/input.css -o css/styles.css --minify

# or watch during development
./.tools/tailwindcss -i src/input.css -o css/styles.css --watch
```

Design tokens (brand colors, font) live in the `@theme` block of
`src/input.css`, along with the hero grid backdrop.

Dark mode uses Tailwind's `dark:` variant (class on `<html>`). A header
selector offers **Auto** (system), **Light**, and **Dark**; preference is
saved in `localStorage`.

## GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to deploy from the `main` branch, root (`/`).
4. Save — the site will be live at `https://<org>.github.io/company-website/`.

## Structure

- `index.html` — single-page site (Tailwind utility classes)
- `src/input.css` — Tailwind entry: theme tokens + hero grid CSS
- `css/styles.css` — compiled output (committed for Pages)
- `js/main.js` — mobile nav and header behavior
- `js/capabilities/` — capabilities tab list and 3D drawing viewer (ES modules)
  - `index.js` — entry point, loaded with `<script type="module">`
  - `config.js` — camera, damping, and drag tuning
  - `designs/index.js` — the set of drawings: title, camera framing, and source
  - `designs/*.js` — one procedural drawing each
  - `loaders/` — turns a design descriptor into a drawing (`procedural`, `gltf`)
  - `model.js`, `geometry.js`, `viewer.js`, `tabs.js` — shared machinery
- `js/vendor/three.min.js` — pinned three.js r128 (vendored, not edited)
- `js/vendor/GLTFLoader.js` — matching r128 GLB loader, fetched only on demand
- `assets/logo.svg` — primary logo (SVG wrapper, embedded source artwork)
- `assets/logo-white.svg` — logo for dark backgrounds
- `assets/mark.png` — icon mark extracted from source (transparent)
- `assets/logo-full.png` — full logo extracted from source (transparent)
- `assets/favicon.svg` — favicon

## Capability drawings

The four drawings in the capabilities section are defined in
`js/capabilities/designs/index.js`. Each entry names the drawing, sets its
camera framing, and points at a source. Editing that one file covers adding,
reordering, and reframing; the viewer never needs to change.

Two source types exist. `procedural` runs a builder from `designs/`, which is
how every current drawing is made. `gltf` loads a GLB, which is the path for
CAD models:

1. In SolidWorks, **File → Save As → glTF Binary (.glb)**. Export at high
   tessellation quality and keep the file under roughly 1.5 MB — suppress
   hidden internal components rather than exporting the whole assembly.
2. Drop it in `assets/models/`.
3. Add an entry to `designs/index.js` with
   `source: { type: 'gltf', url: 'assets/models/<name>.glb' }`.

The loader strips CAD appearances and redraws every mesh in the house line
style, so the export's colors and materials do not matter. Units and origin do
not matter either: the viewer recentres and fits the camera to the model. If
the drawing looks noisy, raise `edgeThreshold` (degrees, default 20). If it
lands on its side, set `upAxis: 'Z'`.

Note that `index.html` loads the viewer as an ES module, so the site must be
served over HTTP to preview it. Opening `index.html` from the filesystem
leaves the canvas blank.
