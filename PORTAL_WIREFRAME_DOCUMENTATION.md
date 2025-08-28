# TRIOLL Portal Journey - Detailed Wireframe Documentation

## Overview
This document provides a detailed visual breakdown of the TRIOLL portal experience, from initial load through the 3D tunnel journey to the landing page.

**Last Updated**: Current version with all recent updates

---

## 🎬 Scene 1: Loading Screen (0-3 seconds)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                         TRIOLL                              │
│                    (Pulsing Logo)                           │
│                                                             │
│                      ⟲ ⟲ ⟲                                 │
│                  (Spinning Rings)                           │
│                                                             │
│              INITIALIZING EXPERIENCE                        │
│                  (Fading Text)                              │
│                                                             │
│                 ▓▓▓▓▓▓░░░░░░░░░                           │
│                  (Progress Bar)                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
**Details:**
1. Background: Pure black (#000000)
2. Logo: White, 48px, italic font-weight 900
3. Spinner: 3 concentric rings rotating at different speeds
4. Progress bar: White fill on dark background
5. Animation: Fade out after loading complete

---

## 🌀 Scene 2: Tunnel Entry with Logo (Scroll 0-5%)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ·  ·  ·  ·  ·  ·                        │
│                 ·                    ·                      │
│              ·                          ·                   │
│            ·       ┌─────────┐          ·                  │
│           ·       │ TRIOLL   │           ·                 │
│          ·        │  (Logo)  │            ·               │
│           ·       └─────────┘            ·                │
│            ·                              ·                 │
│              ·                          ·                   │
│                 ·                    ·                      │
│                    ·  ·  ·  ·  ·  ·                        │
│                                                             │
│                  [REQUEST ACCESS]                           │
│                  (Bottom Right)                             │
└─────────────────────────────────────────────────────────────┘
```
**Details:**
1. TRIOLL logo appears early at position 0.03
2. Logo loaded from GitHub URL: https://raw.githubusercontent.com/trioll/Trioll/78458b29ad3b63aae3eff39aae462c0ad4cc4d8b/Logo/Trioll_Logo_White.png
3. Logo has reduced glow (opacity 0.8, emissiveIntensity 0.1)
4. Logo size: 1.5x1.5 with SpriteMaterial
5. Tunnel entrance forms from particles
6. REQUEST ACCESS button visible in bottom right
7. Camera begins moving forward

---

## 🚀 Scene 3: Initial Tunnel Travel (Scroll 8-15%)
```
┌─────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲░░│
│░╱──────────────────────────────────────────────────────╲░│
│╱────────────────────────────────────────────────────────╲│
│──────────────────┌─────────────────┐──────────────────────│
│                  │     TRIOLL       │                      │
│                  └─────────────────┘                      │
│                  ┌─────────────────┐                      │
│                  │  THE FUTURE OF   │                      │
│                  │ GAME DISCOVERY   │                      │
│                  └─────────────────┘                      │
│──────────────────────────────────────────────────────────│
│╲────────────────────────────────────────────────────────╱│
│░╲──────────────────────────────────────────────────────╱░│
│░░╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                  [REQUEST ACCESS]                           │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. Text sequence: Logo → "TRIOLL" → "THE FUTURE OF GAME DISCOVERY"
2. Text appears at scroll positions 0.08, 0.12, and 0.15
3. Font: Helvetica Neue Bold loaded from Three.js CDN
4. Hexagonal tunnel walls with wireframe pattern
5. Speed lines indicate forward motion
6. Particles flowing past camera
7. Bloom effect on text with emissive materials

---

## 🦅 Scene 4: White Snitch Appearance (Scroll 25-40%)
```
┌─────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲░░│
│╱──────────────────────────────────────────────────────────╲│
│                          ╭─╮                                │
│                  ≈≈≈────┤◯├────≈≈≈                        │
│                  ≈≈≈    ╰─╯    ≈≈≈                        │
│                  ≈≈≈   TRIOLL   ≈≈≈                       │
│                  ≈≈≈   (Logo)   ≈≈≈                       │
│                     White Wings                             │
│                                                            │
│                Constrained to center                        │
│╲──────────────────────────────────────────────────────────╱│
│░╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                  [REQUEST ACCESS]                           │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. White snitch with animated wings (NOT golden - Harry Potter reference clarified)
2. Snitch material: MeshStandardMaterial with white color #ffffff
3. TRIOLL logo centered in sphere (opacity 0.85)
4. Snitch movement constrained: danceRadius 0.3, verticalFloat 0.2
5. Flies between text lines "JOIN THE GAME" and "DISCOVERY REVOLUTION"
6. Only 2 wings (elongated, white, semi-transparent)
7. Wings opacity: 0.6, animated with sin/cos functions
8. Logo loaded from GitHub URL with proper texture mapping

---

## 💫 Scene 5: Deep Tunnel with Text Rings (Scroll 40-70%)
```
┌─────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲░░│
│╱──────────────────────────────────────────────────────────╲│
│         ╭─────────────────────────────╮                    │
│        ╱  DISCOVER • PLAY • CONNECT    ╲                   │
│       │    (Rotating Text Ring)         │                  │
│        ╲                               ╱                    │
│         ╰─────────────────────────────╯                    │
│                      ╭─╮                                    │
│                 ╭────┤◯├────╮                              │
│                      ╰─╯                                    │
│              (Snitch Following)                             │
│╲──────────────────────────────────────────────────────────╱│
│░╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                  [REQUEST ACCESS]                           │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. Multiple text rings at different depths
2. Text: "DISCOVER . PLAY . CONNECT" (dots as separators)
3. Text rotates around tunnel axis
4. Rings get larger as camera approaches
5. Snitch maintains position relative to camera
6. Increased particle density
7. Text uses dots (.) instead of arrows to avoid character encoding issues

---

## 🌟 Scene 6: Tunnel Climax (Scroll 70-85%)
```
┌─────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲▓│
│╱════════════════════════════════════════════════════════╲│
│║                                                        ║│
│║              THE FUTURE IS NOW                         ║│
│║                                                        ║│
│║                    ╔═══╗                               ║│
│║                    ║ ◯ ║                               ║│
│║                    ╚═══╝                               ║│
│║                                                        ║│
│║            PREPARE FOR LANDING                         ║│
│║                                                        ║│
│╲════════════════════════════════════════════════════════╱│
│▓╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│                  [REQUEST ACCESS]                           │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. Tunnel walls brighten significantly
2. Text becomes more prominent
3. Camera speed increases
4. Particle effects intensify
5. Preparing for white transition

---

## ⚪ Scene 7: White Ripple Transition (Scroll 85-90%)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                         ⚪                                  │
│                      ⚪⚪⚪⚪⚪                               │
│                   ⚪⚪⚪⚪⚪⚪⚪⚪⚪                            │
│                ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                         │
│             ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                      │
│          ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                   │
│       ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                │
│                                                             │
│                                                             │
│              (Ripple expands from center)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. White overlay with gradient ripple effect
2. Multiple ripple waves (3 layers) with staggered animations
3. Radial gradient: white center to transparent edges
4. Enhanced "wripply" effect per user feedback
5. All 3D elements fade out
6. Smooth transition to landing page
7. Duration: ~2 seconds
8. Animation timing: 0.2s, 0.4s, 0.6s delays for ripples

---

## 🏠 Scene 8: Landing Page Arrival (Scroll 90-100%)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] TRIOLL                    PLATFORM DEVELOPERS GAMERS│
│         NEXT-GEN GAME DISCOVERY                  CONTACT US │
│─────────────────────────────────────────────────────────────│
│                                                             │
│                                                             │
│              THE FUTURE OF                                  │
│              GAME DISCOVERY                                 │
│                                                             │
│         AI-powered matchmaking between                      │
│              gamers and games                               │
│                                                             │
│                [JOIN US]                                    │
│                                                             │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│     │   For   │    │   For   │    │   AI    │            │
│     │ Gamers  │    │Developers│    │Powered  │            │
│     └─────────┘    └─────────┘    └─────────┘            │
│                                                             │
│                  (Content continues...)                     │
└─────────────────────────────────────────────────────────────┐
```
**Details:**
1. Starfield background animation
2. Content fades in with scroll-reveal
3. Navigation bar fixed at top
   - "CONTACT US" links to mailto:info@trioll.com
   - "PLATFORM" requires password authentication
   - "DEVELOPERS" and "GAMERS" open JOIN US modal with pre-selection
4. "JOIN US" button (changed from "JOIN BETA")
5. Feature cards without emoji icons
6. Google Sheets form integration
7. Team section with GitHub-hosted images
8. Smooth entry from white transition

---

## 📱 Interactive Elements Throughout Journey

### REQUEST ACCESS Button (Always Visible)
1. Position: Bottom right, fixed
2. Style: White border, transparent background
3. Hover: Fills white, text turns black
4. Click: Opens modal with form

### Scroll Indicators
1. Subtle scroll hint animation
2. Progress indication through vignette intensity
3. Smooth scroll behavior

### Performance Considerations
1. Progressive loading of 3D assets
2. LOD (Level of Detail) for tunnel geometry
3. Particle count adjusts based on performance
4. WebGL fallbacks for older devices

---

## 🎨 Color Palette & Effects

### Tunnel Journey
1. Background: #000000 (Pure black)
2. Primary: #FFFFFF (White text/elements)
3. Snitch: #FFFFFF (White, not golden)
4. Glow: Bloom post-processing effect (reduced intensity)
5. Emissive: 0x444444 (subtle glow on logo)

### Visual Effects
1. Vignette: Radial gradient overlay
2. Bloom: Unreal bloom pass on bright elements
3. Particles: Alpha-blended sprites
4. Motion blur: Simulated through particle trails

---

## 📐 Technical Specifications

### Viewport
1. Full screen experience (100vw x 100vh)
2. Scroll height: 400vh (reduced for faster progression)
3. Camera FOV: 75 degrees
4. Near plane: 0.1, Far plane: 1000
5. Trigger percentage: 0.825 for landing page transition

### Animation Timing
1. Loading: 0-3 seconds
2. Tunnel entry: Scroll 0-10%
3. Main journey: Scroll 10-85%
4. White transition: Scroll 85-90%
5. Landing page: Scroll 90-100%

### Performance Targets
1. 60 FPS on modern devices
2. 30 FPS minimum on older devices
3. < 3 second initial load time
4. Progressive enhancement approach
5. Optimized scroll duration: 400vh height
6. Smooth transitions with GSAP ScrollTrigger

---

## 🔧 Customization Points

1. **Text Content**: All floating text can be modified in main.js
2. **Tunnel Speed**: Adjust camera movement multipliers
3. **Particle Density**: Scale particle count for performance
4. **Color Scheme**: Modify material colors and bloom intensity
5. **Transition Timing**: Adjust scroll percentages for each scene
6. **Logo/Assets**: Replace image URLs in code

---

This wireframe documentation provides a comprehensive view of the TRIOLL portal journey. Each scene can be adjusted based on specific requirements while maintaining the overall flow and user experience.