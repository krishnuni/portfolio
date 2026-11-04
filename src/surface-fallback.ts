import { heightAt } from './lib/surface-math.ts';

/** Canvas projection keeps the same study operable when WebGL is unavailable. */
export function mountCanvasSurface(root: HTMLElement) {
  const old = root.querySelector('canvas')!,
    canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  old.replaceWith(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const context = ctx;
  const slider = root.querySelector<HTMLInputElement>('[data-surface-phase]')!,
    toggle = root.querySelector<HTMLButtonElement>('[data-surface-toggle]')!,
    reset = root.querySelector<HTMLButtonElement>('[data-surface-reset]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1,
    height = 1,
    phase = (Number(slider.value) / 100) * Math.PI * 2,
    playing = !reduced.matches && !matchMedia('(max-width:700px)').matches,
    visible = true,
    frame = 0,
    last = 0,
    targetX = 0,
    targetY = 0,
    angleX = 0,
    angleY = 0,
    dragging = false;
  function project(x: number, y: number, z: number): [number, number] {
    const a = angleX * 0.24,
      rx = x * Math.cos(a) - z * Math.sin(a),
      rz = x * Math.sin(a) + z * Math.cos(a),
      scale = Math.min(width / 12.1, height / 7.4);
    return [
      width * 0.53 + (rx * 0.82 - rz * 0.61) * scale,
      height * 0.48 + (rx * 0.21 + rz * (0.31 + angleY * 0.05) - y * 0.91) * scale,
    ];
  }
  function polygon(points: [number, number][], fill: string) {
    context.beginPath();
    points.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = fill;
    context.lineWidth = 0.45;
    context.stroke();
  }
  function paint() {
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width * 0.54, height * 0.7);
    context.scale(1, 0.13);
    const shadow = context.createRadialGradient(0, 0, 0, 0, 0, width * 0.38);
    shadow.addColorStop(0, 'rgba(20,45,40,0.13)');
    shadow.addColorStop(1, 'rgba(20,45,40,0)');
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(0, 0, width * 0.38, 0, Math.PI * 2);
    context.fill();
    context.restore();
    const nx = 60,
      nz = 27;
    // Two thin lower sheets provide a real edge to the surface.
    for (const layer of [-0.44, -0.22]) {
      for (let j = 0; j < nz; j++) {
        const z = -3.05 + (j / nz) * 6.1,
          zz = z + 6.1 / nz;
        const front: Array<[number, number]> = [],
          back: Array<[number, number]> = [];
        for (let i = 0; i <= nx; i++) {
          const x = -6.4 + (i / nx) * 12.8;
          front.push(project(x, heightAt(x, z, phase) + layer, z + 0.1));
          back.unshift(project(x, heightAt(x, zz, phase) + layer, zz + 0.1));
        }
        polygon([...front, ...back], layer < -0.3 ? '#3c5e5b' : '#658b80');
      }
    }
    const tiles: { points: [number, number][]; depth: number; fill: string }[] = [];
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const x = -6.4 + (i / nx) * 12.8,
          z = -3.05 + (j / nz) * 6.1,
          xx = x + 12.8 / nx,
          zz = z + 6.1 / nz,
          y = heightAt(x, z, phase);
        const dx = (heightAt(x + 0.03, z, phase) - y) / 0.03,
          dz = (heightAt(x, z + 0.03, phase) - y) / 0.03;
        const norm = Math.sqrt(dx * dx + 1 + dz * dz),
          light = Math.max(0, (dx * 0.35 + 1 - dz * 0.28) / norm);
        const f = 0.52 + light * 0.48,
          fade = (z + 3.05) / 6.1;
        const rgb = [68 + fade * 52, 108 + fade * 42, 108 + fade * 30].map((n) =>
          Math.round(Math.min(255, n * f + 21)),
        );
        tiles.push({
          points: [
            project(x, y, z),
            project(xx, heightAt(xx, z, phase), z),
            project(xx, heightAt(xx, zz, phase), zz),
            project(x, heightAt(x, zz, phase), zz),
          ],
          depth: x + z * 0.8,
          fill: `rgb(${rgb.join(',')})`,
        });
      }
    tiles.sort((a, b) => a.depth - b.depth).forEach((t) => polygon(t.points, t.fill));
    context.strokeStyle = 'rgba(232,240,224,.65)';
    context.lineWidth = 0.7;
    for (let j = 0; j <= nz; j++) {
      const z = -3.05 + (j / nz) * 6.1;
      context.beginPath();
      for (let i = 0; i <= nx * 2; i++) {
        const x = -6.4 + (i / (nx * 2)) * 12.8,
          [sx, sy] = project(x, heightAt(x, z, phase) + 0.009, z);
        i ? context.lineTo(sx, sy) : context.moveTo(sx, sy);
      }
      context.stroke();
    }
  }
  function button() {
    toggle.textContent = playing ? 'Pause motion' : 'Play motion';
    toggle.setAttribute('aria-pressed', String(playing));
  }
  function request() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (now - last < 65 && playing) {
      request();
      return;
    }
    const dt = Math.min((now - last) / 1000 || 0, 0.12);
    last = now;
    if (playing) {
      phase = (phase + dt * 0.16) % (Math.PI * 2);
      slider.value = String(Math.round((phase / Math.PI / 2) * 100));
    }
    const dx = (targetX - angleX) * 0.13,
      dy = (targetY - angleY) * 0.13;
    angleX += dx;
    angleY += dy;
    paint();
    if (playing || Math.abs(dx) + Math.abs(dy) > 0.001) request();
  }
  function pause() {
    playing = false;
    button();
  }
  slider.addEventListener('input', () => {
    pause();
    phase = (Number(slider.value) / 100) * Math.PI * 2;
    request();
  });
  toggle.addEventListener('click', () => {
    playing = !playing;
    last = 0;
    button();
    request();
  });
  reset.addEventListener('click', () => {
    pause();
    phase = 0.8;
    slider.value = '13';
    targetX = targetY = 0;
    request();
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || (reduced.matches && !dragging)) return;
    const r = canvas.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
    targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
    request();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
    canvas.classList.remove('is-dragging');
  });
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) {
      targetX = targetY = 0;
      request();
    }
  });
  const ro = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio, 1.25);
    width = r.width;
    height = r.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    request();
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      last = 0;
      if (visible) request();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: '60px' },
  );
  io.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      last = 0;
      request();
    }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) pause();
    request();
  });
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
    },
    { once: true },
  );
  toggle.disabled = slider.disabled = reset.disabled = false;
  button();
  root.classList.add('surface-ready');
  root.dataset.surfaceState = 'canvas';
  root.querySelector('[data-surface-status]')!.textContent = 'A surface study';
  request();
}
