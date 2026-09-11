# Cosmic Universe Background — Visual Design & Technical Specification
**AURORA Design System &bull; VK Wall Searcher**  
*Author: Cosmic Universe Visual Designer*  
*Target Module: `src/cosmic.js` &bull; Target Container: `#cosmic-search-backdrop` &bull; Target Canvas: `#cosmic-universe-canvas`*

---

## 1. Executive Summary & Design Vision

The **Cosmic Universe Background** is a dedicated cinematic visual engine designed specifically for the **VK Wall Searcher** application. When the user initiates a search across multiple VK library group walls, the application transforms into an interstellar voyage through deep space and colorful galactic nebulae.

The visual concept symbolizes traveling through vast constellations of library posts and cultural records:
- **Zero-distraction focus:** Non-intrusive ambient background positioned behind the glassmorphism search modal (`pointer-events: none`).
- **Responsive 60 FPS performance:** Lightweight Canvas 2D engine with device-adaptive particle budgets and Retina display scaling.
- **Dynamic search-driven velocity:** Starts with a tranquil orbital cruise, explodes into hyperspace warp drive with light streaks during active API post fetching, pulses when 1,000-post batches arrive, and smoothly glides to a stop upon completion.
- **Strict Accessibility:** Automatic detection and adherence to `prefers-reduced-motion: reduce`.

---

## 2. Color Palette & Chromatic Architecture

The color system directly harmonizes with the **AURORA Design System** (Teal `#3EE6C4`, Violet `#8A6CFF`, Magenta `#F472B6`, Electric Blue `#38BDF8`).

| Color Name | Token / Hex / RGBA | Role & Visual Sensation |
| :--- | :--- | :--- |
| **Cosmic Deep Void** | `#050714` / `rgb(5, 7, 20)` | Deep space abyss backdrop, 100% pure contrast foundation |
| **Aurora Cyan Core** | `#3EE6C4` / `rgba(62, 230, 196, 1.0)` | Primary energetic starlight, nebula gas, and streak heads |
| **Galactic Violet** | `#8A6CFF` / `rgba(138, 108, 255, 1.0)` | Secondary interstellar nebulae and star corona glow |
| **Electric Magenta** | `#F472B6` / `rgba(244, 114, 182, 1.0)` | Warm energetic pulsar gas clouds and warp tail highlights |
| **Deep Galactic Blue** | `#38BDF8` / `rgba(56, 189, 248, 1.0)` | Atmospheric abyssal cosmic dust lanes |
| **Starlight Icy White** | `#E0F2FE` / `rgba(224, 242, 254, 1.0)` | Distant micro-star twinkle and streak focal points |
| **Starlight Pure White**| `#FFFFFF` / `rgba(255, 255, 255, 1.0)` | Highest energy hyperdrive stellar cores |
| **Stellar Amber Gold**  | `#FBBF24` / `rgba(251, 191, 36, 1.0)` | Rare ancient stellar corona (adds chromatic warmth) |

---

## 3. Mathematical Foundations & 3D Kinematics

### 3.1. 3D Perspective Projection

Camera observer is placed at $(0, 0, 0)$ looking directly forward down the $+Z$ axis. Screen coordinates are calculated from 3D space $(x, y, z)$:

$$X_{\text{screen}} = c_x + \frac{x \cdot f}{z}$$

$$Y_{\text{screen}} = c_y + \frac{y \cdot f}{z}$$

Where:
- $(c_x, c_y) = (W/2, H/2)$ is the center of projection (screen vanishing point).
- $f = \max(W, H) \times 0.65$ is the perspective focal length.
- $z \in [Z_{\min}, Z_{\max}]$ ($Z_{\min} = 1.0, Z_{\max} = 1400.0$).

### 3.2. Apparent Radius Scaling

To create realistic optical depth without pixel clipping:

$$R = R_{\text{base}} \times \left(1 - \frac{z}{Z_{\max}}\right) \times \left(1 + \frac{f}{z \cdot 1.8}\right)$$

Clamped between $0.4\text{px}$ and $5.5\text{px}$.

### 3.3. Warp Streak / Hyperspace Tail Calculation

When speed exceeds cruising velocity ($v > 3.0$), stars elongate into kinetic light streaks pointing from their tail position $(X_{\text{prev}}, Y_{\text{prev}})$ to head position $(X_{\text{screen}}, Y_{\text{screen}})$:

$$z_{\text{tail}} = z + \left(v \times k_{\text{streak}} \times \mu_{\text{star}}\right)$$

$$X_{\text{prev}} = c_x + \frac{x \cdot f}{z_{\text{tail}}}, \quad Y_{\text{prev}} = c_y + \frac{y \cdot f}{z_{\text{tail}}}$$

Length of streak:

$$L = \sqrt{(X_{\text{screen}} - X_{\text{prev}})^2 + (Y_{\text{screen}} - Y_{\text{prev}})^2}$$

- If $L \le 2.5\text{px}$: Render as soft glowing circular star dot.
- If $L > 2.5\text{px}$: Render as tapered linear gradient stroke:
  - $\text{Offset } 0.0$: `rgba(R, G, B, 0.0)` (vanishing into the void)
  - $\text{Offset } 0.4$: `rgba(R, G, B, 0.40)` (saturated energetic trail)
  - $\text{Offset } 0.85$: `rgba(224, 242, 254, 0.85)` (bright pre-head streak)
  - $\text{Offset } 1.0$: `#FFFFFF` (brilliant stellar head)
- Line width: $\text{clamp}(R \times 0.9, 1.2, 4.0)\text{px}$ with rounded caps (`lineCap = 'round'`).

---

## 4. Multi-Tier Layer Architecture

```
+-------------------------------------------------------------------+
| LAYER 0: Deep Space Void Base (#050714)                          |
+-------------------------------------------------------------------+
| LAYER 1: Volumetric Procedural Galactic Nebulae (4 Clusters)      |
|  - Aurora Teal Lagoon (cyan)                                      |
|  - Orion Deep Violet Core (purple)                                |
|  - Cygnus Electric Magenta Veil (pink)                            |
|  - Abyssal Azure Drift (blue)                                     |
|  [Blending: ctx.globalCompositeOperation = 'screen']              |
+-------------------------------------------------------------------+
| LAYER 2: Distant Twinkling Micro-Stars (Stardust)                 |
|  - Subtle sinusoidal sparkle, low parallax drift                  |
+-------------------------------------------------------------------+
| LAYER 3: Medium Floating Stars with Soft Corona Halos             |
|  - Corona halos: Cyan, White, Lavender, Amber Gold               |
+-------------------------------------------------------------------+
| LAYER 4: Fast Foreground Kinetic Stars with Hyperspace Streaks    |
|  - High velocity, dynamic warp tails scaling with speed           |
+-------------------------------------------------------------------+
| LAYER 5: Center Radial Vignette Overlay                           |
|  - Dims periphery, preserves search modal contrast                |
+-------------------------------------------------------------------+
```

### Layer Specifications Table

| Layer | Desktop Count | Tablet Count | Mobile Count | Z-Depth Range | Speed Multiplier | Special Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Distant Micro-Stars** | 130 | 80 | 50 | $700 \dots 1400$ | $0.28 \times v$ | Twinkle $\sin(\omega t + \phi)$, $0.5 - 1.2\text{px}$ |
| **2. Medium Corona Stars** | 180 | 110 | 65 | $250 \dots 1150$ | $0.65 \dots 0.90 \times v$ | Multi-color corona halo gradients |
| **3. Foreground Streakers**| 130 | 70 | 45 | $100 \dots 1300$ | $1.10 \dots 1.50 \times v$ | Hyperspace streaks up to $200\text{px}$ |
| **Total Particle Budget**  | **440** | **260** | **160** | &mdash; | &mdash; | **Smooth 60 FPS guaranteed** |

---

## 5. Volumetric Procedural Nebulae (Cosmic Gas Clouds)

Four distinct procedural organic nebula clouds are rendered using multi-stop radial gradients:

1. **The Aurora Teal Lagoon:**
   - Base position: $(-28\% W, -16\% H)$
   - Orbital motion: Radius $42\text{px}$, angular velocity $+0.00045\text{ rad/s}$
   - Color stops: `rgba(62, 230, 196, 0.15)` $\to$ `rgba(32, 188, 160, 0.07)` $\to$ transparent
2. **The Orion Deep Violet Core:**
   - Base position: $(+32\% W, +20\% H)$
   - Orbital motion: Radius $50\text{px}$, angular velocity $-0.00038\text{ rad/s}$
   - Color stops: `rgba(138, 108, 255, 0.17)` $\to$ `rgba(99, 102, 241, 0.08)` $\to$ transparent
3. **The Cygnus Electric Magenta Veil:**
   - Base position: $(+14\% W, -28\% H)$
   - Orbital motion: Radius $36\text{px}$, angular velocity $+0.00052\text{ rad/s}$
   - Color stops: `rgba(244, 114, 182, 0.11)` $\to$ `rgba(217, 70, 239, 0.05)` $\to$ transparent
4. **The Abyssal Azure Galactic Drift:**
   - Base position: $(-16\% W, +26\% H)$
   - Orbital motion: Radius $48\text{px}$, angular velocity $-0.00032\text{ rad/s}$
   - Color stops: `rgba(56, 189, 248, 0.12)` $\to$ `rgba(14, 165, 233, 0.05)` $\to$ transparent

---

## 6. Speed Dynamics & Kinematic Transitions

```
[Search Triggered]
       │
       ▼ (Fade in 0.55s)
[Tranquil Cruise] ───────────── speed = 1.4 (stars gently drifting)
       │
       ▼ (Execute API calls begin)
[Hyperspace Warp] ───────────── speed = 19.0 (exponential lerp rate 0.045)
       │                        Streaks stretch radially outward
       ▼ (1,000-post batch arrives)
[Warp Sonic Pulse] ──────────── speed spikes +6.5, decaying over 600ms
       │
       ▼ (Search completed or cancelled)
[Smooth Deceleration] ───────── speed drops to 0 (lerp rate 0.065)
       │
       ▼ (Fade out 0.65s)
[Engine Suspended] ──────────── cancelAnimationFrame (0% CPU/GPU usage)
```

---

## 7. HTML & CSS Integration

### 7.1. HTML Markup (`index.html`)

Insert the `#cosmic-search-backdrop` directly inside `#search-modal-overlay` right before `.search-motion-modal`:

```html
<!-- Fullscreen Dimmed Search Motion Modal Overlay -->
<div id="search-modal-overlay" class="search-modal-overlay hidden no-print" role="dialog" aria-modal="true" aria-labelledby="progress-title">
    
    <!-- AURORA Cosmic Search Universe Backdrop Layer -->
    <div id="cosmic-search-backdrop" class="cosmic-search-backdrop" aria-hidden="true">
        <canvas id="cosmic-universe-canvas"></canvas>
        <div class="cosmic-vignette-overlay"></div>
    </div>

    <!-- Search Motion Modal Card (Floats above cosmic backdrop) -->
    <div class="search-motion-modal card">
        ...
    </div>
</div>
```

### 7.2. CSS Rules (`style.css`)

```css
/* ==========================================================================
   AURORA Cosmic Universe Search Backdrop
   ========================================================================== */
.cosmic-search-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    visibility: hidden;
    background-color: #050714;
    transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
                visibility 0.55s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity;
}

.search-modal-overlay.active .cosmic-search-backdrop,
.cosmic-search-backdrop.active {
    opacity: 1;
    visibility: visible;
}

#cosmic-universe-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
}

.cosmic-vignette-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
        ellipse at center,
        rgba(5, 7, 20, 0.15) 0%,
        rgba(5, 7, 20, 0.50) 65%,
        rgba(3, 5, 15, 0.88) 100%
    );
}

.search-motion-modal {
    position: relative;
    z-index: 10;
}

@media (prefers-reduced-motion: reduce) {
    .cosmic-search-backdrop {
        transition: opacity 0.2s ease;
    }
}
```

---

## 8. JavaScript Orchestration API (`src/cosmic.js`)

The engine exports a high-level singleton `CosmicUniverse` with simple methods:

```javascript
import { CosmicUniverse } from './cosmic.js?v=3.5.3';

// 1. Initialize once
CosmicUniverse.init({
    canvasId: 'cosmic-universe-canvas',
    containerId: 'cosmic-search-backdrop'
});

// 2. When search initiates
CosmicUniverse.start();
CosmicUniverse.setWarp(false); // Gentle cruise

// 3. When wall fetching begins
CosmicUniverse.setWarp(true);  // Accelerates to hyperspace warp

// 4. On each batch progress milestone (e.g. +1,000 posts fetched)
CosmicUniverse.pulse(6.5);

// 5. When search stops or completes
CosmicUniverse.stop();         // Smoothly decelerates and fades out
```

---

## 9. Performance & Accessibility Guarantees

1. **0% Overhead when Idle:** Animation loop completely stops via `cancelAnimationFrame` when modal is inactive.
2. **Retina Display Optimization:** Canvas dimensions use `dpr = Math.min(window.devicePixelRatio || 1, 2)` preventing fill-rate bottlenecks on 3x/4x mobile screens.
3. **Accessibility:** Automatically checks `prefers-reduced-motion: reduce`. When active, disables warp streaks, caps speed to static starlight drift ($0.8$), and reduces transition durations.
4. **Pointer Events:** Strictly `pointer-events: none` on all cosmic layers to guarantee 0 interference with input clicks or touch interactions.
