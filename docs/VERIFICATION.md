# Verification

## Executed locally

- Six Node test groups passed: 80 generated weighted grids compared with independent relaxation, BFS/cost differences, unreachable routes, endpoint costs, invalid inputs and deterministic results.
- Strict TypeScript and production builds passed at `/` and `/portfolio/` before final visual review. The build verifier checked six HTML documents, their local references and the CV PDF.
- The actual browser preview is reviewed for controls, the Canvas fallback, project views and narrow layouts.

## Production browser gate

Five browser groups run on desktop and phone-sized Chromium: page/project/CV delivery; cutaway/keyboard range; weighted search/editing; navigation/reading controls; reduced motion, overflow and selected axe A/AA checks. Use the workflow for the published commit to establish execution; configured checks are not a passing result. Reports remain workflow artifacts.

## Published verification — 4 November 2026

[GitHub Actions run 41786853166](https://github.com/krishnuni/portfolio/actions/runs/41786853166) passed for application commit `c8024bbc6322b761d98571b0720063a4de8050b0`: six algorithm test groups, the strict production build, six generated HTML documents and 92 local references, and all **10 browser cases** (five groups on desktop and phone-sized Chromium). The run also completed GitHub Pages deployment.

The public [portfolio](https://krishnuni.github.io/portfolio/), all three case studies, résumé page, original CV PDF, project image and local font were fetched successfully with HTTP 200 after deployment. The deployed opening and Canvas controls were inspected in the browser; the desktop capture in this repository is from that public site.

## Limits

The preview browser has WebGL disabled, so it exercises the interactive Canvas fallback. This does not certify hardware-GPU output. CI has a separate browser context. Phone profiles and narrow frames are not physical-device tests. Automated axe checks cover selected screens rather than full accessibility conformance. Clipboard permissions, mail clients, OS GPU policy and PDF viewers vary by device.

Project numerical and narration evidence belongs to the projects' linked reports. This release does not re-certify Hush's physical audio output or Gateway's scientific model.
