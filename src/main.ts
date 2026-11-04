import './style.css';
import { sampleTerrain, solve } from './lib/search.ts';
import type { Algorithm, Terrain, SearchResult } from './lib/search.ts';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const navigation = document.querySelector<HTMLElement>('#site-navigation');
function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
}
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation?.classList.toggle('is-open', open);
});
navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

// Announce copy only after the browser confirms it. The email link always works.
document.querySelectorAll<HTMLButtonElement>('[data-copy-email]').forEach((button) => {
  button.hidden = !navigator.clipboard;
  button.addEventListener('click', async () => {
    const status = document.querySelector<HTMLElement>('[data-copy-status]');
    try {
      await navigator.clipboard.writeText('vaikrish8@gmail.com');
      button.textContent = 'Email copied';
      if (status) status.textContent = 'Email address copied to clipboard.';
    } catch {
      if (status) status.textContent = 'Please use the email link or select vaikrish8@gmail.com.';
    }
  });
});

// A progressive enhancement: no content is hidden before this observer exists.
if (!reduced.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.07 },
  );
  document.querySelectorAll('[data-reveal]').forEach((element) => {
    element.classList.add('will-reveal');
    observer.observe(element);
  });
}
const sectionLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-section-link]')];
if (sectionLinks.length) {
  const sections = document.querySelectorAll('main section[id]');
  const current = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        sectionLinks.forEach((l) => {
          if (l.hash === '#' + e.target.id) l.setAttribute('aria-current', 'location');
          else l.removeAttribute('aria-current');
        });
      }
    },
    { rootMargin: '-25% 0px -60% 0px' },
  );
  sections.forEach((s) => current.observe(s));
}

// Project architecture cutaway. Native range + named buttons cover every input.
document.querySelectorAll<HTMLElement>('[data-cutaway]').forEach((root) => {
  const slider = root.querySelector<HTMLInputElement>('[data-cutaway-range]')!;
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-layer]');
  function set(value: number) {
    root.style.setProperty('--cut', `${100 - value}%`);
    slider.value = String(value);
    const reveal = root.querySelector<HTMLElement>('.cutaway-reveal')!;
    reveal.inert = value < 100;
    reveal.setAttribute('aria-hidden', String(value < 100));
    buttons.forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        String(b.dataset.layer === (value < 50 ? 'experience' : 'structure')),
      ),
    );
  }
  buttons.forEach((b) =>
    b.addEventListener('click', () => set(b.dataset.layer === 'experience' ? 0 : 100)),
  );
  slider.addEventListener('input', () => set(Number(slider.value)));
  set(0);
});

// A lightweight reading interaction; this is a portfolio excerpt, not Hush's engine.
document.querySelectorAll<HTMLElement>('[data-reading-study]').forEach((root) => {
  const range = root.querySelector<HTMLInputElement>('input[type=range]')!;
  const output = root.querySelector<HTMLOutputElement>('output')!;
  range.addEventListener('input', () => {
    root.style.setProperty('--reading-size', `${range.value}px`);
    output.value = range.value + ' px';
  });
  root.querySelectorAll<HTMLButtonElement>('[data-reading-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      const dark = b.dataset.readingTheme === 'night';
      root.classList.toggle('reading-night', dark);
      root
        .querySelectorAll<HTMLButtonElement>('[data-reading-theme]')
        .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );
});

// Keep the three-dimensional study off the critical path and provide an SVG fallback.
const surfaceRoot = document.querySelector<HTMLElement>('[data-surface]');
if (surfaceRoot) {
  const load = async () => {
    try {
      const { mountSurface } = await import('./surface.ts');
      mountSurface(surfaceRoot);
    } catch {
      try {
        const { mountCanvasSurface } = await import('./surface-fallback.ts');
        mountCanvasSurface(surfaceRoot);
      } catch {
        surfaceRoot.dataset.surfaceState = 'static';
        surfaceRoot.querySelector('[data-surface-status]')!.textContent =
          'A surface study · static view';
        const controls = surfaceRoot.querySelector<HTMLElement>('.surface-controls');
        if (controls) controls.hidden = true;
      }
    }
  };
  if ('requestIdleCallback' in window)
    window.requestIdleCallback(
      () => {
        void load();
      },
      { timeout: 1200 },
    );
  else
    setTimeout(() => {
      void load();
    }, 250);
}

function mountSearchStudy(root: HTMLElement) {
  let terrain: Terrain = sampleTerrain(),
    result: SearchResult | null = null,
    cursor = 0,
    playing = false,
    timer = 0,
    focused = terrain.start;
  const grid = root.querySelector<HTMLElement>('[data-search-grid]')!;
  const select = root.querySelector<HTMLSelectElement>('[data-search-algorithm]')!;
  const run = root.querySelector<HTMLButtonElement>('[data-search-run]')!;
  const progress = root.querySelector<HTMLInputElement>('[data-search-progress]')!;
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const expanded = root.querySelector<HTMLElement>('[data-search-visited]')!;
  const cost = root.querySelector<HTMLElement>('[data-search-cost]')!;
  const moves = root.querySelector<HTMLElement>('[data-search-moves]')!;
  const cells: HTMLButtonElement[] = [];
  function stop() {
    playing = false;
    clearTimeout(timer);
    run.textContent = result && cursor < result.visited.length ? 'Continue search' : 'Run search';
    run.setAttribute('aria-pressed', 'false');
  }
  function draw() {
    const seen = new Set(result?.visited.slice(0, cursor) ?? []),
      complete = !!result && cursor === result.visited.length;
    const path = new Set(complete ? result?.path : []),
      walls = new Set(terrain.walls);
    cells.forEach((b, id) => {
      b.className = 'search-cell';
      if (walls.has(id)) b.classList.add('is-wall');
      else if (path.has(id)) b.classList.add('is-path');
      else if (seen.has(id)) b.classList.add('is-visited');
      else if (terrain.costs[id] > 1) b.classList.add('is-weighted');
      if (id === terrain.start) b.classList.add('is-start');
      if (id === terrain.goal) b.classList.add('is-goal');
      b.textContent =
        id === terrain.start
          ? 'S'
          : id === terrain.goal
            ? 'G'
            : !walls.has(id) && terrain.costs[id] > 1
              ? String(terrain.costs[id])
              : '';
      const type =
        id === terrain.start
          ? 'start'
          : id === terrain.goal
            ? 'goal'
            : walls.has(id)
              ? 'wall'
              : path.has(id)
                ? 'route'
                : seen.has(id)
                  ? 'explored'
                  : `cost ${terrain.costs[id]}`;
      b.setAttribute(
        'aria-label',
        `Row ${Math.floor(id / terrain.width) + 1}, column ${(id % terrain.width) + 1}: ${type}`,
      );
      b.tabIndex = id === focused ? 0 : -1;
    });
    expanded.textContent = String(cursor);
    cost.textContent = complete && result?.found ? String(result.cost) : '—';
    moves.textContent = complete && result?.found ? String(result.moves) : '—';
    progress.max = String(result?.visited.length || 1);
    progress.value = String(cursor);
    progress.disabled = !result;
    if (complete)
      status.textContent = result?.found
        ? 'Route found. Change the algorithm to compare the same terrain.'
        : 'No route. Remove a wall or reset the terrain.';
    root.dataset.searchState = complete ? 'complete' : playing ? 'running' : 'idle';
  }
  function compute() {
    result = solve(terrain, select.value as Algorithm);
    cursor = 0;
  }
  function step() {
    if (!result) compute();
    cursor = Math.min(cursor + 1, result!.visited.length);
    draw();
  }
  function tick() {
    if (!playing || !result) return;
    cursor = Math.min(cursor + (reduced.matches ? 8 : 3), result.visited.length);
    draw();
    if (cursor === result.visited.length) {
      stop();
      return;
    }
    timer = window.setTimeout(tick, reduced.matches ? 90 : 32);
  }
  for (let y = 0; y < terrain.height; y++) {
    const row = document.createElement('div');
    row.setAttribute('role', 'row');
    row.className = 'search-row';
    for (let x = 0; x < terrain.width; x++) {
      const id = y * terrain.width + x,
        b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'gridcell');
      b.dataset.cell = String(id);
      b.addEventListener('click', () => {
        focused = id;
        if (id === terrain.start || id === terrain.goal) {
          draw();
          return;
        }
        stop();
        result = null;
        cursor = 0;
        terrain.walls = terrain.walls.includes(id)
          ? terrain.walls.filter((n) => n !== id)
          : [...terrain.walls, id];
        status.textContent = 'Terrain edited. Run a new search.';
        draw();
      });
      row.append(b);
      cells.push(b);
    }
    grid.append(row);
  }
  grid.addEventListener('keydown', (e) => {
    const key = e.key;
    let next = focused;
    const x = focused % terrain.width,
      y = Math.floor(focused / terrain.width);
    if (key === 'ArrowRight' && x < terrain.width - 1) next++;
    else if (key === 'ArrowLeft' && x > 0) next--;
    else if (key === 'ArrowDown' && y < terrain.height - 1) next += terrain.width;
    else if (key === 'ArrowUp' && y > 0) next -= terrain.width;
    else return;
    e.preventDefault();
    focused = next;
    draw();
    cells[next].focus();
  });
  run.addEventListener('click', () => {
    if (playing) {
      stop();
      return;
    }
    if (!result || cursor === result.visited.length) compute();
    playing = true;
    run.textContent = 'Pause search';
    run.setAttribute('aria-pressed', 'true');
    status.textContent = 'Exploring the terrain.';
    tick();
  });
  root.querySelector('[data-search-step]')?.addEventListener('click', () => {
    stop();
    if (result && cursor === result.visited.length) compute();
    step();
  });
  root.querySelector('[data-search-reset]')?.addEventListener('click', () => {
    stop();
    terrain = sampleTerrain();
    result = null;
    cursor = 0;
    status.textContent = 'Weighted passage restored. The dark cells cost seven to enter.';
    draw();
  });
  root.querySelector('[data-search-finish]')?.addEventListener('click', () => {
    stop();
    if (!result) compute();
    cursor = result!.visited.length;
    draw();
  });
  select.addEventListener('change', () => {
    stop();
    result = null;
    cursor = 0;
    status.textContent = 'Algorithm changed. The terrain is the same.';
    draw();
  });
  progress.addEventListener('input', () => {
    stop();
    cursor = Number(progress.value);
    draw();
  });
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && playing) stop();
  }).observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  draw();
}
document.querySelectorAll<HTMLElement>('[data-search-study]').forEach(mountSearchStudy);
