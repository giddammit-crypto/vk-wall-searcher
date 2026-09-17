#!/usr/bin/env python3
"""
AURORA OPAC Visual Assets Generator
Creates:
  1. assets/images/opac/catalog_banner.svg (1200x320)
     - High-end Cyber-Cosmic library header banner for OPAC book search modal
     - Featuring glowing neon bookshelves, book constellations, galactic knowledge sphere,
       and robot Cosmo reading with holographic pages rising into space.
  2. assets/images/opac/book_cover_patterns.svg (1200x800)
     - Multi-genre book cover patterns and embossed decorative frames:
       * Sci-Fi / Cyberpunk (Neon cyan & deep space)
       * Classic Literature (Royal ruby & gold damask)
       * Children / Fairy Tales (Magic purple-pink & golden stardust)
       * Poetry & Drama (Amethyst lavender & platinum laurel)
       * Science & Non-Fiction (Emerald tech & atomic lattice)
       * Local History / Vladimir (Golden Gates & white-stone carvings)
"""

import os, math, xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPAC_DIR = os.path.join(BASE_DIR, "assets", "images", "opac")
os.makedirs(OPAC_DIR, exist_ok=True)

BANNER_PATH = os.path.join(OPAC_DIR, "catalog_banner.svg")
PATTERNS_PATH = os.path.join(OPAC_DIR, "book_cover_patterns.svg")

def build_catalog_banner():
    """Builds the 1200x320 SVG banner for OPAC book search modal."""
    
    # Generate background stars
    stars_svg = []
    # Seeded pseudorandom stars for stable reproducible output
    star_data = [
        (45, 35, 1.2, 0.7), (95, 180, 1.5, 0.8), (140, 75, 1.0, 0.5), (180, 240, 1.8, 0.9),
        (230, 45, 1.1, 0.6), (280, 160, 2.0, 0.9), (340, 90, 1.4, 0.7), (390, 260, 1.0, 0.5),
        (430, 30, 1.6, 0.8), (480, 140, 1.2, 0.6), (530, 280, 1.5, 0.7), (590, 60, 2.2, 0.95),
        (640, 210, 1.3, 0.7), (690, 110, 1.0, 0.5), (730, 250, 1.7, 0.85), (780, 40, 1.4, 0.7),
        (830, 170, 2.0, 0.9), (870, 80, 1.1, 0.6), (920, 230, 1.6, 0.8), (960, 50, 2.4, 0.95),
        (1010, 190, 1.2, 0.6), (1060, 100, 1.8, 0.85), (1110, 260, 1.4, 0.7), (1160, 40, 1.5, 0.8),
        (60, 290, 1.2, 0.6), (160, 130, 1.3, 0.7), (310, 220, 1.6, 0.8), (460, 85, 1.1, 0.5),
        (560, 195, 1.9, 0.85), (710, 65, 1.2, 0.6), (850, 285, 1.4, 0.7), (1000, 135, 1.7, 0.8),
        (1140, 180, 1.0, 0.5), (1180, 290, 1.3, 0.65), (20, 110, 1.5, 0.75), (510, 20, 1.4, 0.7)
    ]
    for (cx, cy, r, op) in star_data:
        stars_svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" opacity="{op}"/>')
    
    # 4-point glowing quasars
    quasars = [(120, 50), (410, 210), (740, 90), (890, 240), (1050, 60), (270, 270)]
    for (qx, qy) in quasars:
        stars_svg.append(f'''
        <g transform="translate({qx}, {qy})">
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#00f0ff" stroke-width="1.2" opacity="0.8"/>
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#00f0ff" stroke-width="1.2" opacity="0.8"/>
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" filter="url(#glow-cyan-sm)"/>
        </g>''')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/>
      <stop offset="35%" stop-color="#0b1120"/>
      <stop offset="70%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#070b16"/>
    </linearGradient>

    <!-- Glowing Nebulae -->
    <radialGradient id="nebula-cyan" cx="20%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="#0369a1" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0b1120" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="nebula-magenta" cx="70%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.18"/>
      <stop offset="40%" stop-color="#8a6cff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="nebula-emerald" cx="88%" cy="65%" r="35%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.20"/>
      <stop offset="50%" stop-color="#047857" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>

    <!-- Bookshelf Glow Gradient -->
    <linearGradient id="shelf-light" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#8a6cff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Holographic Beam Gradient -->
    <linearGradient id="holo-beam" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#38bdf8" stop-opacity="0.25"/>
      <stop offset="80%" stop-color="#a855f7" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Sphere Gradients -->
    <radialGradient id="sphere-core" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="30%" stop-color="#0284c7"/>
      <stop offset="70%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>

    <linearGradient id="orbit-ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#8a6cff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Mascot Gradients -->
    <linearGradient id="cosmo-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>

    <linearGradient id="cosmo-visor" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#404040"/>
      <stop offset="50%" stop-color="#2d2d2d"/>
      <stop offset="100%" stop-color="#1f1f1f"/>
    </linearGradient>

    <linearGradient id="cosmo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="50%" stop-color="#00b280"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>

    <linearGradient id="cosmo-gold-eye" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffeb3b"/>
      <stop offset="60%" stop-color="#ffc107"/>
      <stop offset="100%" stop-color="#ff9800"/>
    </linearGradient>

    <!-- Glow Filters -->
    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="glow-cyan-sm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- 1. Deep Space Background -->
  <rect width="1200" height="320" fill="url(#bg-grad)"/>

  <!-- 2. Nebulae -->
  <rect width="1200" height="320" fill="url(#nebula-cyan)"/>
  <rect width="1200" height="320" fill="url(#nebula-magenta)"/>
  <rect width="1200" height="320" fill="url(#nebula-emerald)"/>

  <!-- 3. Starfield & Quasars -->
  {"".join(stars_svg)}

  <!-- 4. Cybernetic Cyber-Library Bookshelves (Left & Center-Backdrop) -->
  <g id="cyber-bookshelves" opacity="0.35">
    <!-- Vertical neon rack columns with perspective -->
    <line x1="50" y1="20" x2="50" y2="300" stroke="#00f0ff" stroke-width="1.5" opacity="0.4"/>
    <line x1="180" y1="30" x2="180" y2="290" stroke="#8a6cff" stroke-width="1.5" opacity="0.5"/>
    <line x1="310" y1="40" x2="310" y2="280" stroke="#00f0ff" stroke-width="1.5" opacity="0.4"/>
    <line x1="440" y1="50" x2="440" y2="270" stroke="#8a6cff" stroke-width="1.5" opacity="0.5"/>
    <line x1="570" y1="60" x2="570" y2="260" stroke="#00f0ff" stroke-width="1.5" opacity="0.4"/>

    <!-- Horizontal glowing shelves -->
    <path d="M 40 100 L 600 100" stroke="url(#shelf-light)" stroke-width="2.5" filter="url(#glow-cyan-sm)"/>
    <path d="M 40 180 L 600 180" stroke="url(#shelf-light)" stroke-width="2.5" filter="url(#glow-cyan-sm)"/>
    <path d="M 40 260 L 600 260" stroke="url(#shelf-light)" stroke-width="2.5" filter="url(#glow-cyan-sm)"/>

    <!-- Holographic Digital Books on Shelves (Tier 1: y=60..100) -->
    <!-- Shelf 1 (y=100) -->
    <rect x="70" y="66" width="14" height="34" rx="2" fill="#00f0ff" opacity="0.85"/>
    <rect x="88" y="62" width="18" height="38" rx="2" fill="#8a6cff" opacity="0.9"/>
    <rect x="110" y="70" width="12" height="30" rx="2" fill="#ec4899" opacity="0.8"/>
    <rect x="126" y="58" width="20" height="42" rx="2" fill="#38bdf8" opacity="0.95"/>
    <rect x="150" y="64" width="16" height="36" rx="2" fill="#34d399" opacity="0.85"/>
    
    <rect x="200" y="60" width="22" height="40" rx="2" fill="#fbbf24" opacity="0.85"/>
    <rect x="226" y="68" width="14" height="32" rx="2" fill="#ec4899" opacity="0.9"/>
    <rect x="244" y="64" width="18" height="36" rx="2" fill="#00f0ff" opacity="0.85"/>
    <rect x="266" y="56" width="24" height="44" rx="2" fill="#8a6cff" opacity="0.95"/>

    <rect x="330" y="64" width="16" height="36" rx="2" fill="#38bdf8" opacity="0.8"/>
    <rect x="350" y="58" width="22" height="42" rx="2" fill="#34d399" opacity="0.9"/>
    <rect x="376" y="66" width="14" height="34" rx="2" fill="#fbbf24" opacity="0.85"/>
    <rect x="394" y="62" width="20" height="38" rx="2" fill="#ec4899" opacity="0.85"/>

    <rect x="460" y="60" width="18" height="40" rx="2" fill="#00f0ff" opacity="0.85"/>
    <rect x="482" y="66" width="14" height="34" rx="2" fill="#8a6cff" opacity="0.9"/>
    <rect x="500" y="56" width="24" height="44" rx="2" fill="#38bdf8" opacity="0.95"/>
    <rect x="528" y="64" width="16" height="36" rx="2" fill="#34d399" opacity="0.8"/>

    <!-- Shelf 2 (y=180) -->
    <rect x="66" y="144" width="16" height="36" rx="2" fill="#ec4899" opacity="0.85"/>
    <rect x="86" y="138" width="20" height="42" rx="2" fill="#38bdf8" opacity="0.95"/>
    <rect x="110" y="146" width="14" height="34" rx="2" fill="#fbbf24" opacity="0.8"/>
    <rect x="128" y="140" width="18" height="40" rx="2" fill="#00f0ff" opacity="0.9"/>
    <rect x="150" y="148" width="16" height="32" rx="2" fill="#8a6cff" opacity="0.85"/>

    <rect x="205" y="136" width="24" height="44" rx="2" fill="#34d399" opacity="0.95"/>
    <rect x="233" y="144" width="14" height="36" rx="2" fill="#00f0ff" opacity="0.8"/>
    <rect x="251" y="140" width="18" height="40" rx="2" fill="#ec4899" opacity="0.9"/>
    <rect x="273" y="146" width="16" height="34" rx="2" fill="#fbbf24" opacity="0.85"/>

    <rect x="334" y="140" width="20" height="40" rx="2" fill="#8a6cff" opacity="0.9"/>
    <rect x="358" y="146" width="14" height="34" rx="2" fill="#38bdf8" opacity="0.85"/>
    <rect x="376" y="136" width="22" height="44" rx="2" fill="#00f0ff" opacity="0.95"/>
    <rect x="402" y="144" width="16" height="36" rx="2" fill="#34d399" opacity="0.8"/>

    <rect x="465" y="142" width="18" height="38" rx="2" fill="#fbbf24" opacity="0.85"/>
    <rect x="487" y="136" width="22" height="44" rx="2" fill="#ec4899" opacity="0.95"/>
    <rect x="513" y="144" width="16" height="36" rx="2" fill="#00f0ff" opacity="0.8"/>
    <rect x="533" y="140" width="18" height="40" rx="2" fill="#8a6cff" opacity="0.85"/>

    <!-- Shelf 3 (y=260) -->
    <rect x="74" y="222" width="20" height="38" rx="2" fill="#34d399" opacity="0.85"/>
    <rect x="98" y="228" width="14" height="32" rx="2" fill="#00f0ff" opacity="0.8"/>
    <rect x="116" y="218" width="22" height="42" rx="2" fill="#8a6cff" opacity="0.95"/>
    <rect x="142" y="224" width="16" height="36" rx="2" fill="#ec4899" opacity="0.85"/>

    <rect x="210" y="220" width="18" height="40" rx="2" fill="#38bdf8" opacity="0.9"/>
    <rect x="232" y="226" width="14" height="34" rx="2" fill="#fbbf24" opacity="0.8"/>
    <rect x="250" y="216" width="24" height="44" rx="2" fill="#00f0ff" opacity="0.95"/>
    <rect x="278" y="224" width="16" height="36" rx="2" fill="#34d399" opacity="0.85"/>

    <rect x="340" y="222" width="20" height="38" rx="2" fill="#ec4899" opacity="0.9"/>
    <rect x="364" y="218" width="22" height="42" rx="2" fill="#8a6cff" opacity="0.85"/>
    <rect x="390" y="226" width="14" height="34" rx="2" fill="#00f0ff" opacity="0.8"/>
    <rect x="408" y="220" width="18" height="40" rx="2" fill="#38bdf8" opacity="0.9"/>

    <rect x="470" y="224" width="16" height="36" rx="2" fill="#34d399" opacity="0.85"/>
    <rect x="490" y="216" width="24" height="44" rx="2" fill="#fbbf24" opacity="0.9"/>
    <rect x="518" y="222" width="18" height="38" rx="2" fill="#00f0ff" opacity="0.85"/>
  </g>

  <!-- 5. Celestial Constellation "The Open Book of Universe" -->
  <g id="book-constellation" opacity="0.75">
    <!-- Star lines -->
    <path d="M 680 60 L 730 45 L 780 60 L 730 80 Z" fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-dasharray="3,3" filter="url(#glow-cyan-sm)"/>
    <path d="M 730 80 L 730 110" stroke="#00f0ff" stroke-width="1.2" stroke-dasharray="3,3"/>
    <path d="M 680 60 L 680 90 L 730 110 L 780 90 L 780 60" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.8"/>
    <path d="M 680 90 L 730 80 L 780 90" fill="none" stroke="#8a6cff" stroke-width="1.2"/>
    <!-- Nodes -->
    <circle cx="680" cy="60" r="3" fill="#ffffff" filter="url(#glow-cyan-sm)"/>
    <circle cx="730" cy="45" r="3.5" fill="#fef08a" filter="url(#glow-cyan-sm)"/>
    <circle cx="780" cy="60" r="3" fill="#ffffff" filter="url(#glow-cyan-sm)"/>
    <circle cx="680" cy="90" r="2.5" fill="#38bdf8"/>
    <circle cx="730" cy="80" r="3" fill="#ffffff"/>
    <circle cx="780" cy="90" r="2.5" fill="#38bdf8"/>
    <circle cx="730" cy="110" r="3" fill="#00f0ff" filter="url(#glow-cyan-sm)"/>
  </g>

  <!-- 6. Galactic Knowledge Sphere & Orbital Rings (Behind Cosmo, Center-Right) -->
  <g id="knowledge-sphere" transform="translate(840, 160)">
    <!-- Outer Glow Aura -->
    <circle cx="0" cy="0" r="88" fill="#00f0ff" opacity="0.08" filter="url(#glow-cyan)"/>
    <circle cx="0" cy="0" r="76" fill="url(#sphere-core)" stroke="#00f0ff" stroke-width="2" filter="url(#glow-cyan-sm)"/>
    
    <!-- Coordinate Mesh / Data Grid on Sphere -->
    <ellipse cx="0" cy="0" rx="72" ry="24" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="72" ry="48" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.4"/>
    <ellipse cx="0" cy="0" rx="26" ry="72" fill="none" stroke="#8a6cff" stroke-width="0.8" opacity="0.4"/>
    <line x1="-74" y1="0" x2="74" y2="0" stroke="#00f0ff" stroke-width="1.2" opacity="0.7"/>

    <!-- Orbital Ring 1 (Tilted 25 deg) -->
    <g transform="rotate(-25)">
      <ellipse cx="0" cy="0" rx="115" ry="32" fill="none" stroke="url(#orbit-ring)" stroke-width="2.5" opacity="0.9" filter="url(#glow-cyan-sm)"/>
      <circle cx="108" cy="-10" r="4" fill="#ffffff" filter="url(#glow-cyan-sm)"/>
      <circle cx="-100" cy="14" r="3.5" fill="#fbcfe8"/>
    </g>

    <!-- Orbital Ring 2 (Tilted -45 deg) -->
    <g transform="rotate(45)">
      <ellipse cx="0" cy="0" rx="100" ry="24" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>
      <circle cx="95" cy="0" r="3" fill="#00f0ff"/>
    </g>

    <!-- Floating Binary / Data Runes -->
    <text x="-55" y="-30" font-family="'Courier New', monospace" font-size="9" fill="#00f0ff" opacity="0.65" letter-spacing="2">OPAC·LIB33</text>
    <text x="-48" y="38" font-family="'Courier New', monospace" font-size="9" fill="#8a6cff" opacity="0.65" letter-spacing="2">DB·62·VLAD</text>
  </g>

  <!-- 7. Holographic Cone of Light from Cosmo's Book -->
  <polygon points="1010,210 930,30 1090,30 1010,210" fill="url(#holo-beam)"/>
  
  <!-- Floating Holographic Book Pages & Magic Glyphs (Rising from Book into Space) -->
  <g id="holo-pages" opacity="0.85">
    <!-- Page 1 (Left tilt) -->
    <g transform="translate(970, 110) rotate(-18)">
      <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#0b1329" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" filter="url(#glow-cyan-sm)"/>
      <line x1="-16" y1="-8" x2="16" y2="-8" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="-16" y1="0" x2="12" y2="0" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="-16" y1="8" x2="6" y2="8" stroke="#38bdf8" stroke-width="1.5"/>
    </g>

    <!-- Page 2 (Right tilt, higher) -->
    <g transform="translate(1045, 80) rotate(22)">
      <rect x="-22" y="-15" width="44" height="30" rx="3" fill="#130d2a" stroke="#ec4899" stroke-width="1.5" opacity="0.9"/>
      <line x1="-14" y1="-7" x2="14" y2="-7" stroke="#f472b6" stroke-width="1.5"/>
      <line x1="-14" y1="0" x2="10" y2="0" stroke="#f472b6" stroke-width="1.5"/>
      <line x1="-14" y1="7" x2="4" y2="7" stroke="#f472b6" stroke-width="1.5"/>
    </g>

    <!-- Page 3 (Center high) -->
    <g transform="translate(1005, 45) rotate(-6)">
      <rect x="-26" y="-18" width="52" height="36" rx="3" fill="#081a24" stroke="#34d399" stroke-width="1.8" opacity="0.95" filter="url(#glow-cyan-sm)"/>
      <line x1="-18" y1="-8" x2="18" y2="-8" stroke="#34d399" stroke-width="1.5"/>
      <line x1="-18" y1="0" x2="14" y2="0" stroke="#34d399" stroke-width="1.5"/>
      <line x1="-18" y1="8" x2="8" y2="8" stroke="#34d399" stroke-width="1.5"/>
    </g>

    <!-- Holographic Knowledge Glyphs (Atom, Spiral, Stars) -->
    <!-- Atom Orbit Symbol -->
    <g transform="translate(950, 60)">
      <ellipse cx="0" cy="0" rx="14" ry="5" fill="none" stroke="#00f0ff" stroke-width="1" transform="rotate(30)"/>
      <ellipse cx="0" cy="0" rx="14" ry="5" fill="none" stroke="#00f0ff" stroke-width="1" transform="rotate(-30)"/>
      <circle cx="0" cy="0" r="2.5" fill="#fef08a"/>
    </g>

    <!-- Golden Sparkles -->
    <circle cx="985" cy="155" r="2" fill="#fbbf24" filter="url(#glow-cyan-sm)"/>
    <circle cx="1035" cy="140" r="2.5" fill="#00f0ff" filter="url(#glow-cyan-sm)"/>
    <circle cx="940" cy="120" r="2" fill="#ec4899"/>
    <circle cx="1065" cy="115" r="2.2" fill="#fef08a"/>
    <circle cx="1010" cy="90" r="2" fill="#34d399"/>
  </g>

  <!-- 8. ROBOT COSMO WITH BOOK (Master Character Vector Illustration) -->
  <!-- Positioned at x: 1010, y: 200 (scale ~0.72) -->
  <g id="cosmo-mascot" transform="translate(1010, 205)">
    <!-- Cosmo Shadow Base -->
    <ellipse cx="0" cy="92" rx="70" ry="14" fill="#000000" opacity="0.45"/>

    <!-- Antenna -->
    <line x1="0" y1="-90" x2="0" y2="-120" stroke="#2d3034" stroke-width="6" stroke-linecap="round"/>
    <circle cx="0" cy="-122" r="11" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="4"/>
    <circle cx="-3" cy="-125" r="3.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="0" cy="-122" r="18" fill="#34d399" opacity="0.25" filter="url(#glow-cyan-sm)"/>

    <!-- Earphone Left -->
    <g transform="translate(-74, -36)">
      <ellipse cx="0" cy="0" rx="12" ry="24" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="5"/>
      <ellipse cx="3" cy="0" rx="5" ry="14" fill="#047857"/>
    </g>

    <!-- Earphone Right -->
    <g transform="translate(74, -36)">
      <ellipse cx="0" cy="0" rx="12" ry="24" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="5"/>
      <ellipse cx="-3" cy="0" rx="5" ry="14" fill="#047857"/>
    </g>

    <!-- Helmet Outer Outline & Base -->
    <rect x="-72" y="-95" width="144" height="116" rx="52" ry="52" fill="url(#cosmo-body)" stroke="#2d3034" stroke-width="7"/>
    <!-- Head Specular Highlights -->
    <path d="M -45 -82 Q 0 -92 45 -82" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.9"/>

    <!-- Visor Bezel (Emerald Border) -->
    <rect x="-56" y="-76" width="112" height="74" rx="26" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="4"/>
    
    <!-- Visor Inner Screen (Dark Glass) -->
    <rect x="-50" y="-70" width="100" height="62" rx="20" fill="url(#cosmo-visor)"/>
    <!-- Visor Glass Reflection Curve -->
    <path d="M -42 -64 Q 0 -58 42 -64 L 40 -52 Q 0 -46 -40 -52 Z" fill="#ffffff" opacity="0.12"/>

    <!-- Gold LED Eyes (Looking Down at Book with Warm Joy) -->
    <!-- Left Eye -->
    <g transform="translate(-24, -38)">
      <ellipse cx="0" cy="0" rx="12" ry="14" fill="url(#cosmo-gold-eye)" stroke="#2d3034" stroke-width="2.5"/>
      <ellipse cx="0" cy="0" rx="16" ry="18" fill="#f59e0b" opacity="0.3" filter="url(#glow-cyan-sm)"/>
      <circle cx="-3" cy="-4" r="4" fill="#ffffff"/>
      <circle cx="3" cy="4" r="2" fill="#ffffff" opacity="0.8"/>
    </g>

    <!-- Right Eye -->
    <g transform="translate(24, -38)">
      <ellipse cx="0" cy="0" rx="12" ry="14" fill="url(#cosmo-gold-eye)" stroke="#2d3034" stroke-width="2.5"/>
      <ellipse cx="0" cy="0" rx="16" ry="18" fill="#f59e0b" opacity="0.3" filter="url(#glow-cyan-sm)"/>
      <circle cx="-3" cy="-4" r="4" fill="#ffffff"/>
      <circle cx="3" cy="4" r="2" fill="#ffffff" opacity="0.8"/>
    </g>

    <!-- Cute Smiling Mouth -->
    <path d="M -10 -18 Q 0 -10 10 -18" fill="none" stroke="#fa5d59" stroke-width="4" stroke-linecap="round"/>

    <!-- Rosy Cheeks -->
    <ellipse cx="-38" cy="-26" rx="7" ry="5" fill="#ff8aa0" opacity="0.75"/>
    <ellipse cx="38" cy="-26" rx="7" ry="5" fill="#ff8aa0" opacity="0.75"/>

    <!-- Body Torso -->
    <path d="M -46 22 Q -50 78 -24 86 L 24 86 Q 50 78 46 22 Z" fill="url(#cosmo-body)" stroke="#2d3034" stroke-width="6"/>
    <!-- Emerald Chest Emblem / Core -->
    <circle cx="0" cy="48" r="14" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="3"/>
    <circle cx="-3" cy="45" r="4" fill="#ffffff" opacity="0.8"/>
    <circle cx="0" cy="48" r="18" fill="#34d399" opacity="0.3" filter="url(#glow-cyan-sm)"/>

    <!-- Open Book in Hands (Front of Chest) -->
    <!-- Book Spine & Cover -->
    <g id="cosmo-book" transform="translate(0, 52)">
      <!-- Book Glow Base -->
      <ellipse cx="0" cy="18" rx="65" ry="18" fill="#00f0ff" opacity="0.4" filter="url(#glow-cyan)"/>

      <!-- Cover Backing (Dark Emerald) -->
      <path d="M -70 12 L -2 24 L -2 48 L -70 36 Z" fill="#006647" stroke="#2d3034" stroke-width="3"/>
      <path d="M 70 12 L 2 24 L 2 48 L 70 36 Z" fill="#006647" stroke="#2d3034" stroke-width="3"/>

      <!-- Pages Left (Cream White with Gold Rim) -->
      <path d="M -66 8 L -2 20 L -2 42 L -66 30 Z" fill="#fffef7" stroke="#2d3034" stroke-width="2.5"/>
      <!-- Pages Right (Cream White) -->
      <path d="M 66 8 L 2 20 L 2 42 L 66 30 Z" fill="#fffef7" stroke="#2d3034" stroke-width="2.5"/>

      <!-- Gold Bookmark Ribbon Hanging Down -->
      <polygon points="-2,20 2,20 4,56 0,50 -4,56" fill="#fbbf24" stroke="#2d3034" stroke-width="2"/>

      <!-- Text Lines on Pages -->
      <line x1="-56" y1="18" x2="-14" y2="24" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="-54" y1="24" x2="-16" y2="30" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="-52" y1="30" x2="-22" y2="35" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>

      <line x1="14" y1="24" x2="56" y2="18" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="16" y1="30" x2="54" y2="24" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="22" y1="35" x2="52" y2="30" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Mitten Paws Holding Book -->
      <ellipse cx="-64" cy="24" rx="10" ry="12" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="3"/>
      <ellipse cx="64" cy="24" rx="10" ry="12" fill="url(#cosmo-emerald)" stroke="#2d3034" stroke-width="3"/>
    </g>
  </g>

  <!-- 9. Header UI & Cyberpunk HUD (Left Side: x: 50..660) -->
  <g id="banner-ui" transform="translate(60, 48)">
    <!-- Top Pill Badge: OPAC System Identifier -->
    <g id="badge-opac">
      <!-- Glow & Pill -->
      <rect x="0" y="0" width="360" height="30" rx="15" fill="#0f172a" stroke="#00f0ff" stroke-width="1.5" opacity="0.95" filter="url(#glow-cyan-sm)"/>
      <circle cx="16" cy="15" r="5" fill="#00f0ff">
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <text x="32" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11.5" font-weight="700" fill="#00f0ff" letter-spacing="2">ЭЛЕКТРОННЫЙ КАТАЛОГ OPAC-GLOBAL</text>
    </g>

    <!-- Main Title (Gradient Cyber-Cosmic Typography) -->
    <text x="0" y="86" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="38" font-weight="900" fill="#ffffff" letter-spacing="1">
      ПОИСК КНИГ И ИЗДАНИЙ
    </text>
    
    <!-- Secondary Subtitle: Library Foundation Info -->
    <g transform="translate(0, 102)">
      <!-- Golden Accent Chip -->
      <rect x="0" y="6" width="165" height="24" rx="6" fill="#78350f" opacity="0.6"/>
      <rect x="0" y="6" width="165" height="24" rx="6" fill="none" stroke="#fbbf24" stroke-width="1.2"/>
      <text x="10" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#fbbf24" letter-spacing="1.2">ЦГБ г. ВЛАДИМИРА</text>

      <text x="180" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14.5" font-weight="600" fill="#cbd5e1">
        База 62 • Единый фонд 18 филиалов
      </text>
    </g>

    <!-- Features / Bullet points with icons -->
    <g transform="translate(0, 155)">
      <!-- Bullet 1: Books Count -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="28" height="28" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
        <!-- Book Icon -->
        <path d="M 7 9 Q 14 7 14 21 Q 7 20 7 9 Z M 21 9 Q 14 7 14 21 Q 21 20 21 9 Z" fill="none" stroke="#00f0ff" stroke-width="1.5"/>
        <text x="36" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="600" fill="#f8fafc">
          300 000+ книг и периодики
        </text>
      </g>

      <!-- Bullet 2: Real-time Status -->
      <g transform="translate(260, 0)">
        <rect x="0" y="0" width="28" height="28" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1.2"/>
        <!-- Check / Pulse Icon -->
        <path d="M 7 14 L 12 19 L 21 9" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="36" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="600" fill="#f8fafc">
          Статус «В наличии» и шифры
        </text>
      </g>

      <!-- Bullet 3: Fast Search Hint -->
      <g transform="translate(520, 0)">
        <rect x="0" y="0" width="28" height="28" rx="8" fill="#1e293b" stroke="#ec4899" stroke-width="1.2"/>
        <!-- Search Magnifier Icon -->
        <circle cx="12" cy="12" r="5" fill="none" stroke="#ec4899" stroke-width="1.5"/>
        <line x1="16" y1="16" x2="21" y2="21" stroke="#ec4899" stroke-width="2" stroke-linecap="round"/>
        <text x="36" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="600" fill="#f8fafc">
          Быстрый поиск онлайн
        </text>
      </g>
    </g>

    <!-- Decorative Corner HUD Brackets -->
    <path d="M -20 -15 L -20 15 M -20 -15 L 15 -15" fill="none" stroke="#00f0ff" stroke-width="2" opacity="0.6"/>
    <path d="M -20 200 L -20 170 M -20 200 L 15 200" fill="none" stroke="#00f0ff" stroke-width="2" opacity="0.6"/>
  </g>

  <!-- 10. Frame Vignette & Edge Accents -->
  <!-- Top & Bottom Border Highlighting Lines -->
  <line x1="0" y1="0" x2="1200" y2="0" stroke="url(#shelf-light)" stroke-width="2" opacity="0.8"/>
  <line x1="0" y1="320" x2="1200" y2="320" stroke="url(#shelf-light)" stroke-width="2" opacity="0.8"/>
</svg>'''
    return svg

def build_book_cover_patterns():
    """
    Builds the 1200x800 SVG with rich decorative cover patterns and embossed styles:
    1. Sci-Fi / Cyberpunk (Neon cyan & deep space)
    2. Classic Literature (Royal ruby & gold damask)
    3. Children / Fairy Tales (Magic purple-pink & golden stardust)
    4. Poetry & Drama (Amethyst lavender & platinum laurel)
    5. Science & Non-Fiction (Emerald tech & atomic lattice)
    6. Local History / Vladimir (Golden Gates & white-stone carvings)
    """

    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- ========================================== -->
    <!-- COMMON SHADOWS & GLOWS                     -->
    <!-- ========================================== -->
    <filter id="card-shadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
    <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- ========================================== -->
    <!-- 1. PATTERN: SCI-FI / CYBERPUNK             -->
    <!-- ========================================== -->
    <linearGradient id="grad-scifi" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050b14"/>
      <stop offset="40%" stop-color="#082f49"/>
      <stop offset="80%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#00f0ff"/>
    </linearGradient>

    <pattern id="pattern-scifi" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#00f0ff" stroke-width="0.8" opacity="0.28"/>
      <circle cx="20" cy="20" r="1.8" fill="#38bdf8" opacity="0.6"/>
      <line x1="0" y1="0" x2="40" y2="40" stroke="#0284c7" stroke-width="0.5" opacity="0.18"/>
      <line x1="40" y1="0" x2="0" y2="40" stroke="#0284c7" stroke-width="0.5" opacity="0.18"/>
      <circle cx="0" cy="0" r="1" fill="#00f0ff" opacity="0.4"/>
      <circle cx="40" cy="0" r="1" fill="#00f0ff" opacity="0.4"/>
      <circle cx="0" cy="40" r="1" fill="#00f0ff" opacity="0.4"/>
      <circle cx="40" cy="40" r="1" fill="#00f0ff" opacity="0.4"/>
    </pattern>

    <!-- ========================================== -->
    <!-- 2. PATTERN: CLASSIC LITERATURE             -->
    <!-- ========================================== -->
    <linearGradient id="grad-classic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a0815"/>
      <stop offset="50%" stop-color="#580d28"/>
      <stop offset="100%" stop-color="#831843"/>
    </linearGradient>

    <pattern id="pattern-classic" width="48" height="48" patternUnits="userSpaceOnUse">
      <!-- Damask / Royal Fleur Acanthus Element -->
      <g fill="none" stroke="#fbbf24" stroke-width="0.9" opacity="0.32">
        <path d="M 24 6 C 20 14 14 18 10 24 C 16 26 22 22 24 32 C 26 22 32 26 38 24 C 34 18 28 14 24 6 Z"/>
        <circle cx="24" cy="24" r="3" fill="#fbbf24" opacity="0.4"/>
        <path d="M 6 24 C 12 28 16 34 24 38 C 18 42 14 44 6 42"/>
        <path d="M 42 24 C 36 28 32 34 24 38 C 30 42 34 44 42 42"/>
      </g>
    </pattern>

    <!-- ========================================== -->
    <!-- 3. PATTERN: CHILDREN / FAIRY TALES         -->
    <!-- ========================================== -->
    <linearGradient id="grad-kids" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="45%" stop-color="#701a75"/>
      <stop offset="85%" stop-color="#be185d"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>

    <pattern id="pattern-kids" width="50" height="50" patternUnits="userSpaceOnUse">
      <!-- Magic 4-point stars, crescent & stardust -->
      <g fill="#fef08a" opacity="0.42">
        <!-- 4-point star -->
        <path d="M 25 10 Q 25 20 15 20 Q 25 20 25 30 Q 25 20 35 20 Q 25 20 25 10 Z"/>
        <!-- Small star -->
        <path d="M 45 35 Q 45 40 40 40 Q 45 40 45 45 Q 45 40 50 40 Q 45 40 45 35 Z" opacity="0.6"/>
        <!-- Tiny dots -->
        <circle cx="8" cy="8" r="1.5" fill="#f472b6"/>
        <circle cx="42" cy="12" r="1.2" fill="#38bdf8"/>
        <circle cx="12" cy="40" r="1.4" fill="#ffffff"/>
        <!-- Mini Crescent -->
        <path d="M 6 22 A 6 6 0 0 0 16 28 A 7 7 0 0 1 8 20 Z" fill="#fef08a" opacity="0.5"/>
      </g>
    </pattern>

    <!-- ========================================== -->
    <!-- 4. PATTERN: POETRY & DRAMA                 -->
    <!-- ========================================== -->
    <linearGradient id="grad-poetry" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="45%" stop-color="#3730a3"/>
      <stop offset="80%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>

    <pattern id="pattern-poetry" width="44" height="44" patternUnits="userSpaceOnUse">
      <!-- Laurel branch & lyric wave curves -->
      <g fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.32">
        <path d="M 0 44 Q 22 22 44 0"/>
        <!-- Laurel Leaves -->
        <path d="M 14 30 Q 10 22 18 20 Q 20 28 14 30 Z" fill="#e2e8f0" opacity="0.25"/>
        <path d="M 28 16 Q 24 8 32 6 Q 34 14 28 16 Z" fill="#e2e8f0" opacity="0.25"/>
        <circle cx="22" cy="22" r="1.5" fill="#c084fc"/>
      </g>
    </pattern>

    <!-- ========================================== -->
    <!-- 5. PATTERN: SCIENCE & NON-FICTION          -->
    <!-- ========================================== -->
    <linearGradient id="grad-science" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="45%" stop-color="#064e3b"/>
      <stop offset="85%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>

    <pattern id="pattern-science" width="48" height="42" patternUnits="userSpaceOnUse">
      <!-- Hexagonal Molecular Lattice & Technical Grid -->
      <g fill="none" stroke="#34d399" stroke-width="0.9" opacity="0.32">
        <!-- Hexagon 1 -->
        <polygon points="24,2 44,12 44,32 24,42 4,32 4,12"/>
        <circle cx="24" cy="2" r="2" fill="#00f0ff"/>
        <circle cx="44" cy="12" r="1.5" fill="#34d399"/>
        <circle cx="44" cy="32" r="1.5" fill="#34d399"/>
        <circle cx="24" cy="42" r="2" fill="#00f0ff"/>
        <circle cx="4" cy="32" r="1.5" fill="#34d399"/>
        <circle cx="4" cy="12" r="1.5" fill="#34d399"/>
        <!-- Center connection -->
        <circle cx="24" cy="22" r="2.5" fill="#6ee7b7" opacity="0.6"/>
      </g>
    </pattern>

    <!-- ========================================== -->
    <!-- 6. PATTERN: LOCAL HISTORY / VLADIMIR       -->
    <!-- ========================================== -->
    <linearGradient id="grad-vladimir" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="40%" stop-color="#451a03"/>
      <stop offset="80%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>

    <pattern id="pattern-vladimir" width="56" height="56" patternUnits="userSpaceOnUse">
      <!-- Old Russian Arch & White-Stone Carving Motifs -->
      <g fill="none" stroke="#f59e0b" stroke-width="1.0" opacity="0.35">
        <!-- Arch of Golden Gate -->
        <path d="M 12 48 L 12 28 A 16 16 0 0 1 44 28 L 44 48"/>
        <!-- Inner Decorative Cross / Star -->
        <path d="M 28 16 L 28 34 M 20 24 L 36 24"/>
        <circle cx="28" cy="12" r="3" fill="#f59e0b" opacity="0.5"/>
        <!-- White stone relief curls -->
        <path d="M 4 8 C 10 4 14 12 20 8"/>
        <path d="M 52 8 C 46 4 42 12 36 8"/>
      </g>
    </pattern>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="1200" height="800" fill="#0b0f19"/>

  <!-- Canvas Header Info -->
  <g transform="translate(60, 42)">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="1">
      AURORA • ПАТТЕРНЫ И ДЕКОРАТИВНЫЕ ОБЛОЖКИ OPAC
    </text>
    <text y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8">
      Векторные градиентные подложки и тиснения для каталожных карточек по жанрам литературы (ЦГБ г. Владимира)
    </text>
  </g>

  <!-- ============================================================= -->
  <!-- ROW 1: 3 COVERS (Y = 100)                                     -->
  <!-- ============================================================= -->

  <!-- CARD 1: ФАНТАСТИКА И КИБЕРПАНК -->
  <g id="cover-scifi" transform="translate(60, 100)" filter="url(#card-shadow)">
    <!-- Book Base Frame -->
    <rect width="330" height="310" rx="16" fill="url(#grad-scifi)"/>
    <!-- Pattern Overlay -->
    <rect width="330" height="310" rx="16" fill="url(#pattern-scifi)"/>

    <!-- Spine Accent (Left strip) -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#00f0ff" opacity="0.25"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#00f0ff" stroke-width="1.5" opacity="0.6"/>

    <!-- Embossed Border & Futuristic Brackets -->
    <rect x="42" y="18" width="270" height="274" rx="10" fill="none" stroke="#00f0ff" stroke-width="1.8" opacity="0.75" filter="url(#cyan-glow)"/>
    <rect x="48" y="24" width="258" height="262" rx="8" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.4"/>

    <!-- Center Cyber Seal / Emblem -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#0f172a" stroke="#00f0ff" stroke-width="2" opacity="0.85"/>
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="1.5"/>
      <!-- Orbit ring -->
      <ellipse cx="0" cy="0" rx="54" ry="16" fill="none" stroke="#00f0ff" stroke-width="1.5" transform="rotate(-30)"/>
    </g>

    <!-- Genre Typography -->
    <text x="177" y="225" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff" letter-spacing="3">
      ФАНТАСТИКА
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="'Courier New', monospace" font-size="10.5" font-weight="700" fill="#00f0ff" letter-spacing="2">
      SCI-FI · CYBER · SPACE
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#94a3b8">
      id: #pattern-scifi
    </text>
  </g>

  <!-- CARD 2: КЛАССИЧЕСКАЯ ЛИТЕРАТУРА -->
  <g id="cover-classic" transform="translate(435, 100)" filter="url(#card-shadow)">
    <!-- Book Base Frame -->
    <rect width="330" height="310" rx="16" fill="url(#grad-classic)"/>
    <!-- Pattern Overlay -->
    <rect width="330" height="310" rx="16" fill="url(#pattern-classic)"/>

    <!-- Spine Accent -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#fbbf24" opacity="0.22"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#fbbf24" stroke-width="1.5" opacity="0.6"/>

    <!-- Ornate Embossed Gold Border -->
    <rect x="42" y="18" width="270" height="274" rx="10" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.85" filter="url(#gold-glow)"/>
    <rect x="48" y="24" width="258" height="262" rx="8" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.5"/>

    <!-- Corner Victorian Flourishes -->
    <path d="M 44 38 C 56 38 56 26 56 20 M 44 38 C 44 48 34 48 28 48" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
    <path d="M 310 38 C 298 38 298 26 298 20" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
    <path d="M 44 272 C 56 272 56 284 56 290" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
    <path d="M 310 272 C 298 272 298 284 298 290" stroke="#fbbf24" stroke-width="1.5" fill="none"/>

    <!-- Center Royal Medallion -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#3b0718" stroke="#fbbf24" stroke-width="2" opacity="0.95"/>
      <circle cx="0" cy="0" r="38" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="3,2"/>
      <!-- Royal Crown / Lyre Silhouette -->
      <path d="M -16 12 L -20 -8 L -8 2 L 0 -14 L 8 2 L 20 -8 L 16 12 Z" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>
      <circle cx="0" cy="8" r="3" fill="#be123c"/>
    </g>

    <!-- Genre Typography -->
    <text x="177" y="225" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="18" font-weight="900" fill="#fef08a" letter-spacing="3">
      КЛАССИКА
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="11" font-style="italic" fill="#fcd34d" letter-spacing="2">
      РУССКАЯ И МИРОВАЯ
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#cbd5e1">
      id: #pattern-classic
    </text>
  </g>

  <!-- CARD 3: ДЕТСКАЯ ЛИТЕРАТУРА И СКАЗКИ -->
  <g id="cover-kids" transform="translate(810, 100)" filter="url(#card-shadow)">
    <!-- Book Base Frame -->
    <rect width="330" height="310" rx="16" fill="url(#grad-kids)"/>
    <!-- Pattern Overlay -->
    <rect width="330" height="310" rx="16" fill="url(#pattern-kids)"/>

    <!-- Spine Accent -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#f472b6" opacity="0.25"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#f472b6" stroke-width="1.5" opacity="0.6"/>

    <!-- Magical Scalloped Border -->
    <rect x="42" y="18" width="270" height="274" rx="12" fill="none" stroke="#fbcfe8" stroke-width="2" opacity="0.8"/>
    <rect x="48" y="24" width="258" height="262" rx="10" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="6,4" opacity="0.7"/>

    <!-- Center Magic Emblem -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#581c87" stroke="#f472b6" stroke-width="2.2" opacity="0.9"/>
      <!-- Crescent Moon with Magic Stardust -->
      <path d="M -8 -22 A 24 24 0 0 0 14 16 A 26 26 0 0 1 -14 -14 A 20 20 0 0 1 -8 -22 Z" fill="#fef08a" stroke="#d97706" stroke-width="1"/>
      <circle cx="16" cy="-10" r="3.5" fill="#ffffff" filter="url(#gold-glow)"/>
      <circle cx="8" cy="18" r="2.5" fill="#38bdf8"/>
    </g>

    <!-- Genre Typography -->
    <text x="177" y="225" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff" letter-spacing="2">
      ДЕТСКИЕ КНИГИ
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#fef08a" letter-spacing="2">
      СКАЗКИ · ПРИКЛЮЧЕНИЯ
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#fbcfe8">
      id: #pattern-kids
    </text>
  </g>

  <!-- ============================================================= -->
  <!-- ROW 2: 3 COVERS (Y = 445)                                     -->
  <!-- ============================================================= -->

  <!-- CARD 4: ПОЭЗИЯ И ДРАМАТУРГИЯ -->
  <g id="cover-poetry" transform="translate(60, 445)" filter="url(#card-shadow)">
    <rect width="330" height="310" rx="16" fill="url(#grad-poetry)"/>
    <rect width="330" height="310" rx="16" fill="url(#pattern-poetry)"/>

    <!-- Spine Accent -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#a855f7" opacity="0.25"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#c084fc" stroke-width="1.5" opacity="0.6"/>

    <!-- Silver & Lavender Border -->
    <rect x="42" y="18" width="270" height="274" rx="10" fill="none" stroke="#c084fc" stroke-width="1.8" opacity="0.8"/>
    <rect x="48" y="24" width="258" height="262" rx="8" fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.4"/>

    <!-- Center Lyre / Quill Emblem -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#2e1065" stroke="#c084fc" stroke-width="2" opacity="0.95"/>
      <!-- Lyre Instrument -->
      <path d="M -16 10 C -18 -12 -12 -18 -4 -18 L -4 12 Z" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      <path d="M 16 10 C 18 -12 12 -18 4 -18 L 4 12 Z" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="-8" y1="12" x2="8" y2="12" stroke="#e2e8f0" stroke-width="2.5"/>
      <line x1="-2" y1="-16" x2="-2" y2="10" stroke="#c084fc" stroke-width="1.2"/>
      <line x1="2" y1="-16" x2="2" y2="10" stroke="#c084fc" stroke-width="1.2"/>
      <ellipse cx="0" cy="15" rx="12" ry="5" fill="#e2e8f0"/>
    </g>

    <text x="177" y="225" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="18" font-weight="900" fill="#ffffff" letter-spacing="3">
      ПОЭЗИЯ
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="11" font-style="italic" fill="#e9d5ff" letter-spacing="2">
      СТИХИ · ЛИРИКА · ДРАМА
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#c084fc">
      id: #pattern-poetry
    </text>
  </g>

  <!-- CARD 5: НАУКА И НОН-ФИКШН -->
  <g id="cover-science" transform="translate(435, 445)" filter="url(#card-shadow)">
    <rect width="330" height="310" rx="16" fill="url(#grad-science)"/>
    <rect width="330" height="310" rx="16" fill="url(#pattern-science)"/>

    <!-- Spine Accent -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#34d399" opacity="0.25"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#34d399" stroke-width="1.5" opacity="0.6"/>

    <!-- Blueprint Technical Border -->
    <rect x="42" y="18" width="270" height="274" rx="10" fill="none" stroke="#34d399" stroke-width="1.8" opacity="0.8"/>
    <rect x="48" y="24" width="258" height="262" rx="8" fill="none" stroke="#6ee7b7" stroke-width="0.8" opacity="0.4"/>
    <!-- Technical Corner Marks -->
    <line x1="36" y1="18" x2="48" y2="18" stroke="#34d399" stroke-width="2"/>
    <line x1="42" y1="12" x2="42" y2="24" stroke="#34d399" stroke-width="2"/>

    <!-- Center Atomic / Molecular Symbol -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#022c22" stroke="#34d399" stroke-width="2" opacity="0.9"/>
      <!-- 3 Orbital Rings -->
      <ellipse cx="0" cy="0" rx="34" ry="12" fill="none" stroke="#34d399" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="34" ry="12" fill="none" stroke="#34d399" stroke-width="1.5" transform="rotate(60)"/>
      <ellipse cx="0" cy="0" rx="34" ry="12" fill="none" stroke="#34d399" stroke-width="1.5" transform="rotate(-60)"/>
      <circle cx="0" cy="0" r="7" fill="#00f0ff" filter="url(#cyan-glow)"/>
      <circle cx="28" cy="-5" r="2.5" fill="#fef08a"/>
    </g>

    <text x="177" y="225" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff" letter-spacing="2.5">
      НАУКА И ЗНАНИЕ
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="'Courier New', monospace" font-size="10.5" font-weight="700" fill="#6ee7b7" letter-spacing="1.5">
      SCIENCE · TECH · NATURE
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#a7f3d0">
      id: #pattern-science
    </text>
  </g>

  <!-- CARD 6: КРАЕВЕДЕНИЕ / ВЛАДИМИР -->
  <g id="cover-vladimir" transform="translate(810, 445)" filter="url(#card-shadow)">
    <rect width="330" height="310" rx="16" fill="url(#grad-vladimir)"/>
    <rect width="330" height="310" rx="16" fill="url(#pattern-vladimir)"/>

    <!-- Spine Accent -->
    <path d="M 0 16 Q 0 0 16 0 L 28 0 L 28 310 L 16 310 Q 0 310 0 294 Z" fill="#f59e0b" opacity="0.25"/>
    <line x1="28" y1="0" x2="28" y2="310" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>

    <!-- Old Russian Ancient Gold Border -->
    <rect x="42" y="18" width="270" height="274" rx="10" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.85" filter="url(#gold-glow)"/>
    <rect x="48" y="24" width="258" height="262" rx="8" fill="none" stroke="#fde68a" stroke-width="0.8" opacity="0.4"/>

    <!-- Center Golden Gates of Vladimir Symbol -->
    <g transform="translate(177, 135)">
      <circle cx="0" cy="0" r="44" fill="#291104" stroke="#f59e0b" stroke-width="2" opacity="0.95"/>
      <!-- Golden Gates (Золотые Ворота г. Владимира) -->
      <!-- Mighty White-Stone Arch Base -->
      <path d="M -22 24 L -22 -4 L -12 -4 L -12 24 Z" fill="#fef3c7" stroke="#78350f" stroke-width="1"/>
      <path d="M 22 24 L 22 -4 L 12 -4 L 12 24 Z" fill="#fef3c7" stroke="#78350f" stroke-width="1"/>
      <!-- Semicircular Arch Top -->
      <path d="M -12 -4 A 12 12 0 0 1 12 -4 L 12 -2 A 10 10 0 0 0 -12 -2 Z" fill="#fef3c7"/>
      <!-- Gatekeeper Chapel (Church Above Gates) -->
      <rect x="-18" y="-16" width="36" height="12" fill="#d97706" stroke="#78350f" stroke-width="1"/>
      <!-- Golden Dome & Cross -->
      <path d="M -9 -16 C -9 -28 0 -34 0 -34 C 0 -34 9 -28 9 -16 Z" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
      <line x1="0" y1="-34" x2="0" y2="-40" stroke="#fef08a" stroke-width="1.5"/>
      <line x1="-3" y1="-37" x2="3" y2="-37" stroke="#fef08a" stroke-width="1.5"/>
    </g>

    <text x="177" y="225" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="17" font-weight="900" fill="#fef08a" letter-spacing="2.5">
      КРАЕВЕДЕНИЕ
    </text>
    <text x="177" y="245" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="11" font-weight="700" fill="#fde68a" letter-spacing="2">
      ВЛАДИМИРСКИЙ КРАЙ
    </text>
    <text x="177" y="272" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" fill="#fed7aa">
      id: #pattern-vladimir
    </text>
  </g>
</svg>'''
    return svg

def main():
    print("=== Generating AURORA OPAC Visual Assets ===")
    
    # 1. Generate Banner
    banner_content = build_catalog_banner()
    with open(BANNER_PATH, "w", encoding="utf-8") as f:
        f.write(banner_content)
    print(f"✓ Created {BANNER_PATH} ({len(banner_content)} bytes)")
    
    # 2. Generate Book Cover Patterns
    patterns_content = build_book_cover_patterns()
    with open(PATTERNS_PATH, "w", encoding="utf-8") as f:
        f.write(patterns_content)
    print(f"✓ Created {PATTERNS_PATH} ({len(patterns_content)} bytes)")
    
    # 3. Validate XML/SVG
    for p in [BANNER_PATH, PATTERNS_PATH]:
        try:
            tree = ET.parse(p)
            root = tree.getroot()
            print(f"✓ Validated XML: {os.path.basename(p)} -> tag={root.tag}, viewBox={root.get('viewBox')}")
        except Exception as e:
            print(f"✗ XML Validation Error in {p}: {e}")
            return 1
            
    print("\nAll OPAC visual assets successfully created and verified!")
    return 0

if __name__ == "__main__":
    exit(main())
