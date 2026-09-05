export const BLOCKS = [
  { id: 'stone', name: 'Lunar stone', color: '#9296a0' },
  { id: 'hull', name: 'Habitat alloy', color: '#d9e1de' },
  { id: 'basalt', name: 'Dark basalt', color: '#343d48' },
  { id: 'glass', name: 'Lunar glass', color: '#6ecbdd' },
  { id: 'solar', name: 'Solar panel', color: '#426396' },
  { id: 'copper', name: 'Copper', color: '#c67c42' },
  { id: 'light', name: 'Glow block', color: '#dafa9b' },
  { id: 'red', name: 'Signal orange', color: '#e4764c' },
];
export const WORLD_HALF = 64;
export const WORLD_HEIGHT = 48;
export const MAX_BLOCKS = 16000;
export const blockKey = (x, y, z) => `${x},${y},${z}`;
export const inBounds = (x, y, z) => Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= -WORLD_HALF && x < WORLD_HALF && z >= -WORLD_HALF && z < WORLD_HALF && y >= 0 && y < WORLD_HEIGHT;

export class VoxelWorld {
  constructor(onChange = () => {}) { this.blocks = new Map(); this.history = []; this.future = []; this.onChange = onChange; }
  get(x, y, z) { return this.blocks.get(blockKey(x, y, z)); }
  write(x, y, z, type) {
    const key = blockKey(x, y, z);
    if (type === null) this.blocks.delete(key);
    else this.blocks.set(key, { x, y, z, type });
    this.onChange({ x, y, z, type });
  }
  place(x, y, z, type, record = true) {
    if (!inBounds(x, y, z) || !BLOCKS[type] || this.get(x, y, z) || this.blocks.size >= MAX_BLOCKS) return false;
    this.write(x, y, z, type);
    if (record) this.record({ x, y, z, before: null, after: type });
    return true;
  }
  remove(x, y, z) {
    const block = this.get(x, y, z);
    if (!block) return false;
    this.write(x, y, z, null);
    this.record({ x, y, z, before: block.type, after: null });
    return true;
  }
  record(change) { this.history.push(change); if (this.history.length > 500) this.history.shift(); this.future.length = 0; }
  undo() {
    const change = this.history.pop(); if (!change) return false;
    this.write(change.x, change.y, change.z, change.before); this.future.push(change); return true;
  }
  redo() {
    const change = this.future.pop(); if (!change) return false;
    this.write(change.x, change.y, change.z, change.after); this.history.push(change); return true;
  }
  clear() {
    for (const block of this.blocks.values()) this.onChange({ ...block, type: null });
    this.blocks.clear(); this.history.length = 0; this.future.length = 0;
  }
}

export function createStarter(world) {
  const put = (x, y, z, t) => world.place(x, y, z, t, false);
  // A compact, editable habitat. Everything in the outpost is made from inventory blocks.
  for (let x = -7; x <= 0; x++) for (let z = -6; z <= 0; z++) {
    put(x, 0, z, 2);
    const edge = x === -7 || x === 0 || z === -6 || z === 0;
    if (edge) for (let y = 1; y <= 3; y++) {
      if (z === 0 && (x === -4 || x === -3) && y < 3) continue;
      const corner = (x === -7 || x === 0) && (z === -6 || z === 0);
      const glass = y === 2 && !corner;
      put(x, y, z, glass ? 3 : (y === 1 && corner ? 7 : 1));
    }
    put(x, 4, z, edge ? 1 : 2);
    if (x >= -6 && x <= -2 && z >= -5 && z <= -2) put(x, 5, z, 4);
  }
  put(-6, 1, -5, 6); put(-1, 1, -5, 6); put(-4, 3, 0, 6); put(-3, 3, 0, 6);
  for (let x = -4; x <= -3; x++) for (let z = 1; z <= 5; z++) put(x, 0, z, 1);
  for (let x = -7; x <= 0; x++) for (let z = 6; z <= 10; z++) {
    put(x, 0, z, x === -7 || x === 0 || z === 6 || z === 10 ? 5 : 2);
  }
  for (let z = 7; z <= 9; z++) { put(-5, 1, z, 1); put(-2, 1, z, 1); }
  put(-4, 1, 8, 1); put(-3, 1, 8, 1);
  // A solar array and two guide lights flank the approach.
  for (let x = 4; x <= 8; x++) for (let z = -5; z <= -2; z++) {
    if ((x === 4 || x === 8) && (z === -5 || z === -2)) { put(x, 0, z, 2); put(x, 1, z, 2); }
    put(x, 2, z, 4);
  }
  for (const [x, z] of [[-6, 3], [-1, 3]]) { put(x, 0, z, 2); put(x, 1, z, 6); }
  // Signal mast.
  for (let y = 0; y <= 6; y++) put(5, y, 3, y === 6 ? 6 : y % 2 ? 7 : 1);
  put(6, 5, 3, 7); put(7, 5, 3, 7); put(6, 4, 3, 7); put(7, 4, 3, 7);
}
