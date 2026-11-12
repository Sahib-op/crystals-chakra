import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Vector3,
} from 'three';
import { pickSymbolAt } from '../src/components/celestial/picking.js';
const rect = { left: 30, top: 80, width: 360, height: 360 };
function setup() {
  const camera = new PerspectiveCamera(40, 1, 0.1, 20);
  camera.position.z = 5;
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const card = new Mesh(
    new BoxGeometry(0.6, 0.9, 0.04),
    new MeshBasicMaterial(),
  );
  card.userData.symbol = { id: 'sun' };
  return { camera, card };
}
function screenPoint(card, camera) {
  card.updateWorldMatrix(true, false);
  const point = card.getWorldPosition(new Vector3()).project(camera);
  return [
    rect.left + ((point.x + 1) * rect.width) / 2,
    rect.top + ((1 - point.y) * rect.height) / 2,
  ];
}
test('3D picking follows the visible card after translation, tilt and viewport offset', () => {
  const { camera, card } = setup();
  assert.equal(pickSymbolAt(210, 260, rect, camera, [card]).id, 'sun');
  card.position.set(0.95, 0.4, 0.2);
  card.rotation.set(0.4, 0.8, 0.3);
  const [x, y] = screenPoint(card, camera);
  assert.equal(pickSymbolAt(x, y, rect, camera, [card]).id, 'sun');
  assert.equal(pickSymbolAt(210, 260, rect, camera, [card]), null);
  card.geometry.dispose();
  card.material.dispose();
});
test('a foreground surface occludes a card rather than selecting through it', () => {
  const { camera, card } = setup();
  const front = new Mesh(new BoxGeometry(1, 1, 0.04), new MeshBasicMaterial());
  front.position.z = 0.6;
  assert.equal(pickSymbolAt(210, 260, rect, camera, [card, front]), null);
  assert.equal(pickSymbolAt(210, 260, rect, camera, [card]).id, 'sun');
  for (const mesh of [card, front]) {
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
});
test('pointer positions outside the canvas and zero-size canvases do not select cards', () => {
  const { camera, card } = setup();
  assert.equal(pickSymbolAt(0, 0, rect, camera, [card]), null);
  assert.equal(
    pickSymbolAt(210, 260, { ...rect, width: 0 }, camera, [card]),
    null,
  );
  card.geometry.dispose();
  card.material.dispose();
});
