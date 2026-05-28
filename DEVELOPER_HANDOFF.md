# 🧑‍💻 Developer Handoff — Roofline Dash

> **Purpose**: This document exists so that any developer or AI assistant can fully understand the current state of this project, pick up exactly where work left off, and continue without confusion.

---

## 🎮 What This Is

**Roofline Dash** is a browser-based 3D endless runner. The player controls a courier character running across rooftops, avoiding hazards (coffins, spiked balls, saw blades), changing lanes, jumping, and sliding.

Built entirely with:
- **Three.js r145** (bundled locally as `three.min.js`)
- **GLTFLoader** (`GLTFLoader.legacy.js`) for loading 3D models
- **Vanilla HTML/CSS/JS** — no framework, no build system, no Node.js needed

The game is **100% offline**. Every model is pre-packed into `assets.js` as base64 strings. Open `index.html` directly and it works.

---

## 📜 History / Pivot Context

This project went through several phases (useful to know if reading conversation logs):

1. **Phase 1** — Basic 2D runner concept → expanded to 3D  
2. **Phase 2** — "Modernizing" graphics: replacing placeholder shapes with real `.glb` character models and GLTF environment props  
3. **Phase 3** — A pivot to a "Neon Dungeon" roguelike shooter was explored but **abandoned**
4. **Current State** — Back to the original **Roofline Dash** 3D runner, fully restored. The game loads, renders, and plays. The last sessions fixed loading issues and restored the offline asset pipeline.

---

## 🧠 Core Code: `game.js`

This is the single most important file. It does everything:

### Constants (top of file)
```js
const LANE_WIDTH = 4;
const LANES = [-4, 0, 4];       // Left, Center, Right lane X positions
const INITIAL_SPEED = 30;
const SPEED_INCREMENT = 0.5;    // Game gets faster over time
const GRAVITY = -45;
const JUMP_FORCE = 18;
```

### Game State Object
```js
let state = {
    playing: false,
    speed, score, best, credits, earnedThisRun, distance, multiplier,
    lane: 1,       // 0=Left, 1=Center, 2=Right
    targetX: 0,    // Where player should be (lerp target)
    currentX: 0,   // Actual smooth position
    isJumping, isSliding, verticalVelocity, y,
    mode: 'easy',  // 'easy' | 'medium' | 'hard'
    skin: 'courier'
}
```

### Asset Loading Pipeline
1. `assets.js` exposes `window.ROOFLINE_ASSETS` — an object of base64-encoded GLTF strings
2. `loadGltfFromB64(key, b64)` — decodes base64 → creates `Blob` → makes `ObjectURL` → feeds to `GLTFLoader`
3. `initAssets()` loads: `player`, `bomb` (coffin0), `saw` (coffin2), `spiky` (coffin1), `tree` (prop2), `bush` (prop0), `rock` (prop3)

### Startup Sequence
```
initEngine() → initAssets() → setupPlayer() → initUI() → resetGame() → render()
```

### Render Loop (`render()`)
- `requestAnimationFrame` loop
- Calls `update(delta)` capped at 0.1s to prevent spiral of death
- Then `renderer.render(scene, camera)`

### Key Subsystems
| System | What it does |
|---|---|
| Lane switching | `state.lane` → `state.targetX` → lerp `state.currentX` |
| Jump physics | Custom gravity + vertical velocity on `state.y` |
| Hazard spawn | Random lane, random type (bomb/saw/spiky), spawns at Z=-100 |
| Prop spawn | Trees/bushes/rocks off to sides at Z=-100 |
| Collision | Simple distance check on Z axis + lane match |
| Animation | Three.js `AnimationMixer` with named clips: `sprint`, `jump`, `slide`, `die` |

---

## 🖼️ UI Structure (`index.html` + `styles.css`)

### HUD (always visible during play)
- **Top-left**: Score + Best
- **Top-right**: Credits
- **Bottom-left**: Multiplier (MULTX)
- **Bottom-right**: Distance

### Overlays (`.menu-modal`)
- `#start-menu` — shown on load; has PACE (difficulty) + WARDROBE selector + START RUN button
- `#game-over-menu` — shown on death; shows distance + credits earned + RUN IT BACK button

### Wardrobe
Three skin options defined in `WARDROBE` array in `game.js`:
```js
{ id: 'courier', name: 'Courier Jacket', color: 0xffb347 }
{ id: 'transit', name: 'Transit Vest',   color: 0x00dbde }
{ id: 'stealth', name: 'Stealth Suit',   color: 0x333333 }
```
Currently the wardrobe UI shows color swatches. **The actual 3D model color/material swap is not yet implemented** — `state.skin` is tracked but not applied to the mesh.

---

## 🐛 Known Issues / Technical Debt

### 1. Wardrobe skin not applied to 3D model
- **Problem**: Selecting a skin in the Wardrobe UI updates `state.skin` but does NOT change the player mesh material/color.
- **What needs doing**: In `setupPlayer()` or a `applySkin(skinId)` function, traverse `player` meshes and update their `material.color`.

### 2. Collision detection is approximate / broken
- **Problem**: Current collision (`distZ < 0.8 && lane === state.lane`) is very basic. The jump/slide bypass logic has a bug — the `isColliding` variable is computed but then the actual `gameOver()` only triggers on `distZ < 0.8` regardless.
- **What needs doing**: Either use Three.js `Box3`-based AABB collision, or fix the height-based bypass logic (tall obstacles need jump, low bars need slide).

### 3. No collectible parcels / credits system yet
- **Problem**: Credits currently increment just by "passing" a hazard (1 credit per hazard passed). There's no visible pickup object.
- **What needs doing**: Add a gold parcel/coin pickup spawned in a lane, with detection and visual feedback.

### 4. Multiplier not scaling
- **Problem**: `state.multiplier` is tracked in state but never increases. The MULTX HUD always shows `1.0`.
- **What needs doing**: Implement combo chain logic (e.g., every N hazards avoided without taking damage → multiplier goes up).

### 5. Slide animation may not exist in model
- **Problem**: `switchAnimation('slide')` is called but the character model may not have a `slide` clip. Need to verify animation clip names from `Character.gltf`.
- **What needs doing**: `console.log(Object.keys(animations))` after loading to see actual clip names. If no slide, use crouch or create a custom scale tween.

### 6. Google Fonts dependency (minor)
- `index.html` loads Outfit + Inter from Google Fonts. If offline without cache, fonts fall back to system defaults. Not a gameplay issue but affects appearance.

---

## 🔩 Asset System: How `assets.js` Works

The file `assets.js` exports a global `window.ROOFLINE_ASSETS` object like:
```js
window.ROOFLINE_ASSETS = {
    player: "base64...",   // Character.gltf as base64
    coffin0: "base64...",  // coffin1.glb as base64 (Bomb/coffin hazard)
    coffin1: "base64...",  // Spiky ball
    coffin2: "base64...",  // Saw
    prop0: "base64...",    // Bush
    prop2: "base64...",    // Tree
    prop3: "base64...",    // Rock
    ...
}
```

To rebuild this bundle after changing assets, run:
```powershell
.\build-assets.ps1
```

---

## 🗺️ What to Build Next (Roadmap)

See `PROJECT_STATUS.md` for the detailed task list. High-level priorities:

1. **Fix collision detection** — make jump/slide actually matter
2. **Add parcel pickups** — visible collectibles on the track
3. **Implement multiplier/combo system**
4. **Wire up wardrobe skins** to actually change model material
5. **Add sound effects** — jump, land, collection, death (Web Audio API, no file needed)
6. **Visual polish** — glowing neon lane markers, particle effects on collection, rooftop scenery

---

## 💡 Tips for Resuming (for AI assistants)

- **Always check `game.js` first** — all gameplay logic lives there
- **`assets.js` is huge (~1.4MB)** — don't open it. Trust that it works; rebuild with `build-assets.ps1` if needed
- **The `state` object is the source of truth** — understand it before making changes
- **Animation clip names** — print `Object.keys(animations)` in browser console to see what's available from the loaded model
- **No TypeScript, no framework** — pure vanilla JS. Keep it that way unless specifically asked to refactor
- **Don't add npm/node** — the whole point is zero dependencies and file:// protocol support
