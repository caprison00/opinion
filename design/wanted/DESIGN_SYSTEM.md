# Wanted Design System

A bilingual (Korean / English / Japanese) design system from **Wanted Lab** (원티드랩), the Korean recruiting / careers company. Distributed under CC BY 4.0.

This system was reconstructed from the official **"Wanted Design System (Community)"** Figma file. It covers Wanted's full product family of recruiting and career tools.

## Source

- **Figma:** "Wanted Design System (Community)" — community file by Wanted Lab. Mounted in this project as a virtual filesystem (read-only).
- **License:** CC BY 4.0 (per the file's own README).
- **Authors credited in the file:** Hyungjin Kil, Chaeri Oh, Doeun Kim, Sanghyo Yee, Kyungmin Park, Sungho Cho, Jisoo Lee (design); plus support team.
- **Last updated in source:** 2025. 11. 6.

## Products represented

The "Wanted" brand is a family of products around hiring, talent and gigs:

- **Wanted** — flagship job-matching platform (career.wanted.co.kr)
- **Wanted Space** — community + content
- **Wanted Gigs** — freelance / gig marketplace
- **Wanted LaaS** (Lab as a Service) — recruiting solution / ATS for companies
- **Wanted 채용 솔루션** (Recruiting Solution) — enterprise hiring suite
- **Wanted Agent** — recruiter / agent tools
- **Wanted OneID** — unified login
- **ZipDA** (집다) — referenced in icons / docs

The system targets **mobile (iOS, Android), web mobile, and desktop web** in parallel — every component cluster has Platform=Desktop and Platform=Mobile variants.

## Index of this folder

| File / Folder | What it is |
|---|---|
| `README.md` | This file. Brand context, content and visual foundations, iconography. |
| `SKILL.md` | Agent skill manifest — read first if you're an agent invoking this. |
| `colors_and_type.css` | All color tokens (atomic + semantic, light + dark) and typography tokens as CSS custom properties. |
| `assets/` | Logos, brand SVGs. |
| `fonts/` | Webfonts (Pretendard / Pretendard JP via CDN — see file). |
| `preview/` | Card-sized HTML specimens for the Design System review tab. |
| `ui_kits/wanted-mobile/` | Mobile (iOS-style) UI kit: components + interactive home screen. |
| `ui_kits/wanted-desktop/` | Desktop web UI kit: navigation, job cards, application flow. |

## CONTENT FUNDAMENTALS

Wanted's voice is **bilingual-first**. Korean is the primary tongue, but every public surface ships matched English (and sometimes Japanese) copy in parallel. Design specs in the source file label every section in both languages — e.g. "Color - Palette" / "컬러 정의", "Typography" / "타이포그래피".

**Tone**

- **Calm, professional, direct.** No exclamation marks in body. No marketing puffery. Sentences are short and declarative.
- **Helpful but reserved** — closer to enterprise SaaS than consumer-app cheer. The brand talks about "helping people find a remarkable career" without sloganeering.
- **Inclusive plural in Korean** ("저희", "우리"); polite -습니다 endings in formal surfaces; -해요 endings in casual product surfaces.
- **No emoji** in product chrome. The system never uses emoji as iconography. (Emoji *do* appear inside user-generated content — comments, messages — but never as part of the brand language.)
- **No I, no you-jabbing.** Copy speaks to the user as "you" implicitly via verbs, not via second-person pronouns.

**Casing**

- **Title Case** for English headings ("Looking Forward", "Before Use", "Table of Contents", "In conclusion").
- **Sentence case** for descriptions and body.
- Korean uses no casing — but headings are heavier (Bold) and bodies are Medium.

**Examples lifted from source**

- > "We believe that open source is essential in making our work environment richer and more productive."
- > "If you have any issues, feel free to share your feedback in the comments."
- > "Install the fonts used in the Wanted Design System below to enable text editing"
- > "다양한 상황에서 일관된 목소리로 손쉽게 텍스트를 표시할 수 있습니다."

**Vibe:** Clear, even-keeled, slightly formal. The brand is the quiet utility that lets people find work — not the loud party host.

## VISUAL FOUNDATIONS

**Color**
- Built on a **cool-neutral grayscale** (CoolNeutral 100→0, with a slight bluish cast — `#F7F7F8 → #171719`) rather than pure neutrals. There's also a parallel pure Neutral scale.
- **Primary blue** is `#0066FF` (atomic-blue-50). Hover `#005EEB`, pressed `#0054D1`. This is *the* brand accent — used for links, primary CTAs, focus rings, and section-hint copy.
- **Status colors:** positive `#00BF40` (green), cautionary `#FF9200` (orange), negative `#FF4242` (red).
- **Accent palette:** 13 hues in 13 stops each — Lime, Green, Cyan, LightBlue, Blue, Violet, Purple, Pink, Red, RedOrange, Orange, Yellow.
- **Light theme (default).** Backgrounds are pure white or near-white (`#FFFFFF`, `#F7F7F8`, `coolNeutral-99`). Text is near-black (`#171719`) for primary, fading via opacity (61%, 28%) for secondary/disabled.
- **Dark theme** mirrors with `coolNeutral-15` backgrounds and white-with-opacity text.
- Color uses **opacity tokens**, not new hex values, to grade strength: `opacity-88, 61, 38, 22, 16, 8`. Same hue, less ink.

**Typography**
- **Primary face:** Pretendard JP (sans, supports Korean / English / Japanese). Wanted Sans appears as a secondary display face in marketing-flavored surfaces.
- **Mono:** SF Mono (small, used in tables / code values).
- **Scale (7 tiers, 18 steps):** Display 1 (56/72) → Display 2 (44/56) → Title 1–3 (28/26/24) → Heading 1–2 (22/20) → Body 1–3 (17/16/15) → Label 1–4 (14/13/12/11) → Caption 1–2 (12/11).
- **Weights used:** Bold (700), SemiBold (600), Medium (500), Regular (400). Bold is reserved for headings; body copy is Medium 500 — more presence than Regular but still readable.
- Line-heights are loose (~1.5 for body, ~1.33 for headings). Letter-spacing is *negative* on display sizes (`-0.027em` at 36px) and slightly *positive* on body (`+0.006em`).

**Spacing & layout**
- Containers use a **64px / 32px / 24px** rhythm — section padding 64px, card padding 64px, body gaps 24px.
- Mobile spec includes explicit **status-bar tokens** for iOS (notch, dynamic island, normal) and Android (gesture, button, notch).
- 12-column grid at desktop; safe-area-aware insets at mobile.
- Card borders are 1px `rgba(112,115,124,0.22)`. Tile chrome leans on this very thin neutral hairline.

**Backgrounds**
- **Predominantly white.** The brand does not lean on illustrations, gradients, or decorative imagery. White space is the dominant background.
- A faint cool-neutral fill (`coolNeutral-99`, `#F7F7F8`) is used for "elevated" sections — subtle differentiation, not contrast.
- No hand-drawn, no patterns/textures, no full-bleed photography in foundation. Photography appears only inside user content (avatars, job posts).

**Animation**
- **Restrained.** Modal transitions, sheet slides — typical iOS/Android system motion. No bounces, no flashy easing.
- Standard easings: ease-out for enters, ease-in for exits. Durations 150–300ms.

**Hover / press states**
- Hover: shifts to the next-darker token (e.g. `primary-normal #0066FF` → `primary-hover #005EEB`).
- Press: another tier darker (`primary-press #0054D1`).
- Disabled: 28% opacity on the base color.

**Borders**
- Single hairline: `1px rgba(112,115,124,0.22)` for line/normal.
- Stronger: `rgba(112,115,124,0.45)` for emphasis.
- Inverse: `rgba(255,255,255,0.22)` on dark surfaces.

**Shadows (elevation)**
- Five-tier elevation system, named `xsmall, small, medium, large, xlarge`. Two parallel sets exist: a "normal" set and a "strong" set with deeper alphas.
- Shadows are layered (2 stops typical): a tight shadow + a softer drop. Colors are `rgba(23,23,23, 0.06–0.12)` — black with low alpha, never blue.
- `xsmall: 0px 1px 2px -1px rgba(23,23,23,0.1)`
- `small: 0px 4px 6px -1px rgba(23,23,23,0.06), 0px 2px 4px -2px rgba(23,23,23,0.06)`
- `medium: 0px 10px 15px -3px rgba(23,23,23,0.07), 0px 4px 6px -2px rgba(0,0,0,0.07)`
- `large: 0px 16px 24px -6px rgba(23,23,23,0.08), 0px 6px 10px -4px rgba(23,23,23,0.08)`
- `xlarge: 0px 24px 38px -10px rgba(23,23,23,0.12), 0px 10px 15px -5px rgba(23,23,23,0.1)`

**Corner radii**
- Tokens go: `0, 4, 8, 12, 16, 20, 24, 32, 64`.
- **Cards:** 16px or 24px depending on level. **Buttons:** 8–12px. **Inputs:** 8px. **Modals / sheets:** 24–32px on mobile. **Avatars / pills:** fully circular.

**Cards**
- White background, 1px hairline border, 16–24px radius. Shadow only on elevation, otherwise borderless.
- Padding is generous — 24–32px inside.

**Transparency / blur**
- Used in **bottom sheets, status bars, app-bar protection gradients**. Backdrop-blur on glassmorphic surfaces (very iOS-flavored).
- Not used decoratively in the foundation — only for system chrome.

**Imagery**
- The system does not prescribe a strong photographic aesthetic. The few photos in source are placeholder/headshot/cover-style — natural, warm, not heavily filtered.
- Logos and brand chrome dominate over photography in foundation.

## ICONOGRAPHY

The system uses a **custom icon library** (≈100+ glyphs in the Figma file, e.g. `chevronRightTightSmall`, `check`, plus many more). The icons are SVG, rendered as `<img src="…">` references in the Figma reconstruction.

**Style**
- **Outlined, 24×24 grid**, ≈1.5–2px stroke. Geometric, slightly rounded line caps.
- Two-axis variants per glyph:
  - `Tight` (true / false) — tighter padding inside the bounding box
  - `Thick` (true / false) — heavier stroke
  - `Small` (true / false) — alternative 16/20px sizing
- Names are camelCase + suffix: `chevronRightTightSmall`, `chevronRightTightFalseThick`.

**Substitution**

The Figma file's icon SVGs are bound to opaque internal references and weren't usable as standalone files. **As a pragmatic substitute, this design system uses [Lucide](https://lucide.dev/) via CDN.** Lucide matches Wanted's outlined / 1.5–2px / rounded-cap style very closely. **This is a substitution — flagging it for the user to swap in real Wanted icon assets when they're available.**

Lucide is loaded in UI kits via:
```html
<script src="https://unpkg.com/lucide@latest"></script>
```

**Logos**
- Stored in `assets/logos/`. The Wanted logotype is a wordmark + symbol mark; the symbol mark is a stylized "W" / arrow.
- Light, Dark, White, and Black variants exist for every sub-brand (Wanted, Space, Gigs, LaaS, Agent, OneID, 채용 솔루션).

**Emoji**
- **Not used** in brand chrome, navigation, or buttons. They may appear inside user-generated content (chat messages, comments) but are never part of the design language itself.

**Unicode glyphs**
- Used minimally — chevrons, multiplication signs (×), and middle-dot (·) for separators. Not as primary iconography.

## CAVEATS

- **Icon set is substituted with Lucide.** The Figma's own icon SVGs are not in this kit; please attach the real `wanted-icons` package or sprite when available.
- **Pretendard JP** is loaded via the official Pretendard CDN (`@cactus.tools/pretendard-jp`). If you have offline TTFs you want bundled, drop them in `fonts/` and update `colors_and_type.css`.
- **Wanted Sans** display face is loaded via the public CDN. Same caveat.
- The bilingual copy in this README quotes the Figma file directly; any mistranslations are inherited from there.
