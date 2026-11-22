import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { pickSymbolAt } from './picking';
import { SYMBOLS } from './symbols';

const GOLD = '#e2c47f';
const CARD_FONT =
  '"Playfair Display Variable", "Playfair Display", Georgia, serif';

// Vector emblems, drawn rather than typed so every card renders identically.
const EMBLEMS = {
  sun(ctx) {
    ctx.beginPath();
    ctx.arc(128, 160, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 160, 9, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 46;
      const r2 = i % 2 ? 62 : 72;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * r1, 160 + Math.sin(a) * r1);
      ctx.lineTo(128 + Math.cos(a) * r2, 160 + Math.sin(a) * r2);
      ctx.stroke();
    }
  },
  moon(ctx) {
    ctx.beginPath();
    ctx.arc(128, 160, 56, Math.PI * 0.32, Math.PI * 1.68);
    ctx.arc(150, 160, 44, Math.PI * 1.6, Math.PI * 0.4, true);
    ctx.closePath();
    ctx.fill();
    [
      [190, 108, 3],
      [196, 214, 4],
      [72, 96, 2.5],
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  star(ctx) {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 22 : i % 4 ? 46 : 70;
      ctx[i ? 'lineTo' : 'moveTo'](
        128 + Math.cos(a) * r,
        160 + Math.sin(a) * r,
      );
    }
    ctx.closePath();
    ctx.fill();
  },
  magician(ctx) {
    // Lemniscate over a wand.
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.05) {
      const d = 1 + Math.sin(t) ** 2;
      const x = (62 * Math.cos(t)) / d;
      const y = (62 * Math.sin(t) * Math.cos(t)) / d;
      ctx[t ? 'lineTo' : 'moveTo'](128 + x, 124 + y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 160);
    ctx.lineTo(128, 238);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 160, 6, 0, Math.PI * 2);
    ctx.fill();
  },
  priestess(ctx) {
    // Two pillars with a crescent between them.
    [70, 186].forEach((x) => {
      ctx.strokeRect(x - 12, 92, 24, 146);
      ctx.fillRect(x - 18, 84, 36, 8);
      ctx.fillRect(x - 18, 238, 36, 8);
    });
    ctx.beginPath();
    ctx.arc(128, 162, 26, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(139, 162, 21, Math.PI * 1.6, Math.PI * 0.4, true);
    ctx.closePath();
    ctx.fill();
  },
  wheel(ctx) {
    [64, 40].forEach((r) => {
      ctx.beginPath();
      ctx.arc(128, 160, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 12, 160 + Math.sin(a) * 12);
      ctx.lineTo(128 + Math.cos(a) * 64, 160 + Math.sin(a) * 64);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(128, 160, 10, 0, Math.PI * 2);
    ctx.fill();
  },
};

function drawCard(ctx, item) {
  ctx.clearRect(0, 0, 256, 384);
  ctx.fillStyle = '#092d48';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 232, 360);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, 212, 340);
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 22px ${CARD_FONT}`;
  ctx.fillText(item.numeral, 128, 52);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  EMBLEMS[item.kind]?.(ctx);
  ctx.font = `600 ${item.name.length > 14 ? 19 : 23}px ${CARD_FONT}`;
  ctx.fillText(item.name.toUpperCase(), 128, 322);
}

function cardTexture(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  drawCard(ctx, item);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
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
  // Keep the perspective distance constant as the desktop viewport widens.
  camera.position.set(0, 0.1, 6.7);
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
  // Faster than before and alternating in direction, so the rings cross.
  const settings = [
    { radius: 1.5, tilt: [0.95, 0, -0.3], speed: 0.07 },
    { radius: 1.14, tilt: [-0.5, 0.7, 0.3], speed: -0.085 },
    { radius: 0.8, tilt: [0.4, -0.45, 0.2], speed: 0.1 },
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
      const face = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
      });
      const geometry = new THREE.BoxGeometry(0.52, 0.78, 0.045);
      const mesh = new THREE.Mesh(geometry, [
        gold,
        gold,
        gold,
        gold,
        face,
        face,
      ]);
      mesh.userData.symbol = item;
      // An invisible, larger hit area makes moving cards easier to catch.
      const hitArea = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.92, 0.3),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitArea.userData.symbol = item;
      mesh.add(hitArea);
      group.add(mesh);
      surfaces.push(mesh, hitArea);
      pickable.push({ mesh, face });
      markers.push({
        mesh,
        angle: j * Math.PI + i * 0.8,
        seed: i * 2.1 + j * 1.3,
      });
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
    focused = null,
    timeScale = 1;
  const raycaster = new THREE.Raycaster();
  const parentFacing = new THREE.Quaternion();
  const cameraFacing = new THREE.Quaternion();
  const cardLean = new THREE.Quaternion();
  const lean = new THREE.Euler();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function highlight() {
    pickable.forEach((p) => {
      const id = p.mesh.userData.symbol.id;
      p.face.color.setHex(
        id === focused || id === hovered?.id ? 0xffe0a0 : 0xffffff,
      );
    });
  }
  function setHover(item) {
    if (item?.id === hovered?.id) return;
    hovered = item;
    canvas.style.cursor = item ? 'pointer' : 'grab';
    highlight();
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
    // Keep the cards in their 3D orbits, with a small tilt towards the viewer.
    // This makes the art readable even when the surrounding ring rolls away.
    camera.getWorldQuaternion(cameraFacing);
    for (const { group, markers } of ringGroups) {
      group.getWorldQuaternion(parentFacing).invert().multiply(cameraFacing);
      for (const { mesh, seed } of markers) {
        lean.set(
          0,
          Math.sin(elapsed * 0.9 + seed) * 0.22,
          Math.sin(elapsed * 0.7 + seed) * 0.2,
        );
        mesh.quaternion
          .copy(parentFacing)
          .multiply(cardLean.setFromEuler(lean));
      }
    }
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera);
    if (pointer) setHover(pick(pointer));
  }
  function position() {
    // The whole object sways on two axes, so motion reads in every direction.
    model.rotation.y = Math.sin(elapsed * 0.21) * 0.45;
    model.rotation.x = Math.sin(elapsed * 0.16 + 1) * 0.2;
    ringGroups.forEach(({ group, markers, config }, i) => {
      group.rotation.x = config.tilt[0] + Math.sin(elapsed * 0.23 + i) * 0.22;
      group.rotation.y = config.tilt[1] + Math.sin(elapsed * 0.17 + i) * 0.35;
      group.rotation.z = config.tilt[2] + elapsed * config.speed * 0.6;
      markers.forEach(({ mesh, angle, seed }) => {
        const t = angle + elapsed * config.speed * 2.2;
        // Each card drifts slightly in and out from its ring.
        const r = config.radius + Math.sin(elapsed * 1.1 + seed) * 0.07;
        mesh.position.set(r * Math.cos(t), r * Math.sin(t), 0);
      });
    });
    core.rotation.y = elapsed * 0.6;
    core.rotation.x = elapsed * 0.25;
  }
  function tick(time) {
    if (disposed || contextLost) return;
    frame = requestAnimationFrame(tick);
    const interval = innerWidth < 700 ? 1000 / 30 : 1000 / 45;
    if (time - lastPaint < interval) return;
    // Slow to a crawl under the pointer and stop while a card is open, so
    // moving cards are easy to pick.
    const targetScale = focused ? 0 : hovered ? 0.15 : 1;
    timeScale += (targetScale - timeScale) * 0.12;
    elapsed += last ? Math.min((time - last) / 1000, 0.08) * timeScale : 0;
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
    // A larger projection fills the landscape stage without scaling any axis.
    camera.zoom = matchMedia('(min-width: 761px)').matches ? 1.15 : 1;
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
    /** Highlight the open card (or none) and hold the scene still meanwhile. */
    setFocus(id) {
      focused = id || null;
      highlight();
      if (motion.matches || !frame) draw();
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
