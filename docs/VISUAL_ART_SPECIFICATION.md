# AURORA Design System &bull; Visual Art & Motion Specification
**Project:** VK Wall Searcher  
**Author:** Digital Visual Artist & Creative UI Stylist  
**Status:** Production-Ready Standard for Engineering  
**Scope:** Palette Harmony, Multi-Stop Gradients, Glassmorphism Lighting, Specular Highlights & Micro-Motion Choreography

---

## 1. Aesthetic Vision & Atmospheric Metaphor

The **AURORA Design System** bridges high-fidelity computational elegance with the organic majesty of astronomical phenomena. Inspired by the Aurora Borealis surging over deep arctic night skies and ionized galactic nebula clouds, the visual architecture creates depth through **layered optical light transmission, physical specular glints, and luminous chromatic bloom**.

### Key Aesthetic Tenets:
1. **Phosphor Luminescence Against Deep Space Charcoal:**
   Instead of flat monochromatic dark tones, deep space in AURORA is represented by rich, cold Void Slates (`#161B2E` / `#232938`). Luminous cyan (`#3EE6C4`), orbitron blue (`#38BDF8`), and galactic violet (`#8A6CFF`) act as high-energy ionized plasma accents that float above the dark substrate with soft ambient dispersion.
2. **Daybreak Platinum Clarity (Light Mode):**
   Light themes frequently fail by either being sterile blinding white or murky mud-grey. Daybreak Light Mode is tuned as **Crisp Platinum Slate** (`#e8ecf1`), grounded by deep Royal Sapphire (`#1757a6`), crystalline slate borders, and crisp high-contrast Obsidian text (`#0f172a`), evoking early morning alpine starlight.
3. **Multi-Stop Energy Flow:**
   Gradients are never simplistic two-color blends. They mimic natural ionization spectra across 3 to 4 stops, traveling from electric cyan through icy atmospheric blue into deep cosmic violet.
4. **Physicality of Glass (Fresnel & Specular):**
   Surfaces are treated as polished silicate glass plates: receiving a directional light source from above that creates a razor-sharp **specular top highlight border**, while an **inset ambient rim glow** simulates internal light bounce within the glass body.
5. **Spring-Damped Organic Micro-Kinematics:**
   Every interaction responds with physical inertia, damping, and springiness governed by the golden motion curve `cubic-bezier(0.16, 1, 0.3, 1)`, giving elements tactile weight and effortless levitation.

---

## 2. Chromatic Architecture & Color Palettes

### 2.1. Core Interstellar Spectrum (Dark & Cosmic Theme)

| Token Name | Hex Code | RGBA Equivalent | HSL | Optical Role & Psychological Impact |
| :--- | :--- | :--- | :--- | :--- |
| `--aurora-stellar-cyan` | `#3EE6C4` | `rgba(62, 230, 196, 1.0)` | `168°, 78%, 57%` | **Primary Energy Conduit:** Starlight focus, primary CTA start, active state halos, peak phosphorescence. |
| `--aurora-orbitron-blue` | `#38BDF8` | `rgba(56, 189, 248, 1.0)` | `198°, 93%, 60%` | **Galactic Core Atmosphere:** Secondary bridge hue, focus glow dispersion, cosmic dust lanes. |
| `--aurora-galactic-violet`| `#8A6CFF` | `rgba(138, 108, 255, 1.0)` | `252°, 100%, 71%` | **Deep Interstellar Rift:** Tertiary gradient depth, mystical accentuation, secondary card blooms. |
| `--aurora-supernova-pink` | `#F472B6` | `rgba(244, 114, 182, 1.0)` | `329°, 86%, 70%` | **Stellar Flare & Hot Stars:** High-priority tags, interactive accents, energetic pulse tails. |
| `--aurora-void-slate` | `#161B2E` | `rgba(22, 27, 46, 1.0)` | `228°, 35%, 13%` | **Abyssal Anchor:** Underlying backdrop substrate, modal backplates, extreme dark elevation. |
| `--aurora-void-surface` | `#232938` | `rgba(35, 41, 56, 1.0)` | `223°, 23%, 18%` | **Atmospheric Mid-Ground:** Baseline card and input resting background in dark mode. |
| `--aurora-starlight-pure` | `#FFFFFF` | `rgba(255, 255, 255, 1.0)` | `0°, 0%, 100%` | **Specular Peak:** 100% reflection glints, button shimmers, highest energy cores. |
| `--aurora-starlight-icy` | `#E0F2FE` | `rgba(224, 242, 254, 1.0)` | `204°, 94%, 94%` | **Luminescent Text & Rim:** Primary text glow, specular top hairline borders. |

### 2.2. Daybreak Light Theme Artist Tuning

The light mode is balanced for prolonged analytical work, high ambient light environments, and uncompromising WCAG AAA typography contrast:

| Daybreak Token | Value / Hex | RGBA | Design Rationale & Optical Balance |
| :--- | :--- | :--- | :--- |
| `--daybreak-bg-slate` | `#e8ecf1` | `rgba(232, 236, 241, 1.0)` | **Crisp Platinum Slate:** Replaces clinical `#FFFFFF` with a soothing, glare-free architectural titanium tone. |
| `--daybreak-card-bg` | `rgba(255, 255, 255, 0.94)` | `rgba(255, 255, 255, 0.94)` | **High-Density Frosted Glass:** Crisp luminous card planes with specular top borders. |
| `--daybreak-sapphire` | `#1757a6` | `rgba(23, 87, 166, 1.0)` | **Royal Sapphire Primary:** Prestigious, authoritative blue accent (WCAG contrast > 7:1 against slate). |
| `--daybreak-sapphire-hover`| `#124484` | `rgba(18, 68, 132, 1.0)` | **Deep Deep-Water Sapphire:** Interactive hover target with enriched indigo depth. |
| `--daybreak-text-obsidian`| `#0f172a` | `rgba(15, 23, 42, 1.0)` | **Deep Obsidian Text:** Maximum legibility, crisp sharp glyph outlines. |
| `--daybreak-text-slate` | `#334155` | `rgba(51, 65, 85, 1.0)` | **Subtle Graphite Text:** Secondary metadata, timestamps, item counts. |
| `--daybreak-border` | `rgba(148, 163, 184, 0.35)`| `rgba(148, 163, 184, 0.35)` | **Subtle Platinum Rim:** Sharp card structural definitions without visual clutter. |

### 2.3. Semantic Status & Diagnostic Luminescence

| State | Base Color | Translucent Glow (20%) | Glow Bloom (8%) | Semantic Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Active / Success** | `#3EE6C4` (Stellar Cyan) | `rgba(62, 230, 196, 0.20)` | `rgba(62, 230, 196, 0.08)` | Search finished, API healthy, active filter |
| **Warning / Caution** | `#FBBF24` (Solar Amber) | `rgba(251, 191, 36, 0.20)` | `rgba(251, 191, 36, 0.08)` | Rate limit warning, partial data loaded |
| **Danger / Critical** | `#F43F5E` (Cosmic Crimson) | `rgba(244, 63, 94, 0.20)` | `rgba(244, 63, 94, 0.08)` | API error, network drop, critical validation |
| **Info / Discovery** | `#38BDF8` (Orbitron Blue) | `rgba(56, 189, 248, 0.20)` | `rgba(56, 189, 248, 0.08)` | Tooltip guidance, post count badge, branch tag |

---

## 3. Multi-Stop Gradients & Luminescence Rules

### 3.1. Primary Action Kinetic Gradient
Used for primary call-to-action buttons (`.btn-primary`), prominent search triggers, and active hero badges:
```css
/* Aurora Tri-Chromatic Kinetic Flow */
--aurora-gradient-primary: linear-gradient(
    135deg,
    #3EE6C4 0%,
    #38BDF8 50%,
    #8A6CFF 100%
);

/* Daybreak Light Mode Primary */
--daybreak-gradient-primary: linear-gradient(
    135deg,
    #1757a6 0%,
    #124484 50%,
    #4f46e5 100%
);
```

### 3.2. Specular Top Highlight Border (The Polished Rim)
A signature optical feature of the AURORA glassmorphic design: a 1-pixel linear gradient placed across the upper edge of containers, simulating a zenith light source bouncing off bevelled crystal glass:
```css
/* Card Top Highlight Border Gradient */
--aurora-card-border-top: linear-gradient(
    90deg,
    rgba(62, 230, 196, 0.40) 0%,
    rgba(56, 189, 248, 0.20) 50%,
    rgba(138, 108, 255, 0.40) 100%
);

/* Applied via pseudo-element or border-image */
.card-specular-rim {
    position: relative;
}
.card-specular-rim::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--aurora-card-border-top);
    border-radius: var(--radius) var(--radius) 0 0;
    pointer-events: none;
    z-index: 2;
}
```

### 3.3. Luminous Brand Header Gradient
Typography gradient for logos, modal titles, and heroic headlines:
```css
.brand-aurora-text {
    background: linear-gradient(
        135deg,
        #FFFFFF 0%,
        #3EE6C4 40%,
        #38BDF8 70%,
        #8A6CFF 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 30px rgba(62, 230, 196, 0.28);
}

[data-theme="light"] .brand-aurora-text {
    background: linear-gradient(
        135deg,
        #0f172a 0%,
        #1757a6 55%,
        #4f46e5 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
}
```

### 3.4. Nebula Ambient Mesh Backdrops
CSS mesh layers that sit behind the application, providing dynamic cosmic clouds that shift organically:
```css
/* Dark Theme Ambient Cosmos */
--aurora-bg-void-gradient: radial-gradient(
    circle at 50% -10%,
    #243048 0%,
    #1b2234 40%,
    #131726 80%,
    #0c0f1a 100%
);

/* Daybreak Platinum Atmosphere */
--daybreak-bg-page-gradient: radial-gradient(
    circle at 50% 0%,
    #f8fafc 0%,
    #eef2f6 45%,
    #e2e8f0 100%
);
```

---

## 4. Glassmorphism & Lighting Architecture

### 4.1. The Physics of AURORA Glass
AURORA glass is characterized by three optical layers acting concurrently:
1. **Backdrop Dispersion (`backdrop-filter: blur(...) saturate(...)`):**
   Defocuses the high-contrast stars and void behind the element, transforming background motion into silky ambient color washes.
2. **Internal Specular Bounce (`box-shadow: inset ...`):**
   A delicate 1px inner rim on top (`inset 0 1px 1px rgba(255,255,255,0.14)`) provides the illusion of glass thickness and internal refraction.
3. **Radiant Shadow Bloom:**
   Dual-layer drop shadows combining a dark anchoring ambient shadow (`rgba(0, 0, 0, 0.35)`) with a soft cyan/violet luminescence halo.

```
       Zenith Light Source (Ambient Starlight)
                 |   |   |
                 v   v   v
 +-----------------------------------------------+  <- 1px Specular Border (Aurora Gradient)
 | [INSET 0 1px 1px rgba(255, 255, 255, 0.14)]   |  <- Internal Fresnel Glow
 |                                               |
 |        Frosted Silicate Glass Substrate       |
 |    backdrop-filter: blur(24px) saturate(180%) |
 |                                               |
 +-----------------------------------------------+
        |                                 |
        v                                 v
   Dark Drop Shadow              Cyan/Violet Bloom Halo
 (0 12px 32px rgba(0,0,0,0.35))   (0 0 20px rgba(62,230,196,0.08))
```

### 4.2. Surface Elevation Hierarchy

| Level | Component Type | Blur Factor | Background Fill | Border & Inner Highlights | Box Shadow |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Level 0** | Cosmos Void | None | `#161B2E` / `#050714` | None | None |
| **Level 1** | Search Bar Container, Filters Bar | `blur(16px)` | `rgba(35, 41, 56, 0.72)` | `1px solid rgba(220, 230, 255, 0.12)` | `0 4px 16px rgba(0,0,0,0.20)` |
| **Level 2** | Results Cards, Settings Bento Panel | `blur(24px) saturate(180%)` | `rgba(42, 50, 70, 0.82)` | `1px solid rgba(220, 230, 255, 0.16)` + Specular Top Rim | `0 12px 32px -8px rgba(0,0,0,0.35)`, `0 0 16px rgba(62,230,196,0.05)`, `inset 0 1px 1px rgba(255,255,255,0.14)` |
| **Level 3** | Dropdowns, Floating Action Hub, Toasts | `blur(20px)` | `rgba(30, 36, 52, 0.90)` | `1px solid rgba(62, 230, 196, 0.30)` | `0 16px 40px -4px rgba(0,0,0,0.45)`, `0 0 24px rgba(56,189,248,0.15)` |
| **Level 4** | Hyperspace Search Modal, Dialogs | `blur(32px) saturate(200%)` | `rgba(22, 27, 46, 0.88)` | `1px solid rgba(220, 230, 255, 0.20)` + Full Specular Rim | `0 24px 60px -8px rgba(0,0,0,0.65)`, `0 0 36px rgba(62,230,196,0.12)` |

### 4.3. Form Controls & The Phosphor Focus Halo

Inputs are designed as interactive luminous receptors. When engaged, the element emits an ionized starlight halo:

```css
/* Aurora Glass Input Controls */
.aurora-input {
    width: 100%;
    background: rgba(35, 41, 56, 0.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(220, 230, 255, 0.16);
    border-radius: 10px;
    color: #f2f6fd;
    font-size: 0.9375rem;
    padding: 12px 16px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.08);
    transition: 
        border-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1),
        background-color 200ms cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
}

/* Hover State */
.aurora-input:hover {
    border-color: rgba(62, 230, 196, 0.45);
    background: rgba(42, 50, 70, 0.85);
}

/* Phosphor Focus Halo */
.aurora-input:focus {
    border-color: #3EE6C4;
    background: rgba(30, 37, 52, 0.95);
    box-shadow: 
        0 0 0 3px rgba(62, 230, 196, 0.22),
        0 0 20px rgba(56, 189, 248, 0.25),
        inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Daybreak Light Mode Focus Halo */
[data-theme="light"] .aurora-input {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.35);
    color: #0f172a;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}
[data-theme="light"] .aurora-input:hover {
    border-color: rgba(23, 87, 166, 0.5);
    background: #ffffff;
}
[data-theme="light"] .aurora-input:focus {
    border-color: #1757a6;
    background: #ffffff;
    box-shadow: 
        0 0 0 3px rgba(23, 87, 166, 0.18),
        0 0 16px rgba(23, 87, 166, 0.20);
}
```

### 4.4. Buttons: Glass & Kinetic Luminescence

Primary buttons utilize the multi-stop gradient combined with an ambient drop-shadow and a diagonal light beam sweep (`btnShimmer`) on hover:

```css
/* Primary Radiant Button */
.btn-aurora-primary {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 26px;
    border-radius: 9999px;
    border: none;
    background: linear-gradient(135deg, #3EE6C4 0%, #38BDF8 50%, #8A6CFF 100%);
    background-size: 200% 200%;
    background-position: 0% 50%;
    color: #0b111e;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    user-select: none;
    box-shadow: 
        0 8px 24px rgba(62, 230, 196, 0.35),
        0 2px 4px rgba(0, 0, 0, 0.25);
    transition: 
        transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1),
        background-position 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Ambient Bloom on Hover */
.btn-aurora-primary:hover {
    background-position: 100% 50%;
    transform: translateY(-2px);
    box-shadow: 
        0 12px 32px rgba(62, 230, 196, 0.45),
        0 0 28px rgba(138, 108, 255, 0.35),
        0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Kinetic Shimmer Sweeper */
.btn-aurora-primary::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -75%;
    width: 50%;
    height: 200%;
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.45) 50%,
        rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(25deg);
    pointer-events: none;
}

.btn-aurora-primary:hover::before {
    animation: btnShimmerSweep 1.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

/* Active Tap Scale */
.btn-aurora-primary:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: 
        0 4px 14px rgba(62, 230, 196, 0.30),
        0 1px 2px rgba(0, 0, 0, 0.2);
}
```

---

## 5. Micro-Motion Choreography & Temporal Dynamics

### 5.1. The Universal Kinetic Curve

All physical interactions in AURORA adhere to the **Fluid Exponential Spring**:
```css
/* Universal Aurora Spring Curve */
--ease-aurora: cubic-bezier(0.16, 1, 0.3, 1);
```

**Mechanical Analysis:**
- **Acceleration (0% to 16%):** Swift initial blast off, immediate feedback to user intention.
- **Deceleration (16% to 85%):** Smooth, luxurious brake curve preventing visual jarring.
- **Settling (85% to 100%):** Exponentially damped resting glide without erratic rebound.

### 5.2. Temporal Cadence Scale

| Token | Duration | Purpose & Component Application |
| :--- | :--- | :--- |
| `--duration-instant` | `100ms` | Direct click presses, button tap compression (`scale(0.98)`). |
| `--duration-snappy` | `200ms` | Button hover transitions, text color shifts, icon rotations. |
| `--duration-smooth` | `320ms` | Card hover elevation, focus halo blooms, dropdown expansions. |
| `--duration-modal` | `450ms` | Modal window entrance, hyperspace zoom triggers. |
| `--duration-ambient` | `1600ms` | Continuous badge shimmer sweeps, loading skeleton pulses. |
| `--duration-cosmic` | `18000ms` | Cosmic nebula background orbital drift. |

---

### 5.3. Keyframe Specifications

#### 1. Button Specular Sweeper (`btnShimmerSweep`)
```css
@keyframes btnShimmerSweep {
    0% {
        left: -75%;
        opacity: 0;
    }
    15% {
        opacity: 1;
    }
    65% {
        left: 140%;
        opacity: 1;
    }
    100% {
        left: 140%;
        opacity: 0;
    }
}
```

#### 2. Badge & Pill Shimmer Pulse (`auroraBadgePulse`)
Used on active status pills, "Live" indicators, and keyword hit badges:
```css
@keyframes auroraBadgePulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(62, 230, 196, 0.45);
    }
    50% {
        transform: scale(1.02);
        box-shadow: 0 0 0 6px rgba(62, 230, 196, 0);
    }
}

.aurora-badge-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 9999px;
    background: rgba(62, 230, 196, 0.12);
    border: 1px solid rgba(62, 230, 196, 0.35);
    color: #3EE6C4;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    animation: auroraBadgePulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
```

#### 3. Card Elevation & Ambient Bloom (`cardBloom`)
```css
.aurora-card {
    background: rgba(42, 50, 70, 0.82);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(220, 230, 255, 0.14);
    border-top: 1px solid rgba(62, 230, 196, 0.35);
    border-radius: 16px;
    padding: 1.75rem;
    box-shadow: 
        0 12px 32px -8px rgba(0, 0, 0, 0.35),
        0 0 16px rgba(62, 230, 196, 0.04),
        inset 0 1px 1px rgba(255, 255, 255, 0.14);
    transition: 
        transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1),
        border-color 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.aurora-card:hover {
    transform: translateY(-3px);
    border-color: rgba(62, 230, 196, 0.35);
    box-shadow: 
        0 20px 44px -6px rgba(0, 0, 0, 0.48),
        0 0 26px rgba(56, 189, 248, 0.18),
        0 0 36px rgba(138, 108, 255, 0.12),
        inset 0 1px 2px rgba(255, 255, 255, 0.22);
}
```

#### 4. Skeleton Shimmer Wave (`auroraSkeletonShimmer`)
Used for placeholder cards and loading data streams:
```css
@keyframes auroraSkeletonShimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}

.aurora-skeleton {
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.04) 0%,
        rgba(62, 230, 196, 0.12) 50%,
        rgba(255, 255, 255, 0.04) 100%
    );
    background-size: 200% 100%;
    animation: auroraSkeletonShimmer 1.6s ease-in-out infinite;
    border-radius: 8px;
}
```

---

## 6. Accessibility & Reduced Motion Policy

In adherence to WCAG 2.2 Criterion 2.3.3 (Animation from Interactions) and to protect users with vestibular sensitivity:

```css
@media (prefers-reduced-motion: reduce) {
    /* 1. Neutralize all infinite GPU kinetic rotations and translation loops */
    *,
    *::before,
    *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
    }

    /* 2. Maintain High-Contrast Static States without transforms */
    .btn-aurora-primary:hover,
    .aurora-card:hover {
        transform: none !important;
    }

    /* 3. Retain rich optical luminescence without kinetic movement */
    .btn-aurora-primary:hover {
        box-shadow: 0 0 20px rgba(62, 230, 196, 0.5) !important;
    }
    .aurora-card:hover {
        border-color: rgba(62, 230, 196, 0.6) !important;
    }

    /* 4. Replace moving shimmers with a subtle static translucent tone */
    .btn-aurora-primary::before,
    .aurora-skeleton {
        animation: none !important;
        background: rgba(255, 255, 255, 0.08) !important;
    }
}
```

---

## 7. Master Production CSS Token Dictionary

This block is designed for direct inclusion or reference inside `style.css`:

```css
/* ==========================================================================
   AURORA Design System — Master Color, Lighting & Motion Tokens
   ========================================================================== */
:root {
    /* --- Core Aurora Chromatic Spectrum --- */
    --color-aurora-cyan: #3EE6C4;
    --color-aurora-blue: #38BDF8;
    --color-aurora-purple: #8A6CFF;
    --color-aurora-pink: #F472B6;
    --color-aurora-gold: #FBBF24;
    
    /* --- Deep Void Substrate (Dark Theme) --- */
    --bg-page: #161B2E;
    --bg-page-gradient: radial-gradient(circle at 50% -10%, #243048 0%, #1b2234 40%, #131726 80%, #0c0f1a 100%);
    --bg-card: rgba(42, 50, 70, 0.85);
    --bg-card-hover: rgba(52, 62, 86, 0.94);
    --surface: rgba(35, 41, 56, 0.78);
    --surface-hover: rgba(46, 54, 76, 0.90);

    /* --- Typography Colors --- */
    --text-primary: #f2f6fd;
    --text-secondary: #a9b5d3;
    --text-tertiary: rgba(169, 181, 211, 0.70);
    --text-on-accent: #0b111e;

    /* --- Multi-Stop Gradients --- */
    --btn-primary-bg: linear-gradient(135deg, #3EE6C4 0%, #38BDF8 50%, #8A6CFF 100%);
    --aurora-card-border-top: linear-gradient(90deg, rgba(62, 230, 196, 0.40) 0%, rgba(56, 189, 248, 0.20) 50%, rgba(138, 108, 255, 0.40) 100%);
    --logo-gradient: linear-gradient(135deg, #ffffff 0%, #3EE6C4 45%, #8A6CFF 90%);

    /* --- Glassmorphism & Specular Lighting --- */
    --glass-card-border-top: rgba(220, 230, 255, 0.25);
    --hairline: rgba(220, 230, 255, 0.14);
    --border-color: rgba(220, 230, 255, 0.16);
    --divider-color: rgba(220, 230, 255, 0.10);

    /* --- Ambient Drop Shadows & Glow Blooms --- */
    --shadow-card: 0 12px 32px -8px rgba(0, 0, 0, 0.35), 0 0 16px rgba(62, 230, 196, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.14);
    --shadow-card-hover: 0 18px 44px -6px rgba(0, 0, 0, 0.45), 0 0 24px rgba(56, 189, 248, 0.16), 0 0 32px rgba(138, 108, 255, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.20);
    --btn-primary-shadow: 0 8px 24px rgba(62, 230, 196, 0.35), 0 2px 4px rgba(0, 0, 0, 0.20);
    --btn-primary-hover-shadow: 0 12px 28px rgba(62, 230, 196, 0.45), 0 0 24px rgba(138, 108, 255, 0.35);
    --input-focus-halo: 0 0 0 3px rgba(62, 230, 196, 0.22), 0 0 20px rgba(56, 189, 248, 0.25);

    /* --- Micro-Motion Kinetics --- */
    --ease-aurora: cubic-bezier(0.16, 1, 0.3, 1);
    --duration-snappy: 200ms;
    --duration-smooth: 320ms;
    --duration-modal: 450ms;
}

/* ==========================================================================
   Daybreak Light Theme — Modern Platinum Slate Master Tuning
   ========================================================================== */
[data-theme="light"] {
    --bg-page: #e8ecf1;
    --bg-page-gradient: radial-gradient(circle at 50% 0%, #f8fafc 0%, #eef2f6 45%, #e2e8f0 100%);
    --bg-card: rgba(255, 255, 255, 0.96);
    --bg-card-hover: #ffffff;
    --surface: rgba(232, 237, 243, 0.95);
    --surface-hover: #f1f4f8;

    /* Royal Sapphire Primary Accent */
    --color-aurora-cyan: #1757a6;
    --color-aurora-purple: #4f46e5;
    --accent: #1757a6;
    --accent-hover: #124484;

    /* High-Contrast Obsidian Typography */
    --text-primary: #0f172a;
    --text-secondary: #334155;
    --text-tertiary: rgba(51, 65, 85, 0.70);
    --text-on-accent: #ffffff;

    /* Refined Platinum Borders */
    --hairline: rgba(148, 163, 184, 0.35);
    --border-color: rgba(148, 163, 184, 0.30);
    --divider-color: rgba(148, 163, 184, 0.18);
    --glass-card-border-top: rgba(255, 255, 255, 0.95);

    /* Light Theme Button & Gradients */
    --btn-primary-bg: linear-gradient(135deg, #1757a6 0%, #124484 50%, #4f46e5 100%);
    --btn-primary-shadow: 0 6px 20px rgba(23, 87, 166, 0.30), 0 2px 4px rgba(0, 0, 0, 0.10);
    --btn-primary-hover-shadow: 0 10px 26px rgba(23, 87, 166, 0.40), 0 0 18px rgba(79, 70, 229, 0.25);
    --input-focus-halo: 0 0 0 3px rgba(23, 87, 166, 0.18), 0 0 16px rgba(23, 87, 166, 0.20);

    /* Soft Structural Shadows */
    --shadow-card: 0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
    --shadow-card-hover: 0 12px 30px -4px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06);
}
```

---

## 8. Summary Checklist for Frontend Engineers

1. [x] **Primary Button Gradient:** Verify `linear-gradient(135deg, #3EE6C4 0%, #38BDF8 50%, #8A6CFF 100%)` with shimmer sweeper.
2. [x] **Card Top Specular Rim:** Apply `linear-gradient(90deg, rgba(62,230,196,0.4) 0%, rgba(56,189,248,0.2) 50%, rgba(138,108,255,0.4) 100%)` via top border or `::before` pseudo-element.
3. [x] **Input Focus Halo:** Bind `:focus` to `box-shadow: 0 0 0 3px rgba(62, 230, 196, 0.22), 0 0 20px rgba(56, 189, 248, 0.25)`.
4. [x] **Micro-Motion Physics:** Use `cubic-bezier(0.16, 1, 0.3, 1)` across all card elevations (`translateY(-3px)`) and button taps (`scale(0.98)`).
5. [x] **Daybreak Light Tuning:** Ensure `#e8ecf1` crisp platinum slate background, `#1757a6` royal sapphire accents, and `#0f172a` obsidian text.
6. [x] **Reduced Motion Support:** Keep static glow/border feedback under `@media (prefers-reduced-motion: reduce)` while disabling translation/scale sweeps.
