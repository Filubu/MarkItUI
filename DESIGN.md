---
name: Obsidian Ethereal
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#646464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system embodies a premium, high-fidelity aesthetic that merges **Ultra-Minimalism** with **Dark Glassmorphism**. It is designed for high-performance tools and luxury tech interfaces where focus and clarity are paramount. 

The emotional response should be one of "quiet power"—sophisticated, cold, and precise. The interface relies on deep blacks to create infinite depth, while glass-like surfaces and pure white typography provide the necessary structure without visual clutter. Every element must earn its place on the screen; if a border or shadow doesn't serve a functional purpose in hierarchy, it is removed.

## Colors
The palette is strictly monochromatic, leveraging the full range of the grayscale to establish hierarchy.

- **Backgrounds:** Pure `#000000` is the foundation. It provides the "void" upon which glass elements sit.
- **Surfaces:** Translucent grays created by layering white at low opacities (5% to 12%) over the black background, combined with heavy backdrop blurs.
- **Accents:** Pure `#FFFFFF` is reserved for primary actions, critical text, and essential icons to ensure maximum contrast and readability.
- **States:** Hover and active states are managed through subtle shifts in opacity rather than shifts in hue.

## Typography
This design system uses **Inter** exclusively to maintain a systematic and utilitarian feel. The typographic scale is designed for high contrast: large, tight-tracked headlines paired with generous line-heights for body copy.

- **Weight usage:** Use SemiBold (600) for headers to create "anchor points" on the dark canvas. Use Regular (400) for all reading text.
- **Case:** Use all-caps for labels and small metadata to differentiate from body text without needing additional colors or weights.
- **Anti-aliasing:** Ensure `-webkit-font-smoothing: antialiased` is applied for crisp rendering of white text on black backgrounds.

## Layout & Spacing
The layout follows a **Fluid Grid** model with an emphasis on "negative space as a luxury." 

- **Grid:** A 12-column system is used for desktop. For mobile, a 4-column system is standard.
- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Density:** Elements are spaced aggressively. Information density should be kept low to medium to prevent the "glass" effects from becoming visually overwhelming or "muddy."
- **Alignment:** Strict left-alignment is preferred for all content blocks to maintain the architectural feel of the design system.

## Elevation & Depth
Depth is not communicated through shadows, but through **Tonal Translucency** and **Backdrop Blurs**.

- **Level 0 (Base):** Pure Black `#000000`.
- **Level 1 (Surface):** `rgba(255, 255, 255, 0.05)` background with a `20px` backdrop-filter blur. 1px solid border at `rgba(255, 255, 255, 0.1)`.
- **Level 2 (Floating/Modals):** `rgba(255, 255, 255, 0.08)` background with a `40px` backdrop-filter blur. 1px solid border at `rgba(255, 255, 255, 0.2)`.
- **Borders:** Use 1px internal strokes only. Do not use external shadows unless they are "glow" style (pure white at <5% opacity) for active states.

## Shapes
The shape language is "Soft-Technical." Elements use subtle rounding to feel modern and premium without becoming "bubbly" or playful. 

- **Small elements:** (Checkboxes, Inputs) use 4px (0.25rem).
- **Medium elements:** (Buttons, Chips, Cards) use 8px (0.5rem).
- **Large elements:** (Modals, Sidebars) use 12px (0.75rem).

## Components
- **Buttons:** Primary buttons are Solid White (`#FFFFFF`) with Black text (`#000000`). Secondary buttons are Glass-based (10% White fill, 1px border). Tertiary buttons are text-only with a hover underline.
- **Input Fields:** Ghost style. No fill, 1px bottom border (`rgba(255, 255, 255, 0.3)`). On focus, the border becomes pure white.
- **Cards:** Glassmorphic containers. Always require a `backdrop-filter: blur(20px)` to ensure text legibility over any background movement or elements behind the card.
- **Chips:** Small, pill-shaped glass elements. Use them for metadata or tags. `label-sm` typography.
- **Lists:** Separated by 1px horizontal dividers (`rgba(255, 255, 255, 0.1)`). No bullets; use generous indentation or white vertical bars for active list items.
- **Scrollbars:** Custom-styled to be ultra-thin (2px), pure white, with 0px background.