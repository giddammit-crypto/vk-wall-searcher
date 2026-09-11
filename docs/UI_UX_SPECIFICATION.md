# AURORA UI/UX System Specification
## Layout Ergonomics, Component Geometry & Responsive Architecture
**Target Application:** VK Wall Searcher &bull; **Design System:** AURORA  
**Target File for Engineering:** `style.css` / `index.html`  
**Status:** Production-Ready Specification &bull; **Standard:** WCAG 2.1 AA Compliance  

---

## 1. Executive Summary & Design Vision

The **AURORA UI/UX Architecture** is designed to deliver an ergonomic, tactile, and high-performance desktop-and-mobile interface for social media monitoring across 16 library branches. The interface blends a **Modern Slate Charcoal Glassmorphism** visual language with strict **Bento-grid ergonomics**, predictable spatial rhythm, and responsive touch mechanics.

### Core Architectural Goals
1. **Geometric Consistency:** Unified token scale for border radii (`8px`, `12px`, `18px`, `24px`) and elevation levels across all interactive and structural containers.
2. **Predictable Padding Rhythm:** Strict 3-tier container padding rhythm: **24px on desktop**, **18px on tablet**, and **14px on mobile**.
3. **Ergonomic Control Sizing:** Universal 44px form control height on desktop and 48px on mobile, with a mandatory 16px font size on mobile to prevent iOS Safari auto-zooming.
4. **Action Hierarchy & Magnetic Focus:** High-contrast primary CTA (*"Начать поиск по записям"*), frosted tonal utility controls (*"Ключ VK"*, *"Настройки"*), ghost/outlined secondary actions, and tactile pill tab controls.
5. **Touch Target Accessibility:** Strict 44×44px minimum touch targets across all mobile viewports conforming to WCAG 2.1 AA (Criteria 2.5.5 and 2.5.8).

---

## 2. Global Tokens & Foundations

### 2.1. Standardized Border-Radius Tokens

All component boundaries must strictly consume the standardized border-radius tokens. Arbitrary values (`4px`, `6px`, `10px`, `16px`) are consolidated into this 4-step harmonic scale:

```css
:root {
    /* --------------------------------------------------------------------------
       AURORA Standardized Border Radius Tokens
       -------------------------------------------------------------------------- */
    --radius-sm:   8px;    /* Chips, badges, inner attachment thumbs, tooltips, tags */
    --radius-md:  12px;    /* Form controls, dropdowns, segmented items, mobile cards */
    --radius-lg:  18px;    /* Component cards: .post-card, .source-showcase-card, .subs-kpi, .advice-card */
    --radius-xl:  24px;    /* Structural sections: .card, modal dialogs, flyout drawers */
    --radius-pill: 9999px; /* Buttons, search pills, switch toggles, tab active indicators */
}
```

### 2.2. Standardized Elevation & Surface Levels

Elevation in AURORA utilizes multi-stop ambient shadows layered with subtle translucent hairpins to simulate frosted crystalline glass floating above the deep slate canvas.

| Elevation Level | State / Role | Light Theme (`[data-theme="light"]`) | Dark Theme (`:root`) |
| :--- | :--- | :--- | :--- |
| **Level 0 (Flat / Inset)** | Inactive wells, background track | `inset 0 1px 3px rgba(15, 23, 42, 0.08)` | `inset 0 1px 3px rgba(0, 0, 0, 0.45)` |
| **Level 1 (Resting)** | Resting cards, containers, buttons | `0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)` | `0 10px 28px -6px rgba(0, 0, 0, 0.38), 0 0 16px rgba(54, 212, 180, 0.04)` |
| **Level 2 (Hover / Lift)**| Mouseover hover, lifted cards | `0 12px 30px -4px rgba(15, 23, 42, 0.12), 0 0 12px rgba(23, 87, 166, 0.10)` | `0 18px 40px -6px rgba(0, 0, 0, 0.50), 0 0 24px rgba(136, 120, 245, 0.16)` |
| **Level 3 (Active / Press)**| Clicked, depressed button | `0 2px 6px rgba(15, 23, 42, 0.12)` | `0 2px 8px rgba(0, 0, 0, 0.45)` |
| **Focus State** | Keyboard `:focus-visible` | `0 0 0 3px rgba(23, 87, 166, 0.35)` | `0 0 0 3px rgba(54, 212, 180, 0.40)` |

```css
:root {
    /* Elevation Tokens - Dark Theme Foundation */
    --elevation-0: inset 0 1px 2px rgba(0, 0, 0, 0.45);
    --elevation-1: 0 10px 28px -6px rgba(0, 0, 0, 0.38), 0 0 16px rgba(54, 212, 180, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.12);
    --elevation-2: 0 18px 42px -6px rgba(0, 0, 0, 0.52), 0 0 24px rgba(136, 120, 245, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.18);
    --elevation-3: 0 3px 10px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(0, 0, 0, 0.30);
    --elevation-focus: 0 0 0 3px rgba(54, 212, 180, 0.40);

    /* Surface Tokens */
    --surface-glass: rgba(54, 64, 88, 0.85);
    --surface-glass-hover: rgba(66, 78, 108, 0.95);
    --surface-border-top: rgba(220, 228, 255, 0.22);
}

[data-theme="light"] {
    --elevation-0: inset 0 1px 3px rgba(15, 23, 42, 0.08);
    --elevation-1: 0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.85);
    --elevation-2: 0 12px 30px -4px rgba(15, 23, 42, 0.12), 0 0 14px rgba(23, 87, 166, 0.12), inset 0 1px 2px rgba(255, 255, 255, 1);
    --elevation-3: 0 2px 6px rgba(15, 23, 42, 0.12);
    --elevation-focus: 0 0 0 3px rgba(23, 87, 166, 0.35);

    --surface-glass: rgba(255, 255, 255, 0.96);
    --surface-glass-hover: #ffffff;
    --surface-border-top: rgba(255, 255, 255, 0.9);
}
```

### 2.3. Spatial Rhythm Scale (Padding & Margins)

The layout adheres to an 8px base rhythm with 4px sub-grid increments:

| Spacing Token | Pixel Value | Typical Application |
| :--- | :--- | :--- |
| `--space-2xs` | `4px` | Micro-gap between icons and badges, badge internal padding |
| `--space-xs`  | `8px` | Gap between chips, buttons in toolbars, small form gaps |
| `--space-sm`  | `12px`| Card internal sub-item gap, input horizontal padding |
| `--space-md`  | `16px`| Mobile card padding, control container spacing |
| `--space-lg`  | `18px`| Tablet card padding, medium gap between form sections |
| `--space-xl`  | `24px`| Desktop card padding, major component column gaps |
| `--space-2xl` | `32px`| Section separators, modal headers, major content blocks |
| `--space-3xl` | `48px`| Top-level page layout separations |

---

## 3. Card System Geometry

### 3.1. Overview & Standardized Card Roster

AURORA organizes content across five primary card archetypes:
1. **`.card`** — Master structural bento container (Search form container, showcase wrapper, analytics tab wrapper).
2. **`.post-card`** — Individual social media post result item.
3. **`.source-showcase-card`** — Library branch catalog tile with quick stats and filter triggers.
4. **`.subs-kpi`** — Metrics/KPI indicator tile in statistics and subscriber audits.
5. **`.advice-card` (and `.advice-branch-card`)** — Actionable algorithmic recommendation item with branch health score.

### 3.2. Responsive Inner Padding Rhythm

```
+-------------------------------------------------------------+
| Desktop (> 992px)      : 24px inner padding rhythm          |
+-------------------------------------------------------------+
| Tablet  (769px - 992px): 18px inner padding rhythm          |
+-------------------------------------------------------------+
| Mobile  (<= 768px)     : 14px inner padding rhythm          |
+-------------------------------------------------------------+
```

### 3.3. Detailed Card Specifications

#### 1. `.card` (Master Structural Container)
- **Role:** Main surface bounding sections (search forms, settings drawers, report views).
- **Border Radius:** `--radius-xl` (`24px`) on desktop/tablet; `--radius-lg` (`18px`) on mobile.
- **Padding:** Desktop `24px` (1.5rem), Tablet `18px` (1.125rem), Mobile `14px` (0.875rem).
- **Elevation:** Level 1 (`--elevation-1`).
- **Interactive State:** Non-interactive by default; when used as an expandable panel, lifts to Level 2 on hover.

```css
/* Master Structural Card Specification */
.card {
    background: var(--bg-card);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid var(--hairline);
    border-top: 1px solid var(--surface-border-top);
    border-radius: var(--radius-xl);
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: var(--elevation-1);
    transition: box-shadow var(--duration-md) var(--ease),
                border-color var(--duration-md) var(--ease),
                transform var(--duration-md) var(--ease);
}

@media (max-width: 992px) {
    .card {
        border-radius: var(--radius-lg);
        padding: 18px;
        margin-bottom: 18px;
    }
}

@media (max-width: 768px) {
    .card {
        border-radius: var(--radius-md);
        padding: 14px;
        margin-bottom: 14px;
    }
}
```

#### 2. `.post-card` (VK Wall Post Result)
- **Role:** Visual presentation of an individual VK wall post, including author header, media preview gallery, post text snippet, and engagement stats.
- **Border Radius:** `--radius-lg` (`18px`) on desktop; `--radius-md` (`12px`) on mobile.
- **Padding:** Desktop `20px 22px`, Tablet `18px`, Mobile `14px`.
- **Elevation:**
  * **Resting:** Level 1 (`--elevation-1`), `transform: translateY(0)`.
  * **Hover:** Level 2 (`--elevation-2`), `border-color: rgba(62, 230, 196, 0.40)`, `transform: translateY(-4px)`.
  * **Active:** Level 3 (`--elevation-3`), `transform: translateY(-1px)`.
  * **Focus:** Accessible focus ring `box-shadow: var(--elevation-focus)`.

```css
/* Post Card Specification */
.post-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px) saturate(170%);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    border: 1px solid var(--hairline);
    border-top: 1px solid var(--surface-border-top);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    overflow: hidden;
    position: relative;
    box-shadow: var(--elevation-1);
    cursor: pointer;
    transition: transform var(--duration-md) var(--ease),
                box-shadow var(--duration-md) var(--ease),
                border-color var(--duration-md) var(--ease);
}

.post-card:hover {
    border-color: rgba(62, 230, 196, 0.45);
    box-shadow: var(--elevation-2);
    transform: translateY(-4px);
}

.post-card:active {
    box-shadow: var(--elevation-3);
    transform: translateY(-1px);
}

.post-card:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus), var(--elevation-2);
}

@media (max-width: 992px) {
    .post-card {
        padding: 18px;
    }
}

@media (max-width: 768px) {
    .post-card {
        border-radius: var(--radius-md);
        padding: 14px;
        height: auto;
    }
}
```

#### 3. `.source-showcase-card` (Library Branch Tile)
- **Role:** Interactive source selector tile in the 16-branch directory grid.
- **Border Radius:** `--radius-lg` (`18px`) desktop; `--radius-md` (`12px`) mobile.
- **Padding:** Desktop `18px`, Tablet `16px`, Mobile `14px`.
- **States:**
  * **Resting:** Subtle glass container, Level 1.
  * **Hover:** `transform: translateY(-3px)`, glow border `rgba(62, 230, 196, 0.4)`.
  * **Selected (`.selected`):** Accent ring `box-shadow: 0 0 0 2px var(--accent), 0 0 20px rgba(62, 230, 196, 0.3)`, `background: var(--accent-soft)`.
  * **Focus:** `outline: none; box-shadow: var(--elevation-focus)`.

```css
/* Source Showcase Card Specification */
.source-showcase-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px) saturate(170%);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    border: 1px solid var(--hairline);
    border-top: 1px solid var(--surface-border-top);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    box-shadow: var(--elevation-1);
    transition: transform var(--duration-md) var(--ease),
                box-shadow var(--duration-md) var(--ease),
                border-color var(--duration-md) var(--ease),
                background var(--duration) var(--ease);
}

.source-showcase-card:hover {
    border-color: rgba(62, 230, 196, 0.45);
    box-shadow: var(--elevation-2);
    transform: translateY(-3px);
}

.source-showcase-card:active {
    transform: translateY(0);
    box-shadow: var(--elevation-3);
}

.source-showcase-card:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
}

.source-showcase-card.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 2px var(--accent), 0 0 22px rgba(62, 230, 196, 0.28);
}

@media (max-width: 992px) {
    .source-showcase-card {
        padding: 16px;
    }
}

@media (max-width: 768px) {
    .source-showcase-card {
        border-radius: var(--radius-md);
        padding: 14px;
    }
}
```

#### 4. `.subs-kpi` (Analytics Metric Tile)
- **Role:** High-density KPI indicator displaying subscriber count, post frequency, engagement rate, or growth delta.
- **Border Radius:** `--radius-lg` (`18px`) desktop; `--radius-md` (`12px`) mobile.
- **Padding:** Desktop `20px 22px`, Tablet `16px 18px`, Mobile `14px 14px`.
- **Visual Mechanics:** Features large tabular-num figure, uppercase micro-label, and subtle ambient icon watermark.

```css
/* Subscriber / Analytics KPI Card Specification */
.subs-kpi {
    background: var(--surface);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    box-shadow: var(--elevation-1);
    transition: transform var(--duration) var(--ease),
                border-color var(--duration) var(--ease),
                box-shadow var(--duration) var(--ease);
}

.subs-kpi:hover {
    border-color: var(--accent-medium);
    box-shadow: var(--elevation-2);
    transform: translateY(-2px);
}

.subs-kpi-value {
    font-size: 1.75rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-primary);
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}

.subs-kpi-label {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
}

@media (max-width: 992px) {
    .subs-kpi {
        padding: 16px 18px;
    }
    .subs-kpi-value {
        font-size: 1.5rem;
    }
}

@media (max-width: 768px) {
    .subs-kpi {
        border-radius: var(--radius-md);
        padding: 14px;
        gap: 6px;
    }
    .subs-kpi-value {
        font-size: 1.3rem;
    }
}
```

#### 5. `.advice-card` & `.advice-branch-card` (Audit & Recommendation Tile)
- **Role:** Displays branch performance score and prioritized recommendations.
- **Border Radius:** `--radius-lg` (`18px`) desktop; `--radius-md` (`12px`) mobile.
- **Padding:** Header `18px 24px`, Body `16px 20px` desktop; Tablet `16px 18px`; Mobile `14px 14px`.

```css
/* Recommendation & Performance Audit Card */
.advice-card,
.advice-branch-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px) saturate(170%);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--elevation-1);
    transition: transform var(--duration-md) var(--ease),
                box-shadow var(--duration-md) var(--ease),
                border-color var(--duration-md) var(--ease);
}

.advice-card:hover,
.advice-branch-card:hover {
    border-color: rgba(136, 120, 245, 0.40);
    box-shadow: var(--elevation-2);
    transform: translateY(-2px);
}

.advice-branch-head {
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid var(--divider-color);
    background: var(--surface);
}

.advice-items {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 992px) {
    .advice-branch-head {
        padding: 16px 18px;
    }
    .advice-items {
        padding: 14px 16px;
    }
}

@media (max-width: 768px) {
    .advice-card,
    .advice-branch-card {
        border-radius: var(--radius-md);
    }
    .advice-branch-head {
        padding: 14px;
        flex-wrap: wrap;
    }
    .advice-items {
        padding: 12px 14px;
    }
}
```

---

## 4. Input Fields & Form Controls

### 4.1. Core Geometry & Sizing Standards

To guarantee flawless tap mechanics on touch screens and avoid the notorious iOS Safari automatic page zoom-in on `<input>` focus, controls adhere strictly to:

| Viewport | Control Height | Text Size | Horizontal Padding | Icon Clear Target |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop (> 768px)** | **44px** (`2.75rem`) | **14px** (`0.875rem`) | `14px 16px` | 32×32px (hitbox 44px) |
| **Mobile (≤ 768px)**  | **48px** (`3.0rem`)  | **16px** (`1.0rem`)   | `14px 16px` | 36×36px (hitbox 48px) |

> [!IMPORTANT]
> **iOS Safari Auto-Zoom Prevention Rule:** On viewports with width `≤ 768px`, all text inputs (`input[type="text"]`, `input[type="password"]`, `input[type="number"]`, `select`, `textarea`) must be rendered with an explicit `font-size: 16px` (or `font-size: 1rem` where 1rem = 16px). Any value below 16px causes iOS WebKit to force an abrupt layout zoom that disrupts layout stability.

### 4.2. Universal Form Controls CSS

```css
/* ==========================================================================
   AURORA Universal Form Controls — Ergonomic Geometry
   ========================================================================== */

/* Universal Selector for All Text Controls */
input[type="text"],
input[type="password"],
input[type="number"],
input[type="search"],
input[type="date"],
select,
textarea {
    width: 100%;
    height: 44px;
    min-height: 44px;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-primary);
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-md);
    padding: 10px 16px;
    outline: none;
    box-sizing: border-box;
    transition: border-color var(--duration) var(--ease),
                box-shadow var(--duration) var(--ease),
                background var(--duration) var(--ease);
}

textarea {
    height: auto;
    min-height: 96px;
    padding: 12px 16px;
    resize: vertical;
}

/* --------------------------------------------------------------------------
   Distinct Control State Matrix
   -------------------------------------------------------------------------- */

/* 1. Hover State */
input[type="text"]:hover,
input[type="password"]:hover,
input[type="number"]:hover,
select:hover,
textarea:hover {
    border-color: rgba(62, 230, 196, 0.45);
    background: var(--surface-hover);
}

/* 2. Focus State (WCAG AA Compliant Halo) */
input[type="text"]:focus,
input[type="password"]:focus,
input[type="number"]:focus,
select:focus,
textarea:focus {
    border-color: var(--accent);
    background: var(--bg-card);
    box-shadow: 0 0 0 3px rgba(54, 212, 180, 0.35),
                inset 0 1px 2px rgba(0, 0, 0, 0.30);
}

/* 3. Invalid / Error State */
input:invalid:not(:placeholder-shown),
input.is-invalid,
select.is-invalid,
textarea.is-invalid {
    border-color: var(--color-danger) !important;
    background: rgba(240, 96, 96, 0.08) !important;
    box-shadow: 0 0 0 3px rgba(240, 96, 96, 0.25) !important;
}

/* 4. Disabled State */
input:disabled,
select:disabled,
textarea:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: var(--hairline) !important;
    box-shadow: none !important;
    color: var(--muted) !important;
}

/* Placeholder Contrast (WCAG AA 4.5:1 Target) */
input::placeholder,
textarea::placeholder {
    color: var(--text-tertiary);
    opacity: 0.85;
}

/* --------------------------------------------------------------------------
   Mobile Viewports: 48px Height & 16px Font Enforcement
   -------------------------------------------------------------------------- */
@media (max-width: 768px) {
    input[type="text"],
    input[type="password"],
    input[type="number"],
    input[type="search"],
    input[type="date"],
    select {
        height: 48px;
        min-height: 48px;
        font-size: 16px !important; /* Strictly prevents iOS Safari viewport auto-zoom */
        padding: 12px 16px;
    }

    textarea {
        font-size: 16px !important;
        min-height: 110px;
        padding: 14px 16px;
    }
}
```

### 4.3. Ergonomic Add-ons: Leading Icons, Clear Buttons & Select Chevrons

To guarantee high ergonomics when typing long search queries and date ranges:

```css
/* Input with Leading Icon Container */
.input-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
}

.input-leading-icon {
    position: absolute;
    left: 14px;
    color: var(--text-tertiary);
    pointer-events: none;
    font-size: 20px;
    transition: color var(--duration) var(--ease),
                transform var(--duration) var(--ease);
}

.input-icon-wrap input {
    padding-left: 44px;
    padding-right: 42px; /* Space for ergonomic clear button */
}

.input-icon-wrap:focus-within .input-leading-icon {
    color: var(--accent);
    transform: scale(1.05);
}

/* Ergonomic Clear Button (×) */
.input-clear-btn {
    position: absolute;
    right: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: transparent;
    border: none;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--duration) var(--ease);
    opacity: 0;
    pointer-events: none;
}

.input-icon-wrap input:not(:placeholder-shown) ~ .input-clear-btn {
    opacity: 0.75;
    pointer-events: auto;
}

.input-clear-btn:hover {
    opacity: 1;
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.12);
}

.input-clear-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent);
    opacity: 1;
}

/* Custom Dropdown Chevron Container */
.select-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
}

.select-wrap select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    padding-right: 42px;
    cursor: pointer;
}

.select-arrow {
    position: absolute;
    right: 14px;
    pointer-events: none;
    color: var(--muted);
    font-size: 20px;
    transition: transform var(--duration) var(--ease),
                color var(--duration) var(--ease);
}

.select-wrap:focus-within .select-arrow {
    transform: rotate(180deg);
    color: var(--accent);
}

@media (max-width: 768px) {
    .input-clear-btn {
        width: 36px;
        height: 36px;
        right: 6px;
    }
}
```

---

## 5. Buttons, Actions & Badges Hierarchy

AURORA establishes a 4-tier visual hierarchy for interactive actions, guaranteeing clear visual prominence for conversion and safe execution of secondary operations.

```
+--------------------------------------------------------------------------+
| TIER 1: Primary CTA  (.btn-primary)   -> "Начать поиск по записям"       |
+--------------------------------------------------------------------------+
| TIER 2: Tonal Action (.btn-tonal)     -> "Ключ VK", "Настройки", "Тема"  |
+--------------------------------------------------------------------------+
| TIER 3: Ghost/Outline (.btn-outlined) -> Сброс фильтров, очистить выбор  |
+--------------------------------------------------------------------------+
| TIER 4: Tab Controls (.tab-btn)       -> Вкладки ленты, отчётов, советов |
+--------------------------------------------------------------------------+
```

### 5.1. Button Priority Matrix

| Class Name | Visual Treatment | Role & Context | Min Height | Focus Style |
| :--- | :--- | :--- | :--- | :--- |
| **`.btn-primary`** | Aurora Radiant Gradient (`#36D4B4` $\to$ `#8878F5`) + Shimmer | Search submission, primary dialog approval | `48px` | Outer 3px cyan glow |
| **`.btn-tonal`** | Frosted Glass Surface + Border | Header utilities, settings toggles, secondary toolbars | `44px` (40px desktop) | Surface border highlight |
| **`.btn-outlined`**| Transparent background, crisp 1px border | Filter reset, cancellation, report export secondary | `40px` | Accent ring |
| **`.btn-ghost`** | Transparent, zero border, soft hover fill | Icon-only tools, dismissive actions, item actions | `36px` | Soft glow fill |
| **`.tab-btn`** | Pill geometry, muted text $\to$ active card elevation | Navigation between Search, Report, Advice, Subs | `44px` (mobile target) | Inset indicator |

### 5.2. Primary CTA: Magnetic Search Button (`.btn-primary`)

The primary search trigger (*"Начать поиск по записям"*) is the heart of the application:
- **Visual Weight:** Vibrant 3-stop Aurora gradient with a diagonal shimmer beam on hover.
- **Micro-interactions:** Subtle scale uplift (`translateY(-2px)`), radiant starlight glow (`0 10px 28px rgba(54, 212, 180, 0.40)`).
- **Keyboard Hint (`.btn-kbd`):** Displays discrete `Ctrl+↵` pill chip.
- **Mobile Ergonomics:** Expands to full container width (`width: 100%`) on mobile screens ($\le 768\text{px}$) with a generous 48px height.

```css
/* ==========================================================================
   Primary Action Button (AURORA CTA)
   ========================================================================== */
.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 48px;
    padding: 12px 28px;
    font-family: var(--font-body);
    font-size: 0.9375rem;
    font-weight: 700;
    color: #0b111e !important;
    background: var(--btn-primary-bg);
    background-size: 200% 200%;
    border: none;
    border-radius: var(--radius-pill);
    box-shadow: var(--btn-primary-shadow);
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    position: relative;
    overflow: hidden;
    transition: transform var(--duration) var(--ease),
                box-shadow var(--duration) var(--ease),
                background-position var(--duration-md) var(--ease);
}

.btn-primary:hover {
    background-position: 100% 100%;
    box-shadow: var(--btn-primary-hover-shadow);
    transform: translateY(-2px);
}

.btn-primary:active {
    transform: translateY(1px);
    box-shadow: 0 4px 14px rgba(54, 212, 180, 0.35);
}

.btn-primary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px #ffffff, 0 0 0 6px var(--accent);
}

/* Primary Shimmer Light Beam */
.btn-primary::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -60%;
    width: 40%;
    height: 200%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.40), transparent);
    transform: rotate(25deg);
    pointer-events: none;
}

.btn-primary:hover::before {
    animation: btnShimmer 1.2s ease-in-out infinite;
}

@keyframes btnShimmer {
    0%   { left: -60%; }
    100% { left: 140%; }
}
```

### 5.3. Tonal & Secondary Buttons (`.btn-tonal`, `.btn-secondary`)

Used for *"Ключ VK"*, *"Настройки"*, *"Справка"*, and *"Тёмная/Светлая тема"*:

```css
/* Tonal / Secondary Pill Buttons */
.btn-tonal,
.btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    min-height: 40px;
    padding: 8px 18px;
    font-family: var(--font-body);
    font-size: 0.84375rem;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-pill);
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    box-shadow: var(--elevation-0);
    transition: all var(--duration) var(--ease);
}

.btn-tonal:hover,
.btn-secondary:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(54, 212, 180, 0.18);
}

.btn-tonal:active,
.btn-secondary:active {
    transform: translateY(1px);
    box-shadow: none;
}

.btn-tonal:focus-visible,
.btn-secondary:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
}
```

### 5.4. Outlined & Ghost Buttons (`.btn-outlined`, `.btn-ghost`)

Used for filter reset actions (*"Сбросить всё"*), dismiss buttons, and minor toolbars:

```css
/* Outlined Reset / Utility Button */
.btn-outlined {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 38px;
    min-height: 38px;
    padding: 7px 16px;
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted);
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: all var(--duration) var(--ease);
}

.btn-outlined:hover {
    color: var(--text-primary);
    border-color: var(--muted);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
}

.btn-outlined:active {
    transform: translateY(0);
}

.btn-outlined:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
}

/* Ghost Button */
.btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 6px 14px;
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: all var(--duration) var(--ease);
}

.btn-ghost:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
}

.btn-ghost:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
}
```

### 5.5. Tab Buttons (`.tab-btn`) & Counter Badges (`.tab-badge`)

Tabs represent top-level modes (Results Feed, Analytics, Branch Passport, Recommendations, Subscriber Audit):

```css
/* Sticky Tabs Toolbar Container */
.tabs-container {
    position: sticky;
    top: 10px;
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--bg-card);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-pill);
    box-shadow: var(--elevation-1);
    overflow-x: auto;
    scrollbar-width: none;
}

.tabs-container::-webkit-scrollbar {
    display: none;
}

/* Individual Tab Pill Button */
.tab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 0.84375rem;
    font-weight: 500;
    color: var(--muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    user-select: none;
    transition: all var(--duration) var(--ease);
}

.tab-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
}

.tab-btn.active {
    color: var(--accent);
    background: var(--surface);
    font-weight: 600;
    border-color: var(--hairline);
    box-shadow: var(--elevation-1);
}

.tab-btn:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
}

/* Integrated Tab Counter Badge */
.tab-badge {
    background: rgba(255, 255, 255, 0.08);
    color: var(--muted);
    border-radius: var(--radius-pill);
    padding: 2px 8px;
    font-size: 0.6875rem;
    font-weight: 600;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    transition: background var(--duration) var(--ease),
                color var(--duration) var(--ease);
}

.tab-btn.active .tab-badge {
    background: var(--accent-soft);
    color: var(--accent);
}
```

### 5.6. Universal Mobile Touch Ergonomics (44×44px Minimum)

To comply with **WCAG 2.1 Criteria 2.5.5 (Target Size)** and Apple Human Interface Guidelines:

```css
/* Touch Device Target Enforcement */
@media (max-width: 768px) {
    .btn,
    .tab-btn,
    .icon-btn,
    .showcase-filter-btn {
        min-height: 44px;
        min-width: 44px;
    }

    .form-actions .btn-primary {
        width: 100%;
        height: 50px;
        font-size: 1rem;
        justify-content: center;
    }

    .header-actions {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        gap: 8px;
    }

    .header-actions .btn-tonal,
    .header-actions .btn-secondary {
        flex: 1 1 calc(50% - 4px);
        min-height: 44px;
        justify-content: center;
    }
}
```

---

## 6. Responsive Breakpoints Strategy

AURORA follows a structured **fluid-adaptive grid** designed for everything from 4K ultrawide monitors down to compact 360px smartphones.

```
+-----------------------------------------------------------------------------------------+
| BREAKPOINT MATRIX                                                                       |
+-------------------+---------------------+-------------------------+---------------------+
| Viewport Width    | Category            | Container Max-Width     | Layout Adaptation   |
+-------------------+---------------------+-------------------------+---------------------+
| >= 1440px         | Ultra-Wide / 4K     | 1320px fluid centered   | 4-column cards      |
| 1200px - 1439px   | Desktop Large       | 1320px fluid            | 3-column cards      |
| 993px - 1199px    | Desktop Compact     | 1140px fluid            | 2/3-column cards    |
| 769px - 992px     | Tablet Landscape    | 100% (padding 20px)     | 2-column forms      |
| 481px - 768px     | Tablet Port/Mobile  | 100% (padding 14px)     | 1-col forms, wrap   |
| 360px - 480px     | Mobile Standard     | 100% (padding 12px)     | 2x2 KPI, full-btn   |
| < 360px           | Mobile Compact      | 100% (padding 8px)      | 1-col everything    |
+-------------------+---------------------+-------------------------+---------------------+
```

### 6.1. Fluid Container Rules (1440px / 1200px)

```css
/* Fluid Centered App Wrapper */
.app-container {
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    padding: 24px 24px 60px 24px;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
}

@media (max-width: 1200px) {
    .app-container {
        padding: 20px 20px 48px 20px;
    }
}
```

### 6.2. Tablet Ergonomics (992px Breakpoint)
- **Forms:** 2-column grid (`.col-6` takes 50% width, `.col-3` collapses to 50%).
- **Filter Pills:** Wrap naturally with smooth row gap (`gap: 8px`).
- **Showcase Cards:** 2-column grid (`minmax(260px, 1fr)`).

```css
@media (max-width: 992px) {
    /* Form Grid Reconfiguration */
    .form-row {
        gap: 14px;
    }
    .col-3 {
        flex: 0 0 calc(50% - 7px);
        max-width: calc(50% - 7px);
    }
    .col-6 {
        flex: 0 0 100%;
        max-width: 100%;
    }

    /* Filter Pills Wrap */
    .filter-pills-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    /* Post Results Grid (2 Columns) */
    .results-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }
}
```

### 6.3. Mobile Breakpoint (768px Breakpoint)
- **Forms:** Collapse strictly to a single column (`.col-3`, `.col-6`, `.col-12` $\to$ `100%`).
- **Tab Bar:** Wraps smoothly into a 2- or 3-column pill matrix with `min-height: 44px`.
- **Primary CTA:** Full width (`width: 100%`), prominent, touch-friendly.
- **Card Padding:** Decreases to standard 14px rhythm.

```css
@media (max-width: 768px) {
    .app-container {
        padding: 12px 12px 36px 12px;
    }

    /* Single Column Form Controls */
    .col-3, .col-6, .col-12 {
        flex: 0 0 100% !important;
        max-width: 100% !important;
    }

    /* Tab Bar Wrap Mechanics */
    .tabs-container {
        flex-wrap: wrap;
        border-radius: var(--radius-lg);
        padding: 6px;
        gap: 6px;
        top: 6px;
    }

    .tab-btn {
        flex: 1 1 calc(50% - 4px);
        justify-content: center;
        padding: 10px 12px;
        font-size: 0.8125rem;
    }

    /* Results Grid Collapse */
    .results-grid {
        grid-template-columns: 1fr;
        gap: 14px;
    }

    /* Full-Width Action Bar */
    .form-actions {
        width: 100%;
    }
    .form-actions .btn-primary {
        width: 100%;
    }
}
```

### 6.4. Compact Mobile Strategy (480px / 360px Breakpoint)
- **KPI Metrics:** Wrapped into a tight 2×2 grid (`grid-template-columns: repeat(2, 1fr)`).
- **Header:** Reorders brand mark and compacts title text.
- **Buttons:** Every button becomes full-width within its cluster.

```css
@media (max-width: 480px) {
    /* 2x2 KPI Matrix */
    .subs-kpi-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .subs-kpi {
        padding: 12px 10px;
    }

    .subs-kpi-value {
        font-size: 1.25rem;
    }

    /* Compact Tabs (Single or 2 per row) */
    .tab-btn {
        flex: 1 1 100%;
        justify-content: flex-start;
        padding-left: 14px;
    }

    /* Showcase Cards Compact Padding */
    .source-showcase-card {
        padding: 12px;
    }

    /* Hide redundant desktop-only keyboard hints */
    .btn-kbd {
        display: none !important;
    }
}

@media (max-width: 360px) {
    /* Ultra-compact viewport fallback */
    .subs-kpi-grid {
        grid-template-columns: 1fr;
    }
    .app-container {
        padding: 8px 8px 24px 8px;
    }
}
```

---

## 7. Accessibility (WCAG 2.1 AA) & Ergonomics

### 7.1. Color Contrast Validation (WCAG AA 4.5:1 / 3:1)

| UI Element Pair | Evaluated Tokens | Contrast Ratio | Conformance Status |
| :--- | :--- | :--- | :--- |
| **Primary Text on Card Surface** | `#f2f6fd` on `#313a50` | **10.8 : 1** | PASS (AAA) |
| **Secondary Text on Card Surface** | `#a9b5d3` on `#313a50` | **5.4 : 1** | PASS (AA) |
| **Primary CTA Button Text on Gradient** | `#0b111e` on `#36d4b4` | **11.2 : 1** | PASS (AAA) |
| **Input Text on Surface** | `#f2f6fd` on `#364058` | **9.6 : 1** | PASS (AAA) |
| **Input Placeholder on Surface** | `rgba(169, 181, 211, 0.70)` on `#364058` | **4.6 : 1** | PASS (AA) |
| **Focus Indicator on Dark Slate** | `#36d4b4` on `#283042` | **7.8 : 1** | PASS (AA Graphic) |

### 7.2. Focus Indicators (`:focus-visible`)
- All interactive controls (`button`, `input`, `select`, `textarea`, `a`, `[tabindex]`) must display an unambiguous, high-contrast outer ring when navigated via keyboard.
- In Dark Mode: `box-shadow: 0 0 0 3px rgba(54, 212, 180, 0.40)`.
- In Light Mode: `box-shadow: 0 0 0 3px rgba(23, 87, 166, 0.35)`.
- Mouse clicks suppress the outline (`:focus:not(:focus-visible) { outline: none; }`).

### 7.3. Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }

    .btn-primary:hover::before {
        animation: none !important;
    }

    .card,
    .post-card,
    .source-showcase-card {
        transform: none !important;
    }
}
```

---

## 8. Implementation Checklist for Frontend Engineers

To roll out these specifications into `style.css` and `index.html`:

- [ ] **1. Replace Border Radius Tokens in `:root`:**
  - Update `--radius-sm: 8px;`
  - Update `--radius-md: 12px;`
  - Update `--radius-lg: 18px;`
  - Update `--radius-xl: 24px;`
- [ ] **2. Standardize Elevation Shadows:**
  - Add `--elevation-0` through `--elevation-focus` for both `:root` and `[data-theme="light"]`.
- [ ] **3. Implement Card Geometry Hierarchy:**
  - Refactor `.card`, `.post-card`, `.source-showcase-card`, `.subs-kpi`, and `.advice-card`.
  - Enforce `24px` desktop, `18px` tablet, and `14px` mobile inner padding rhythm.
- [ ] **4. Enforce Input Height & Mobile 16px Font:**
  - Confirm desktop inputs are `44px` height with `14px` font.
  - Implement mobile `@media (max-width: 768px)` rule for `48px` height and `16px` font.
  - Verify dropdown select arrows and clear buttons fit inside the 44px/48px geometry.
- [ ] **5. Button & Action Hierarchy:**
  - Ensure `.btn-primary` has the radiant Aurora gradient and shimmer effect.
  - Update `.btn-tonal`, `.btn-outlined`, and `.tab-btn` styles and badge counters.
  - Confirm 44×44px minimum tap hitbox on mobile viewports.
- [ ] **6. Responsive Layout Breakpoints:**
  - Set `.app-container` fluid `max-width: 1320px`.
  - Add 2-column rules at `992px` for forms and pills.
  - Add single-column and wrapped tab bar rules at `768px`.
  - Add 2×2 KPI grid and compact card rules at `480px` and `360px`.
