import { Raycaster, Vector2 } from 'three';
/** Pick the closest visible surface using current camera and world transforms. */
export function pickSymbolAt(
  x,
  y,
  rect,
  camera,
  objects,
  raycaster = new Raycaster(),
) {
  if (
    !rect.width ||
    !rect.height ||
    x < rect.left ||
    x > rect.left + rect.width ||
    y < rect.top ||
    y > rect.top + rect.height
  )
    return null;
  const pointer = new Vector2(
    ((x - rect.left) / rect.width) * 2 - 1,
    -((y - rect.top) / rect.height) * 2 + 1,
  );
  camera.updateMatrixWorld();
  objects.forEach((object) => object.updateWorldMatrix(true, true));
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(objects, true)[0];
  return hit?.object.userData.symbol || null;
}
