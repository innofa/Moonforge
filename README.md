# Moonforge

A self-contained, browser-based lunar voxel sandbox. All game assets and the pinned Three.js 0.170.0 library are served locally from `dist/`.

The flat construction area is 128 × 128 cells and 48 blocks high, with a 16,000-block performance limit and eight unlimited materials. Players can orbit, pan, zoom, place and erase blocks, undo and redo, enter free flight, or start an empty world. A 309-block starter outpost is completely editable. Touch controls are included.

Worlds are session-only. Reloading the page restores the starter outpost.

- `dist/game.js`: rendering, instanced block meshes, picking, input, and interface.
- `dist/voxel-world.js`: bounded block state, undo/redo, and starter layout.
- `dist/materials.js`: procedural game materials and space environment.
- `dist/index.html` and `dist/style.css`: responsive game HUD and controls.

Three.js is distributed under its MIT license in `dist/vendor/LICENSE`.
