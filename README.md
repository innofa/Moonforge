# Moonforge

A self-contained, browser-based lunar voxel sandbox. All game assets and the pinned Three.js 0.170.0 library are served locally from `dist/`.

## Launch the game

### Play online

Open [Moonforge](https://moonforge.genco58.chatgpt.site) in your browser. The hosted version is private and requires access as the site owner. To play your own copy, follow the local instructions below.

### Run locally

You need **Python 3** and a browser with **WebGL 2** support. No npm packages or build step are required.

1. Download this repository using **Code → Download ZIP** and extract it, or clone it:

   ```bash
   git clone https://github.com/innofa/Moonforge.git
   cd Moonforge
   ```

2. Open a terminal in the project folder—the folder containing `README.md` and `dist`—and start a local web server.

   **macOS / Linux:**

   ```bash
   python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
   ```

   **Windows:**

   ```powershell
   py -3 -m http.server 8000 --bind 127.0.0.1 --directory dist
   ```

3. Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

Keep the terminal running while you play. Press **Ctrl+C** in the terminal to stop the server.

Use the web server rather than double-clicking `dist/index.html`: the game loads JavaScript modules, which browsers restrict when opened directly from disk. If port 8000 is already in use, change `8000` to `8001` in both the command and browser address.

### Basic controls

- **Click / tap:** place a block.
- **Right-click:** remove a block, or select the Erase tool.
- **Drag:** orbit the camera.
- **Scroll / pinch:** zoom.
- **1–8:** select a material.
- **F:** enter fly mode; use **WASD** to move and **Space / Shift** to fly up / down.
- **B:** return to build mode.
- **H:** open the full controls guide.

## About the world

The flat construction area is 128 × 128 cells and 48 blocks high, with a 16,000-block performance limit and eight unlimited materials. Players can orbit, pan, zoom, place and erase blocks, undo and redo, enter free flight, or start an empty world. A 309-block starter outpost is completely editable. Touch controls are included.

**Worlds are session-only. Reloading the page restores the starter outpost.**

## Project files

- `dist/game.js`: rendering, instanced block meshes, picking, input, and interface.
- `dist/voxel-world.js`: bounded block state, undo/redo, and starter layout.
- `dist/materials.js`: procedural game materials and space environment.
- `dist/index.html` and `dist/style.css`: responsive game HUD and controls.

Three.js is distributed under its MIT license in `dist/vendor/LICENSE`.
