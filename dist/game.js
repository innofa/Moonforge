import * as THREE from './vendor/three.module.js';
import { BLOCKS, VoxelWorld, WORLD_HALF, WORLD_HEIGHT, MAX_BLOCKS, blockKey, inBounds, createStarter } from './voxel-world.js';
import { makeMaterials, makeGroundTexture, addSpace, seededRandom } from './materials.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const touchDevice = window.matchMedia('(pointer: coarse)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
} catch (error) {
  showFatal('Your browser could not start the 3D engine. Enable hardware acceleration or try a browser with WebGL 2 support.');
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080e18');
scene.fog = new THREE.FogExp2('#101924', .0036);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .08, 900);
const hemi = new THREE.HemisphereLight(0xc4d7f1, 0x394350, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 3.25);
sun.position.set(-35, 48, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
sun.shadow.camera.top = 46; sun.shadow.camera.bottom = -46;
sun.shadow.camera.near = .5; sun.shadow.camera.far = 180;
sun.shadow.normalBias = .035; sun.shadow.bias = -.0002;
sun.shadow.radius = 2;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0x7bb3e4, .45); fill.position.set(20, 10, -40); scene.add(fill);
const space = addSpace(scene);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: makeGroundTexture(), color: 0xb0b8c3, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.015; ground.receiveShadow = true; ground.name = 'ground'; scene.add(ground);

// A subtle, flat construction grid gives every block a predictable place.
const grid = new THREE.GridHelper(WORLD_HALF * 2, WORLD_HALF * 2, 0xc1cfdb, 0x909eae);
grid.position.y = .003; grid.material.transparent = true; grid.material.opacity = .11; grid.material.depthWrite = false; scene.add(grid);
const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-64, .015, -64), new THREE.Vector3(64, .015, -64), new THREE.Vector3(64, .015, 64), new THREE.Vector3(-64, .015, 64),
]), new THREE.LineBasicMaterial({ color: 0xcde6a3, transparent: true, opacity: .28 })); scene.add(border);

// Low stones lie outside the construction area; the entire building surface stays flat.
const rng = seededRandom(124);
const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
const rocks = new THREE.InstancedMesh(rockGeometry, new THREE.MeshStandardMaterial({ color: 0x737f8f, roughness: 1 }), 160);
const dummy = new THREE.Object3D();
for (let i = 0; i < 160; i++) {
  const a = rng() * Math.PI * 2, d = 95 + rng() * 160, scale = .3 + rng() * 2.1;
  dummy.position.set(Math.cos(a) * d, scale * .18, Math.sin(a) * d);
  dummy.rotation.set(rng() * 3, rng() * 6, rng() * 3); dummy.scale.set(scale * 1.6, scale * .55, scale); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
}
rocks.receiveShadow = true; scene.add(rocks);
dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);

const materials = makeMaterials();
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const groups = materials.map((material, type) => {
  const mesh = new THREE.InstancedMesh(boxGeometry, material, MAX_BLOCKS);
  mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = type !== 3;
  mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.type = type;
  scene.add(mesh); return { mesh, coords: [] };
});
const renderSlots = new Map();
const tempMatrix = new THREE.Matrix4();
function syncBlock({ x, y, z, type }) {
  const key = blockKey(x, y, z), existing = renderSlots.get(key);
  if (existing) {
    const group = groups[existing.type], last = group.mesh.count - 1;
    if (existing.index !== last) {
      group.mesh.getMatrixAt(last, tempMatrix); group.mesh.setMatrixAt(existing.index, tempMatrix);
      const moved = group.coords[last]; group.coords[existing.index] = moved;
      renderSlots.get(blockKey(moved.x, moved.y, moved.z)).index = existing.index;
    }
    group.coords.pop(); group.mesh.count--; group.mesh.instanceMatrix.needsUpdate = true; group.mesh.boundingSphere = null; renderSlots.delete(key);
  }
  if (type !== null) {
    const group = groups[type], index = group.mesh.count++;
    dummy.position.set(x + .5, y + .5, z + .5); dummy.updateMatrix();
    group.mesh.setMatrixAt(index, dummy.matrix); group.mesh.instanceMatrix.needsUpdate = true; group.mesh.boundingSphere = null;
    group.coords.push({ x, y, z }); renderSlots.set(key, { type, index });
  }
}
const world = new VoxelWorld(syncBlock);
createStarter(world);

const ghost = new THREE.Group();
const ghostSolid = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({ color: 0xd8f692, transparent: true, opacity: .2, depthWrite: false }));
const ghostLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), new THREE.LineBasicMaterial({ color: 0xe0ffaa, transparent: true, opacity: .95, depthTest: false }));
ghost.add(ghostSolid, ghostLines); ghost.scale.setScalar(1.006); ghost.visible = false; ghost.renderOrder = 10; ghostLines.renderOrder = 11; scene.add(ghost);

let selected = 0, tool = 'place', mode = 'build', pointerLocked = false, pointerValid = false;
let toastTimeout, currentTarget = null, loadingDone = false, disposed = false;
let fallbackFly = false, modalOpen = false;
const pointer = new THREE.Vector2(0, 0), raycaster = new THREE.Raycaster();
const keys = new Set(), pointers = new Map();
const orbit = { theta: .74, phi: 1.29, radius: innerWidth < 650 ? 47 : 35, target: new THREE.Vector3(-.5, 1, 1.2) };
const view = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius, target: orbit.target.clone() };
const flyEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const forward = new THREE.Vector3(), right = new THREE.Vector3(), movement = new THREE.Vector3();
let gesture = null, multiTouch = null;

function toast(message) {
  clearTimeout(toastTimeout); $('toast').textContent = message; $('toast').classList.add('show');
  toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 2700);
}

function updateUI() {
  $('block-count').textContent = String(world.blocks.size).padStart(4, '0');
  $('undo-button').disabled = world.history.length === 0;
}

const slots = BLOCKS.map((block, index) => {
  const button = document.createElement('button'); button.className = `block-slot${index === 0 ? ' active' : ''}`;
  button.title = `${block.name} (${index + 1})`; button.setAttribute('aria-label', `${block.name}, key ${index + 1}`); button.setAttribute('aria-pressed', String(index === 0));
  const number = document.createElement('span'); number.className = 'slot-number'; number.textContent = index + 1;
  const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.backgroundColor = block.color;
  const dot = document.createElement('span'); dot.className = 'slot-dot';
  button.append(number, swatch, dot); button.addEventListener('click', () => selectBlock(index)); $('hotbar').append(button); return button;
});

function selectBlock(index) {
  selected = index;
  for (let i = 0; i < slots.length; i++) { slots[i].classList.toggle('active', i === index); slots[i].setAttribute('aria-pressed', String(i === index)); }
  $('selected-name').textContent = BLOCKS[index].name;
  if (tool === 'erase') setTool('place');
}

function setTool(next) {
  tool = next;
  $('place-tool').classList.toggle('active', tool === 'place'); $('place-tool').setAttribute('aria-pressed', String(tool === 'place'));
  $('erase-tool').classList.toggle('active', tool === 'erase'); $('erase-tool').setAttribute('aria-pressed', String(tool === 'erase'));
  $('touch-action').textContent = tool === 'place' ? 'Place' : 'Erase';
  if (mode === 'build') $('selected-name').textContent = tool === 'erase' ? 'Erase blocks' : BLOCKS[selected].name;
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); pointerValid = true;
}

function pick(action = tool) {
  camera.updateMatrixWorld();
  raycaster.far = mode === 'fly' ? 24 : 350;
  raycaster.setFromCamera(mode === 'fly' ? new THREE.Vector2(0, 0) : pointer, camera);
  const hits = raycaster.intersectObjects([...groups.filter(g => g.mesh.count > 0).map(g => g.mesh), ground], false);
  if (!hits.length) return null;
  const hit = hits[0];
  if (hit.object === ground) {
    if (action === 'erase') return null;
    const target = { x: Math.floor(hit.point.x), y: 0, z: Math.floor(hit.point.z), ground: true };
    return { ...target, valid: inBounds(target.x, target.y, target.z) && !world.get(target.x, target.y, target.z) };
  }
  const cell = groups[hit.object.userData.type].coords[hit.instanceId];
  if (!cell) return null;
  if (action === 'erase') return { ...cell, valid: true };
  const normal = hit.face.normal;
  const x = cell.x + Math.round(normal.x), y = cell.y + Math.round(normal.y), z = cell.z + Math.round(normal.z);
  return { x, y, z, valid: inBounds(x, y, z) && !world.get(x, y, z) };
}

function useTool(action = tool) {
  if (modalOpen) return;
  const target = pick(action);
  if (!target) { if (mode === 'fly') toast('Move closer to a block or the surface.'); return; }
  if (!target.valid) { toast(`Build inside the marked 128 × 128 area, up to ${WORLD_HEIGHT} blocks high.`); return; }
  let success;
  if (action === 'erase') success = world.remove(target.x, target.y, target.z);
  else {
    success = world.place(target.x, target.y, target.z, selected);
    if (!success && world.blocks.size >= MAX_BLOCKS) toast('This world is full. Remove a few blocks to keep building.');
  }
  if (success) { updateUI(); updateGhost(); }
}

function updateGhost() {
  if (modalOpen || (!pointerValid && mode === 'build') || gesture?.dragged || (mode === 'fly' && !pointerLocked && !touchDevice && !fallbackFly)) { ghost.visible = false; return; }
  currentTarget = pick(tool);
  if (!currentTarget) { ghost.visible = false; return; }
  ghost.visible = true;
  ghost.position.set(currentTarget.x + .5, currentTarget.y + .5, currentTarget.z + .5);
  const color = tool === 'erase' || !currentTarget.valid ? 0xff947b : 0xd8f692;
  ghostSolid.material.color.setHex(color); ghostLines.material.color.setHex(color);
}

function orbitCamera(dt, immediate = false) {
  const blend = immediate ? 1 : 1 - Math.exp(-18 * dt);
  view.theta += (orbit.theta - view.theta) * blend; view.phi += (orbit.phi - view.phi) * blend; view.radius += (orbit.radius - view.radius) * blend; view.target.lerp(orbit.target, blend);
  camera.position.set(view.target.x + view.radius * Math.sin(view.phi) * Math.sin(view.theta), view.target.y + view.radius * Math.cos(view.phi), view.target.z + view.radius * Math.sin(view.phi) * Math.cos(view.theta));
  camera.lookAt(view.target);
}
orbitCamera(0, true);

function homeView() {
  if (mode === 'fly') setMode('build');
  orbit.theta = .74; orbit.phi = 1.29; orbit.radius = innerWidth < 650 ? 47 : 35; orbit.target.set(-.5, 1, 1.2);
}

function pan(dx, dy) {
  const scale = orbit.radius * .00145;
  orbit.target.x += (-dx * Math.cos(orbit.theta) - dy * Math.sin(orbit.theta)) * scale;
  orbit.target.z += (dx * Math.sin(orbit.theta) - dy * Math.cos(orbit.theta)) * scale;
  orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -62, 62); orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -62, 62);
}

function requestLock() {
  if (touchDevice || mode !== 'fly') return;
  if (!canvas.requestPointerLock) { fallbackFly = true; $('fly-prompt').hidden = true; toast('Drag to look around. Use WASD to fly.'); return; }
  try { const result = canvas.requestPointerLock(); if (result?.catch) result.catch(lockFallback); } catch { lockFallback(); }
}
function lockFallback() { if (mode !== 'fly') return; fallbackFly = true; $('fly-prompt').hidden = true; canvas.focus({ preventScroll: true }); toast('Drag to look around. Use WASD to fly.'); }

function setMode(next, lock = false) {
  if (next === mode) { if (mode === 'fly' && lock && !pointerLocked) requestLock(); return; }
  keys.clear(); ghost.visible = false; gesture = null; pointers.clear();
  if (next === 'fly') {
    mode = 'fly'; flyEuler.setFromQuaternion(camera.quaternion, 'YXZ'); camera.fov = 65;
    $('fly-prompt').hidden = touchDevice || fallbackFly; $('touch-flight').hidden = !touchDevice;
    $('mode-caption').textContent = 'Free flight';
    $('controls-hint').innerHTML = touchDevice ? '<span>Drag <b>look</b></span><i>·</i><span>Arrows <b>move</b></span><i>·</i><span>+ / − <b>up / down</b></span>' : '<span>WASD <b>move</b></span><i>·</i><span>Space / Shift <b>up / down</b></span><i>·</i><span>Esc <b>release cursor</b></span>';
    if (lock) requestLock();
  } else {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    const look = new THREE.Vector3(); camera.getWorldDirection(look);
    orbit.target.copy(camera.position).addScaledVector(look, 17); orbit.target.y = THREE.MathUtils.clamp(orbit.target.y, .5, 30);
    orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -62, 62); orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -62, 62);
    const offset = camera.position.clone().sub(orbit.target), sphere = new THREE.Spherical().setFromVector3(offset);
    orbit.theta = sphere.theta; orbit.phi = THREE.MathUtils.clamp(sphere.phi, .15, 1.48); orbit.radius = THREE.MathUtils.clamp(sphere.radius, 5, 105);
    mode = 'build'; camera.fov = 55; orbitCamera(0, true);
    $('fly-prompt').hidden = true; $('touch-flight').hidden = true; $('mode-caption').textContent = 'Orbital view'; updateControlHint();
  }
  camera.updateProjectionMatrix(); document.body.classList.toggle('is-flying', mode === 'fly');
  $('build-mode').classList.toggle('active', mode === 'build'); $('build-mode').setAttribute('aria-pressed', String(mode === 'build'));
  $('explore-mode').classList.toggle('active', mode === 'fly'); $('explore-mode').setAttribute('aria-pressed', String(mode === 'fly'));
}

function updateControlHint() {
  if (mode !== 'build') return;
  $('controls-hint').innerHTML = touchDevice ? '<span>Tap <b>place</b></span><i>·</i><span>Drag <b>orbit</b></span><i>·</i><span>Pinch <b>zoom</b></span><i>·</i><span>2 fingers <b>pan</b></span>' : '<span>Click <b>place</b></span><i>·</i><span>Right-click <b>erase</b></span><i>·</i><span>Drag <b>orbit</b></span><i>·</i><span>Scroll <b>zoom</b></span>';
}

canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (modalOpen) return; event.preventDefault(); canvas.focus({ preventScroll: true }); updatePointer(event);
  if (mode === 'fly' && !pointerLocked && !touchDevice && !fallbackFly) { requestLock(); return; }
  if (pointerLocked) { useTool(event.button === 2 ? 'erase' : tool); return; }
  canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) gesture = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, button: event.button, pan: event.shiftKey || event.button === 1, dragged: false };
  if (pointers.size >= 2) { if (gesture) gesture.dragged = true; multiTouch = touchMetrics(); }
});
function touchMetrics() {
  const [a, b] = [...pointers.values()]; if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
}
canvas.addEventListener('pointermove', event => {
  if (modalOpen) return;
  if (pointerLocked) { flyEuler.y -= event.movementX * .002; flyEuler.x = THREE.MathUtils.clamp(flyEuler.x - event.movementY * .002, -1.52, 1.52); camera.quaternion.setFromEuler(flyEuler); return; }
  updatePointer(event);
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2) {
    const next = touchMetrics();
    if (next && multiTouch && mode === 'build') {
      orbit.radius = THREE.MathUtils.clamp(orbit.radius * multiTouch.distance / Math.max(next.distance, 1), 5, 105);
      pan(next.x - multiTouch.x, next.y - multiTouch.y);
    }
    multiTouch = next; if (gesture) gesture.dragged = true; return;
  }
  if (!gesture) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 5) gesture.dragged = true;
  if (gesture.dragged) {
    document.body.classList.add('is-dragging');
    if (mode === 'fly') { flyEuler.y -= dx * .004; flyEuler.x = THREE.MathUtils.clamp(flyEuler.x - dy * .004, -1.52, 1.52); camera.quaternion.setFromEuler(flyEuler); }
    else if (gesture.pan || gesture.button === 2) pan(dx, dy);
    else { orbit.theta -= dx * .005; orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * .005, .15, 1.48); }
  }
  gesture.x = event.clientX; gesture.y = event.clientY;
});
canvas.addEventListener('pointerup', event => {
  if (pointerLocked) return;
  updatePointer(event);
  const clicked = gesture && !gesture.dragged && pointers.size === 1;
  pointers.delete(event.pointerId);
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (clicked && gesture.button !== 1) useTool(gesture.button === 2 ? 'erase' : tool);
  if (!pointers.size) { gesture = null; multiTouch = null; document.body.classList.remove('is-dragging'); }
  else { const p = [...pointers.values()][0]; gesture = { x: p.x, y: p.y, startX: p.x, startY: p.y, button: 0, dragged: true }; }
});
canvas.addEventListener('pointercancel', () => { pointers.clear(); gesture = null; multiTouch = null; document.body.classList.remove('is-dragging'); });
canvas.addEventListener('pointerleave', () => { if (!pointers.size && mode === 'build') pointerValid = false; });
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (mode === 'build') orbit.radius = THREE.MathUtils.clamp(orbit.radius * Math.exp(event.deltaY * (event.deltaMode === 1 ? .028 : .0014)), 5, 105);
  else selectBlock((selected + (event.deltaY > 0 ? 1 : 7)) % BLOCKS.length);
}, { passive: false });

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  $('fly-prompt').hidden = mode !== 'fly' || pointerLocked || touchDevice || fallbackFly;
  if (!pointerLocked) keys.clear();
});
document.addEventListener('pointerlockerror', lockFallback);

function undo(redo = false) {
  if (redo ? world.redo() : world.undo()) { updateUI(); toast(redo ? 'Change restored' : 'Last change undone'); }
}
function openDialog(id) { keys.clear(); if (pointerLocked) document.exitPointerLock(); modalOpen = true; $(id).showModal(); }
for (const id of ['help-dialog', 'reset-dialog']) {
  $(id).addEventListener('close', () => { modalOpen = false; canvas.focus({ preventScroll: true }); });
  $(id).addEventListener('click', event => { if (event.target !== $(id)) return; const rect = $(id).getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $(id).close(); });
}
document.addEventListener('keydown', event => {
  if (modalOpen || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') { event.preventDefault(); undo(event.shiftKey); return; }
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') { event.preventDefault(); undo(true); return; }
  if (event.metaKey || event.altKey) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (mode === 'fly') keys.add(event.code);
  if (event.repeat) return;
  if (/^Digit[1-8]$/.test(event.code)) selectBlock(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyB') setMode('build');
  if (event.code === 'KeyF') setMode(mode === 'fly' ? 'build' : 'fly', true);
  if (event.code === 'KeyQ') setTool('place');
  if (event.code === 'KeyE') setTool('erase');
  if (event.code === 'KeyR') homeView();
  if (event.code === 'KeyH') openDialog('help-dialog');
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); pointers.clear(); gesture = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });

$('place-tool').addEventListener('click', () => setTool('place'));
$('erase-tool').addEventListener('click', () => setTool('erase'));
$('undo-button').addEventListener('click', () => undo());
$('home-button').addEventListener('click', homeView);
$('build-mode').addEventListener('click', () => setMode('build'));
$('explore-mode').addEventListener('click', () => setMode('fly', true));
$('return-build').addEventListener('click', () => setMode('build'));
$('help-button').addEventListener('click', () => openDialog('help-dialog'));
$('help-dialog').querySelector('.dialog-close').addEventListener('click', () => $('help-dialog').close());
$('help-done').addEventListener('click', () => $('help-dialog').close());
$('reset-button').addEventListener('click', () => openDialog('reset-dialog'));
$('reset-cancel').addEventListener('click', () => $('reset-dialog').close());
function resetWorld(starter) { world.clear(); if (starter) createStarter(world); updateUI(); $('reset-dialog').close(); homeView(); toast(starter ? 'A fresh outpost. Make it yours.' : 'An empty moon, ready for your first block.'); }
$('reset-empty').addEventListener('click', () => resetWorld(false));
$('reset-starter').addEventListener('click', () => resetWorld(true));
$('touch-action').addEventListener('click', () => useTool());
for (const button of document.querySelectorAll('[data-move]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(button.dataset.move); });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(eventName, () => keys.delete(button.dataset.move));
}

function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); disposed = true; showFatal('The 3D graphics connection was interrupted. Reload to start a fresh world.'); });

// Inventory thumbnails use the actual game geometry and materials.
function makeThumbnails() {
  const thumbnailScene = new THREE.Scene();
  thumbnailScene.add(new THREE.HemisphereLight(0xe5f1ff, 0x475566, 2));
  const lamp = new THREE.DirectionalLight(0xffffff, 3); lamp.position.set(-3, 5, 4); thumbnailScene.add(lamp);
  const thumbnailCamera = new THREE.PerspectiveCamera(34, 1, .1, 10); thumbnailCamera.position.set(2, 1.7, 2.5); thumbnailCamera.lookAt(0, 0, 0);
  const target = new THREE.WebGLRenderTarget(96, 96, { type: THREE.UnsignedByteType });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const cube = new THREE.Mesh(boxGeometry, materials[0]); thumbnailScene.add(cube);
  const pixels = new Uint8Array(96 * 96 * 4), imageCanvas = document.createElement('canvas'); imageCanvas.width = imageCanvas.height = 96;
  const context = imageCanvas.getContext('2d'), imageData = context.createImageData(96, 96);
  const oldColor = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha(); renderer.setClearColor(0x000000, 0);
  for (let i = 0; i < materials.length; i++) {
    cube.material = materials[i]; renderer.setRenderTarget(target); renderer.render(thumbnailScene, thumbnailCamera); renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
    for (let y = 0; y < 96; y++) imageData.data.set(pixels.subarray((95 - y) * 96 * 4, (96 - y) * 96 * 4), y * 96 * 4);
    context.putImageData(imageData, 0, 0);
    const image = document.createElement('img'); image.alt = ''; image.src = imageCanvas.toDataURL('image/png'); image.width = image.height = 96;
    slots[i].querySelector('.swatch').replaceWith(image);
  }
  renderer.setRenderTarget(null); renderer.setClearColor(oldColor, oldAlpha); target.dispose();
}

let lastTime = performance.now(), lastGhostTime = 0, lastHudTime = 0;
function tick(now) {
  if (disposed) return;
  requestAnimationFrame(tick);
  const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
  if (document.hidden) return;
  if (mode === 'build') orbitCamera(dt);
  else if (!modalOpen && (pointerLocked || touchDevice || fallbackFly)) {
    forward.set(-Math.sin(flyEuler.y), 0, -Math.cos(flyEuler.y)); right.set(Math.cos(flyEuler.y), 0, -Math.sin(flyEuler.y)); movement.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp')) movement.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) movement.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) movement.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) movement.sub(right);
    if (keys.has('Space')) movement.y += 1;
    if (keys.has('ShiftLeft') || keys.has('ShiftRight')) movement.y -= 1;
    if (movement.lengthSq()) camera.position.addScaledVector(movement.normalize(), dt * (keys.has('ControlLeft') || keys.has('ControlRight') ? 25 : 10));
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, .45, 140);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -180, 180); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -180, 180);
  }
  if (now - lastGhostTime > 40) { updateGhost(); lastGhostTime = now; }
  if (now - lastHudTime > 150) {
    const position = mode === 'fly' ? camera.position : view.target;
    const coord = value => `${value < 0 ? '−' : ''}${String(Math.abs(Math.round(value))).padStart(3, '0')}`;
    $('coordinates').innerHTML = `X ${coord(position.x)} <span>/</span> Z ${coord(position.z)}`;
    $('compass-arrow').style.transform = `rotate(${(mode === 'fly' ? flyEuler.y : view.theta) * -180 / Math.PI}deg)`;
    const shadowX = Math.round(position.x / 8) * 8, shadowZ = Math.round(position.z / 8) * 8;
    sun.position.set(shadowX - 35, 48, shadowZ + 28); sun.target.position.set(shadowX, 0, shadowZ);
    lastHudTime = now;
  }
  renderer.render(scene, camera);
  if (!loadingDone) { loadingDone = true; $('loading').classList.add('ready'); setTimeout(() => $('loading').hidden = true, 650); }
}

function showFatal(message) {
  const overlay = $('loading'); overlay.hidden = false; overlay.classList.remove('ready'); overlay.classList.add('error');
  overlay.querySelector('span').textContent = message;
  if (!overlay.querySelector('button')) { const button = document.createElement('button'); button.textContent = 'Reload game'; button.addEventListener('click', () => location.reload()); overlay.append(button); }
}

updateUI(); updateControlHint();
try { makeThumbnails(); } catch (error) { renderer.setRenderTarget(null); console.warn('Using simple palette swatches.', error); }
requestAnimationFrame(tick);
