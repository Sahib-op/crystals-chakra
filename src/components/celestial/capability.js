// The WebGL scene is a progressive enhancement. It loads automatically only on
// devices likely to render it without hurting responsiveness; everyone else
// keeps the lightweight animated illustration and can opt in with a button.
// Measured: on a throttled phone profile the scene caused ~85% of blocking
// time and almost all layout shift (docs/LAUNCH-PLAN.md, PERF-04).
export function canAutoLoad3D(env = globalThis) {
  const { navigator: nav = {}, matchMedia, innerWidth = 0 } = env;
  if (!matchMedia) return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (nav.connection?.saveData) return false;
  if (!matchMedia('(pointer: fine)').matches || innerWidth < 900) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  return true;
}
