import * as THREE from 'three';
import { heightAt } from './lib/surface-math.ts';

export function mountSurface(container: HTMLElement) {
  const canvas = container.querySelector<HTMLCanvasElement>('canvas')!;
  const range = container.querySelector<HTMLInputElement>('[data-surface-phase]')!;
  const toggle = container.querySelector<HTMLButtonElement>('[data-surface-toggle]')!;
  const reset = container.querySelector<HTMLButtonElement>('[data-surface-reset]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)').matches;
  let playing = !reduced.matches && !compact,
    visible = true,
    phase = (Number(range.value) / 100) * Math.PI * 2;
  let dragging = false,
    pointerX = 0,
    pointerY = 0,
    angleX = 0,
    angleY = 0,
    frame = 0,
    lastTime = 0,
    destroyed = false;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.25 : 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 70);
  camera.position.set(8.3, 7.1, 10.8);
  camera.lookAt(0.1, 0.05, 0);
  scene.add(new THREE.HemisphereLight(0xf3f8ed, 0x264244, 2.4));
  const key = new THREE.DirectionalLight(0xfffbef, 3.4);
  key.position.set(-3, 8, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc1e1dc, 1.7);
  rim.position.set(5, 3, -4);
  scene.add(rim);
  const field = new THREE.Group();
  scene.add(field);
  field.rotation.y = -0.18;
  field.rotation.z = -0.035;
  const nx = compact ? 96 : 156,
    nz = compact ? 28 : 42;
  const geometry = new THREE.PlaneGeometry(12.8, 6.1, nx, nz);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const dark = new THREE.Color('#36565a'),
    light = new THREE.Color('#8caaa4');
  for (let i = 0; i < positions.count; i++) {
    const f = (positions.getZ(i) + 3.05) / 6.1;
    const col = dark.clone().lerp(light, 0.18 + 0.57 * f);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.54,
    metalness: 0.18,
    side: THREE.DoubleSide,
  });
  const top = new THREE.Mesh(geometry, material);
  field.add(top);
  const underside = new THREE.MeshStandardMaterial({
    color: '#36565a',
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const layers = [-0.23, -0.47].map((offset, i) => {
    const m = new THREE.Mesh(geometry, underside);
    m.position.set(i * 0.1, offset, (i + 1) * 0.12);
    field.add(m);
    return m;
  });
  const curves: THREE.Line[] = [];
  const curveMat = new THREE.LineBasicMaterial({
    color: '#e7eee3',
    transparent: true,
    opacity: 0.46,
  });
  for (let j = 0; j <= nz; j += compact ? 2 : 2) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((nx + 1) * 3), 3));
    const l = new THREE.Line(geo, curveMat);
    l.userData.row = j;
    field.add(l);
    curves.push(l);
  }
  const endMat = new THREE.LineBasicMaterial({
    color: '#a5bdb6',
    transparent: true,
    opacity: 0.35,
  });
  const ends = [0, nx].map((col) => {
    const g = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((nz + 1) * 3), 3),
    );
    const l = new THREE.Line(g, endMat);
    l.userData.col = col;
    field.add(l);
    return l;
  });
  function updateGeometry() {
    for (let i = 0; i < positions.count; i++)
      positions.setY(i, heightAt(positions.getX(i), positions.getZ(i), phase));
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    for (const l of curves) {
      const a = l.geometry.attributes.position as THREE.BufferAttribute;
      const row = l.userData.row as number;
      for (let i = 0; i <= nx; i++) {
        const at = row * (nx + 1) + i;
        a.setXYZ(i, positions.getX(at), positions.getY(at) + 0.012, positions.getZ(at));
      }
      a.needsUpdate = true;
    }
    for (const l of ends) {
      const a = l.geometry.attributes.position as THREE.BufferAttribute;
      const col = l.userData.col as number;
      for (let j = 0; j <= nz; j++) {
        const at = j * (nx + 1) + col;
        a.setXYZ(j, positions.getX(at), positions.getY(at) + 0.014, positions.getZ(at));
      }
      a.needsUpdate = true;
    }
  }
  let dirty = true;
  function render(now: number) {
    frame = 0;
    if (destroyed || !visible || document.hidden) return;
    const delta = Math.min((now - lastTime) / 1000 || 0, 0.05);
    lastTime = now;
    if (playing) {
      phase = (phase + delta * 0.16) % (Math.PI * 2);
      range.value = String(Math.round((phase / Math.PI / 2) * 100));
      dirty = true;
    }
    const dx = (pointerX - angleX) * 0.07,
      dy = (pointerY - angleY) * 0.07;
    angleX += dx;
    angleY += dy;
    field.rotation.y = -0.18 + angleX * 0.22;
    field.rotation.x = angleY * 0.11;
    if (dirty) {
      updateGeometry();
      dirty = false;
    }
    renderer.render(scene, camera);
    if (playing || Math.abs(dx) + Math.abs(dy) > 0.0002) frame = requestAnimationFrame(render);
  }
  function request() {
    if (!frame && visible && !destroyed && !document.hidden) frame = requestAnimationFrame(render);
  }
  function updateButton() {
    toggle.textContent = playing ? 'Pause motion' : 'Play motion';
    toggle.setAttribute('aria-pressed', String(playing));
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    request();
  }
  function setPaused() {
    playing = false;
    updateButton();
  }
  range.addEventListener('input', () => {
    setPaused();
    phase = (Number(range.value) / 100) * Math.PI * 2;
    dirty = true;
    request();
  });
  toggle.addEventListener('click', () => {
    playing = !playing;
    lastTime = 0;
    updateButton();
    request();
  });
  reset.addEventListener('click', () => {
    setPaused();
    phase = 0.8;
    range.value = String(Math.round((phase / Math.PI / 2) * 100));
    pointerX = pointerY = 0;
    dirty = true;
    request();
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    if (dragging || !reduced.matches) {
      pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointerY = ((e.clientY - r.top) / r.height) * 2 - 1;
      request();
    }
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
    canvas.classList.remove('is-dragging');
  });
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
    canvas.classList.remove('is-dragging');
  });
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) {
      pointerX = pointerY = 0;
      request();
    }
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      lastTime = 0;
      if (visible) request();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: '60px' },
  );
  intersection.observe(container);
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else request();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) setPaused();
    request();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    setPaused();
    container.classList.remove('surface-ready');
    container.dataset.surfaceState = 'static';
    container.querySelector('[data-surface-status]')!.textContent = 'A surface study · static view';
  });
  window.addEventListener(
    'pagehide',
    () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      geometry.dispose();
      material.dispose();
      underside.dispose();
      curveMat.dispose();
      endMat.dispose();
      for (const l of [...curves, ...ends]) l.geometry.dispose();
      renderer.dispose();
    },
    { once: true },
  );
  updateButton();
  updateGeometry();
  resize();
  renderer.render(scene, camera);
  container.classList.add('surface-ready');
  container.dataset.surfaceState = 'ready';
  toggle.disabled = false;
  range.disabled = false;
  reset.disabled = false;
  request();
  return { layers: layers.length + 1 };
}
