# Handoff: Wanted Design System

## Overview
Token set, brand assets, and reference UI kits (desktop job board + iOS app home) for Wanted (원티드랩). Reconstructed from the "Wanted Design System (Community)" Figma file, CC BY 4.0.

## About the Design Files
The HTML/JSX files here are **design references**, not production code. Rebuild them in your codebase's own stack (React, Vue, SwiftUI, etc.) using its existing patterns. If there is no codebase yet, pick a suitable framework. `colors_and_type.css` can be used directly as a token source.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and shadows are final. Rebuild the UI pixel-accurately. Thumbnails are placeholder gradients; swap in real imagery.

## How to use in Claude Code
1. Unzip this folder into your repo (e.g. `design/wanted/`).
2. Tell Claude Code: "Read `design/wanted/README.md` and `DESIGN_SYSTEM.md`, then implement X using these tokens."
3. Optional: copy `SKILL.md` into `.claude/skills/wanted-design/` together with the rest of the folder so Claude Code loads it as a skill.

## Screens
### Desktop home (`ui_kits/wanted-desktop/index.html`, 1280px)
- **TopNav**: sticky, 64px tall, white at 96% with a 12px backdrop blur, 1px bottom border `rgba(112,115,124,.22)`. Logo is 22px tall. Links are 15px/600 with 8×12 padding and 8px radius; hover fill `rgba(112,115,124,.08)`. Primary CTA "기업 서비스" is 32px tall.
- **Category sub-bar**: 48px tall, pill links at 14px/500. The active pill is `#171719` with white text.
- **Hero**: dark `#171719` with radial blue/violet glows and 96px padding. Eyebrow is 13px/600 with .14em tracking. Headline is 56px/700/1.15 with −.032em tracking. Sub is 18px/500 in white at 82%. Buttons are 52px tall with 12px radius: one primary, one ghost.
- **FilterBar**: chips 38px tall, pill-shaped, white with a 1px border `rgba(112,115,124,.45)`. Active chip is `#171719`.
- **Job grid**: 4 columns, gaps 24px vertical / 18px horizontal. Each card has a 1:1 thumbnail (8px radius), title at 15px/700, company at 13px/500, meta at 12px/500 in alt-label color, and bonus at 12px/600 in `#0066FF`. Hover lifts the card 2px.

### Mobile home (`ui_kits/wanted-mobile/index.html`, iOS frame)
- **AppBar**: 52px tall with a 36px round icon button. The notification dot is 6px, `#FF4242`.
- **Search field**: 44px tall, 12px radius, fill `rgba(112,115,124,.08)`.
- **Tabs**: 15px/600. The active tab has a 2px `#171719` underline.
- **Hero match card**: 20px radius, gradient `#0066FF → #001536`, title 22px/700, white pill CTA 36px tall.
- **JobRow**: 64px thumbnail (12px radius), title 15px/700 clamped to 2 lines, bookmark on the right. Rows are separated by 1px `rgba(112,115,124,.08)`.
- **TabBar**: 78px tall with a blurred background. Icons are 24px, labels 10px/600. Active stroke is 2.5px.

## Interactions
- Hover: move one token darker (primary `#0066FF` → `#005EEB`, press `#0054D1`).
- Disabled: label at 16% opacity on a fill-normal background.
- Transitions: 120–160ms ease for color and transform.
- Korean text: `word-break: keep-all`; nav labels and CTAs use `nowrap`.

## State
- Desktop: `filter` (active chip id).
- Mobile: `tab` (bottom tab), `topTab` (top category tab).

## Design Tokens
All tokens live in `colors_and_type.css`:
- **Colors**: atomic scales (blue, coolNeutral, red, green, orange, violet, and more) and semantic tokens (label, background, line, status, fill), with light and dark themes.
- **Type**: Pretendard JP. 7 tiers: Display 56/44, Title 28/26/24, Heading 22/20, Body 17/16/15, Label 14/13/12, Caption 12/11.
- **Spacing**: 4px grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128).
- **Radius**: 4, 8, 12, 16, 20, 24, 32, plus pill.
- **Shadows**: xsmall through xlarge (two layers each, `rgba(23,23,23,.06–.12)`).

## Assets
- `assets/logos/`: Wanted symbol, logotype, horizontal lockup, LaaS, OneID (SVG, `currentColor`).
- Icons: Lucide stands in for the real Wanted icon set; replace it when the real set is available.
- Fonts: Pretendard JP and Wanted Sans load from a CDN.

## Files
- `colors_and_type.css`: all tokens
- `DESIGN_SYSTEM.md`: brand, voice, visual foundations, iconography
- `SKILL.md`: agent skill manifest
- `ui_kits/wanted-desktop/`, `ui_kits/wanted-mobile/`: reference implementations
- `preview/`: token and component specimen cards
