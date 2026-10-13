---
name: wanted-design
description: Use this skill to generate well-branded interfaces and assets for Wanted (Wanted Lab — Korean recruiting platform), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Tokens:** `colors_and_type.css` — import this file (it imports webfonts) and you get every color, type, shadow, radius, and spacing token as a CSS custom property. Drop-in element styles for `h1`–`h5`, `p`, `a`, etc.
- **Logos:** `assets/logos/wanted-symbol.svg` (the W mark, monochrome — uses `currentColor`), `wanted-horizontal.svg` (full wordmark), plus LaaS / OneID variants.
- **Brand colors:** primary `#0066FF`, status `#00BF40 / #FF9200 / #FF4242`, label text `rgba(23,23,25,1)`, bg `#FFFFFF` with `#F7F7F8` alternative.
- **Type:** Pretendard JP (sans) for everything; Wanted Sans for marketing display; SF Mono for code.
- **Voice:** Bilingual (Korean primary, English parallel). Calm, professional, polite. No emoji in chrome.
- **Iconography:** Lucide via CDN (substitution — see README ICONOGRAPHY section). 1.5–2px outlined.

## UI kits to copy from

- `ui_kits/wanted-desktop/` — job-board home with TopNav, Hero, FilterBar, JobCard.
- `ui_kits/wanted-mobile/` — iOS-flavored home with AppBar, JobRow, TabBar.

When recreating Wanted UI, lift component classes from these kits rather than reinventing.
