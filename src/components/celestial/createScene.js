import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { pickSymbolAt } from './picking';
import { SYMBOLS } from './symbols';

function cardTexture(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#092d48';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#ccac69';
  ctx.lineWidth = 3;
  ctx.strokeRect(13, 13, 230, 358);
  ctx.lineWidth = 1;
  ctx.strokeRect(21, 21, 214, 342);
  ctx.fillStyle = '#efdaaa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '17px Georgia';
  ctx.fillText(item.name.toUpperCase(), 128, 327);
  ctx.font = '110px Georgia';
  const glyph = {
    sun: '☉',
    moon: '☾',
    star: '✧',
    strength: '∞',
    hermit: '◇',
    world: '◎',
  };
  ctx.fillText(glyph[item.kind], 128, 165);
  if (item.kind === 'hermit') {
    ctx.strokeStyle = '#efdaaa';
    ctx.lineWidth = 2;
    ctx.strokeRect(101, 121, 54, 91);
    ctx.beginPath();
    ctx.arc(128, 119, 13, Math.PI, 0);
    ctx.stroke();
  }
  ctx.font = '15px Georgia';
  ctx.fillText(
    {
      sun: 'XIX',
      moon: 'XVIII',
      star: 'XVII',
      strength: 'VIII',
      hermit: 'IX',
      world: 'XXI',
    }[item.kind],
    128,
    53,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCelestialScene(host, { onSelect, onHover, onError }) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 0.1, 5.65);
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.rotateSpeed = 0.6;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  // Let vertical touch gestures scroll while horizontal drags rotate.
  canvas.style.touchAction = 'pan-y';
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x314b61, 2));
  const light = new THREE.DirectionalLight(0xffe2a0, 3);
  light.position.set(3, 4, 5);
  scene.add(light);
  const model = new THREE.Group();
  scene.add(model);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xba8c37,
    metalness: 0.85,
    roughness: 0.23,
  });

  const textureResources = [];
  const ringGroups = [];
  const surfaces = [];
  const pickable = [];
  const settings = [
    { radius: 1.4, tilt: [0.95, 0, -0.3], speed: 0.095 },
    { radius: 1.07, tilt: [-0.5, 0.7, 0.3], speed: -0.115 },
    { radius: 0.74, tilt: [0.4, -0.45, 0.2], speed: 0.14 },
  ];
  settings.forEach((config, i) => {
    const group = new THREE.Group();
    group.rotation.set(...config.tilt);
    model.add(group);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.022, 12, 100),
      gold,
    );
    group.add(ring);
    surfaces.push(ring);
    const fine = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius - 0.045, 0.006, 6, 100),
      gold,
    );
    group.add(fine);
    surfaces.push(fine);
    const markers = [];
    for (let j = 0; j < 2; j++) {
      const item = SYMBOLS[i * 2 + j];
      const texture = cardTexture(item);
      textureResources.push(texture);
      const face = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.1,
        roughness: 0.6,
        emissive: 0x000000,
      });
      const geometry = new THREE.BoxGeometry(0.5, 0.74, 0.045);
      const mesh = new THREE.Mesh(geometry, [
        gold,
        gold,
        gold,
        gold,
        face,
        face,
      ]);
      mesh.userData.symbol = item;
      group.add(mesh);
      surfaces.push(mesh);
      pickable.push({ mesh, face });
      markers.push({ mesh, angle: j * Math.PI + i * 0.8 });
    }
    ringGroups.push({ group, markers, config });
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), gold);
  model.add(core);
  surfaces.push(core);
  let disposed = false,
    contextLost = false,
    visible = true,
    pageVisible = !document.hidden,
    frame = 0,
    last = 0,
    elapsed = 0,
    lastPaint = 0,
    pointer = null,
    down = null,
    hovered = null,
    paused = false;
  const raycaster = new THREE.Raycaster();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function setHover(item) {
    if (item?.id === hovered?.id) return;
    hovered = item;
    canvas.style.cursor = item ? 'pointer' : 'grab';
    pickable.forEach((p) =>
      p.face.emissive.setHex(
        p.mesh.userData.symbol.id === item?.id ? 0x30200b : 0,
      ),
    );
    onHover(item);
  }
  function pick(event) {
    return pickSymbolAt(
      event.clientX,
      event.clientY,
      canvas.getBoundingClientRect(),
      camera,
      surfaces,
      raycaster,
    );
  }
  function draw() {
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera);
    if (pointer) setHover(pick(pointer));
  }
  function position() {
    ringGroups.forEach(({ group, markers, config }, i) => {
      group.rotation.x = config.tilt[0] + Math.sin(elapsed * 0.27 + i) * 0.22;
      // Gentle precession keeps the three planes legible throughout the orbit.
      group.rotation.y = config.tilt[1] + Math.sin(elapsed * 0.21 + i) * 0.32;
      group.rotation.z = config.tilt[2] + Math.sin(elapsed * 0.17 + i) * 0.2;
      markers.forEach(({ mesh, angle }) => {
        const t = angle + elapsed * config.speed;
        mesh.position.set(
          config.radius * Math.cos(t),
          config.radius * Math.sin(t),
          Math.sin(elapsed * 0.8 + angle) * 0.1,
        );
        mesh.rotation.set(
          Math.sin(elapsed * 0.65 + angle) * 0.18,
          Math.cos(elapsed * 0.5 + angle) * 0.22,
          t + Math.PI / 2 + Math.sin(elapsed * 0.4 + angle) * 0.12,
        );
      });
    });
    model.rotation.y = Math.sin(elapsed * 0.12) * 0.2;
    model.rotation.x = Math.sin(elapsed * 0.15) * 0.08;
    core.rotation.y = elapsed * 0.55;
  }
  function tick(time) {
    if (disposed || contextLost) return;
    frame = requestAnimationFrame(tick);
    const interval = innerWidth < 700 ? 1000 / 30 : 1000 / 45;
    if (time - lastPaint < interval) return;
    // Hold a card steady under the pointer, while dragging, or while reading it.
    if (!hovered && !down && !paused)
      elapsed += last ? Math.min((time - last) / 1000, 0.08) : 0;
    last = time;
    lastPaint = time;
    position();
    draw();
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (disposed || contextLost) return;
    if (visible && pageVisible && !motion.matches)
      frame = requestAnimationFrame(tick);
    else {
      position();
      draw();
    }
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  intersection.observe(host);
  const visibility = () => {
    pageVisible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', sync);
  const move = (e) => {
    pointer = { clientX: e.clientX, clientY: e.clientY };
    if (motion.matches) {
      setHover(pick(e));
      draw();
    }
  };
  const leave = () => {
    pointer = null;
    setHover(null);
  };
  const press = (e) => {
    // Select the surface that was pressed, even if it moves before release.
    down = { x: e.clientX, y: e.clientY, symbol: pick(e) };
  };
  const release = (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
      const item = down.symbol;
      if (item) onSelect(item);
    }
    down = null;
  };
  const changed = () => {
    if (motion.matches || !frame) draw();
  };
  controls.addEventListener('change', changed);
  const lost = (e) => {
    e.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onError();
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  const cancel = () => {
    down = null;
    pointer = null;
    setHover(null);
  };
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('webglcontextlost', lost);
  resize();
  position();
  draw();
  sync();
  return {
    setPaused(value) {
      paused = value;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', sync);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', press);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textureResources.forEach((t) => t.dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
