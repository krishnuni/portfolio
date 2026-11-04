# Architecture

The portfolio is a static multi-page application with separately loaded interactions.

`projects.json` and `generate-pages.mjs` produce complete HTML. Vite compiles TypeScript/CSS, rewrites assets for the selected base path and copies public resources. The build verifier checks local references, landmarks and the actual CV PDF.

The main browser module enhances only the controls present on its current document. The hero imports Three.js after the initial document. WebGL failure loads an independent Canvas renderer of the same analytic field. If neither renderer works, the SVG remains and unavailable controls are removed.

## Surface

`surface-math.ts` defines original decorative geometry, not orbital data. Each renderer owns phase, orientation and animation lifetime. Pixel density is bounded; visibility pauses work and page exit releases observers/resources. The Canvas renderer retains playback and scrubbing without GPU availability.

## Search

`search.ts` is independent of DOM and rendering. Positive destination costs, cardinal movement and deterministic neighbour order define the scenario. A* and Dijkstra use a binary heap; BFS uses a FIFO queue. Manhattan is admissible here because legal edges cost at least one.

The controller owns playback and editing. Edits or an algorithm change invalidate old output. Route and cost come from the selected run. The full Search Atlas worker/checkpoint architecture belongs to that separate application.

## Delivery

Project content is curated at build time. No GitHub token or runtime repository request is shipped. Fonts, media, PDF and scripts are same-origin resources. There is no analytics SDK or third-party contact backend.
