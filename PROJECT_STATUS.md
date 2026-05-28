# 📊 Project Status — Roofline Dash

> Last updated: 2026-03-27  
> Status: **⏸️ Paused — Game is playable, polish & features pending**

---

## ✅ What's Working

- [x] Game loads fully from `index.html` — no server needed
- [x] Three.js 3D scene renders correctly
- [x] Player character (animated `.glb` model) loads and plays `sprint` animation
- [x] 3-lane system with smooth left/right movement (lerp-based)
- [x] Jump with gravity physics
- [x] Slide (timed, with animation state change)
- [x] Hazard spawning (coffins, spiked balls, saws) — correctly move toward player
- [x] Environmental props (trees, bushes, rocks) spawn on sides
- [x] Basic collision detection (lane + Z proximity)
- [x] Game Over screen with distance + credits earned
- [x] Restart flow works (retry button + `R` key)
- [x] Difficulty selector (Easy / Medium / Hard) — affects speed and spawn rate
- [x] Wardrobe UI (3 skins) — UI updates, selection tracked in state
- [x] HUD: Score, Distance, Credits, Multiplier
- [x] Score and Credits persist in `localStorage` between sessions
- [x] All assets bundled offline in `assets.js`
- [x] `build-assets.ps1` — working asset packer

---

## 🔴 Bugs / Broken Things

| Bug | File | Priority |
|---|---|---|
| Collision detection: jump/slide bypass logic has a dead branch | `game.js` line 295-299 | 🔴 High |
| Slide animation may not exist on character model (unknown clip name) | `game.js` line 248 | 🟡 Medium |
| Wardrobe skin selection doesn't change 3D model material | `game.js` line 391 | 🟡 Medium |
| Google Fonts fails silently when offline (visual-only) | `index.html` line 10 | 🟢 Low |

---

## 🟡 Incomplete Features

| Feature | Status | Notes |
|---|---|---|
| Parcel/coin collectibles | ❌ Not started | Need spawn logic + 3D pickup object + visual FX |
| Score multiplier / combo chain | ❌ Not started | Multiplier tracked but never increases |
| Sound effects | ❌ Not started | Web Audio API preferred (no files needed) |
| Wardrobe → actual material swap | ❌ Not started | Need `player.traverse()` + `material.color.set()` |
| Slide collision height logic | ❌ Incomplete | Some obstacles need ducking, some need jumping |
| Rooftop visual environment | 🟡 Basic | Only a flat floor; rooftop props (vents, AC units) would add polish |

---

## 🗺️ Suggested Next Steps (in priority order)

### 1. Fix collision detection
```js
// In update(), replace the broken collision block with proper AABB or at minimum:
// - tall obstacles (coffin): must JUMP to avoid (height > 1.5)
// - low barriers (wall): must SLIDE to avoid (height <= 1.0)
// - Mark hazard types with a metadata field at spawn time
```

### 2. Add parcel pickups
- Spawn a glowing `Chest.gltf` or simple box mesh in a random lane at Z=-100
- Move it with hazards
- On lane-match + Z proximity: collect it, +credits, visual flash
- Use `Chest.gltf` which already exists in `assets/` folder

### 3. Multiplier / combo
- Every 10 hazards avoided without collision → `state.multiplier += 0.5`
- Score = `distance * multiplier` instead of raw distance
- Display goes up on HUD, resets on hit

### 4. Wardrobe skin → real model color
```js
function applySkin(skinId) {
    const skin = WARDROBE.find(s => s.id === skinId);
    if (!skin || !player) return;
    player.traverse(child => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.setHex(skin.color);
        }
    });
}
// Call applySkin(state.skin) after setupPlayer() and on wardrobe click
```

### 5. Jump sound / land sound (Web Audio API)
```js
const ctx = new AudioContext();
function playJumpSound() {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
}
```

### 6. Visual Polish Ideas
- Neon lane dividers (thin glowing `LineSegments` at x = ±2, z track)
- Particle burst on collection (simple geometry spawn + fade)
- Camera shake on death (brief offset to camera position)
- Speed lines overlay (CSS `radial-gradient` animation that speeds up with game speed)

---

## 📁 Assets Available but Unused

Many `.gltf` files in `assets/` are **not yet bundled or used** in gameplay:

| File | Potential Use |
|---|---|
| `Chest.gltf` | Collectible parcel pickup |
| `Hazard_Saw.gltf`, `Hazard_Cylinder.gltf`, `Hazard_SpikeTrap.gltf` | Additional obstacle variety |
| `Bridge_Modular.gltf`, `Stairs.gltf` | Track geometry (elevated sections) |
| `Cannon.gltf`, `Cannonball.gltf` | Projectile hazard type |
| `Numbers_0-9.gltf` | 3D score display instead of HTML HUD |
| `Cloud_1/2/3.gltf` | Background atmosphere |
| `Fence_*.gltf`, `Pipe_*.gltf` | Rooftop environment dressing |
| `Goal_Flag.gltf` | Milestone marker at score checkpoints |

To use any of these, add them to `build-assets.ps1`, re-run it, then reference the new key in `initAssets()`.

---

## 🔗 Conversation History (for context)

| Session | Topic |
|---|---|
| `a75950ff` | Initial project creation |
| `7ae8997f` | Modernizing graphics — 3D model integration |
| `a1fbcb8e` | **Final session** — Fixed loading, restored runner after Neon Dungeon pivot, made offline |

To read full session logs, use conversation ID in the AI system's brain logs.
