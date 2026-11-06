---
name: FinVault Design System
colors:
  surface: '#f5faff'
  surface-dim: '#c8dded'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf5ff'
  surface-container: '#def0ff'
  surface-container-high: '#d6ebfb'
  surface-container-highest: '#d0e5f6'
  on-surface: '#081e29'
  on-surface-variant: '#3d4946'
  inverse-surface: '#1f333f'
  inverse-on-surface: '#e4f3ff'
  outline: '#6d7a76'
  outline-variant: '#bcc9c5'
  surface-tint: '#006b5d'
  primary: '#00685b'
  on-primary: '#ffffff'
  primary-container: '#008373'
  on-primary-container: '#f4fffb'
  inverse-primary: '#65dac4'
  secondary: '#466273'
  on-secondary: '#ffffff'
  secondary-container: '#c6e4f8'
  on-secondary-container: '#4a6677'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#83f6e0'
  primary-fixed-dim: '#65dac4'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005046'
  secondary-fixed: '#c9e7fb'
  secondary-fixed-dim: '#adcbde'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#2e4a5a'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f5faff'
  on-background: '#081e29'
  surface-variant: '#d0e5f6'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Be Vietnam Pro
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  currency-body:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system expresses a balance between consumer-friendly accessibility and international institutional discipline. Crafted specifically for Vietnamese financial life, it synthesizes the intuitive speed of modern domestic digital wallets with the clarity and typographic poise of global remittance tools.

### Core Character & Audience
- **Tone:** Grounded, pristine, dependable, and warm without being frivolous.
- **Audience:** Contemporary Vietnamese digital consumers, urban professionals, and cross-border freelancers demanding high clarity and zero ambiguity in transactional workflows.
- **Aesthetic Direction:** Modern Minimalist Fintech with tactile depth. The visual structure relies on a cool, luminous background canvas, monolithic pure-white container cards, gentle hairline borders, and targeted emerald-teal accents that instill composure during high-stakes financial interactions.

## Colors

The palette is engineered for prolonged readability, financial state distinction, and contrast compliance (WCAG 2.1 AA/AAA standards).

### Primary Brand Elements
- **Brand Teal (`#0F9D8A`):** Anchors core actions, balance cards, and verified indicators.
- **Brand Teal Interactive (`#0C8272`):** Active and pressed states.
- **Brand Teal Soft (`#E6F6F4`):** Icon badges, chip backgrounds, and highlighted balance rows.

### Text & Neutrals
- **Text Deep Navy (`#0B2B3A`):** Primary text and prominent account balance displays. Provides crisp contrast against pure white backgrounds.
- **Text Slate Secondary (`#5A6E7C`):** Microcopy, timestamps, subtitles, and input labels.
- **Canvas Canvas Light (`#F7F9FC`):** The ambient light foundation that reduces glare and frames card containers.
- **Border Subtle (`#E2E8F0`):** Hairline structure for containers, form inputs, and dividers.

### Financial Status Roles
- **Inflow / Success:** Positive financial credit (`#10B981`) paired with light wash (`#E7F9F0`).
- **Outflow / Destructive:** Debits, payment deductions, and errors (`#EF4444`) paired with alert tint (`#FEECEB`).
- **Pending / Warning:** Escrow, pending transfers, and verification warnings (`#F59E0B`) paired with amber wash (`#FEF7E7`).

## Typography

The type hierarchy leverages **Be Vietnam Pro** across all typographic levels. Designed specifically for Vietnamese glyph dynamics, it ensures clean diacritic placement without baseline clipping or awkward accent collisions.

### Financial Figures & Currency
- Monetary values must use tabular numerals (`tnum`) and proportional lining features to ensure ledger scans align cleanly down decimal columns.
- The Vietnamese đồng symbol (`đ`) or ISO code (`VND`) must share the exact weight and optical size of the adjacent integer, separated by standard Vietnamese thousands separators (dots: `1.250.000đ`).
- Primary balance displays utilize `currency-display` or `display-lg`, while inline transfer rows employ `currency-body`.

## Layout & Spacing

A disciplined 8pt grid structures screen composition.

### Screen Adaptations
- **Mobile (< 640px):** Single-column fluid view with `1rem` (16px) margins and gutters. Balance cards and transactional actions span 100% of available width to ensure large thumb target regions.
- **Tablet (640px - 1024px):** 8-column layout with `1.5rem` (24px) margins and gutters. Account overviews and action matrices split into dual panels.
- **Desktop (> 1024px):** 12-column fixed-max layout centered at `1200px` max-width with `3rem` margins and `2rem` gutters. Left panel holds identity and aggregated balances; right panel displays statement data tables and flow controls.

## Elevation & Depth

This system discards heavy drop shadows in favor of ambient low-opacity diffuse projections tinted with dark navy slate (`#0B2B3A`).

### Elevation Levels
- **Canvas Base (Level 0):** `#F7F9FC` background canvas. Flat, resting layer.
- **Card Monolith (Level 1):** Solid white (`#FFFFFF`) surfaces elevated by a border hairline (`1px solid #E2E8F0`) and an ambient shadow: `box-shadow: 0 4px 20px -2px rgba(11, 43, 58, 0.05)`. Used for account cards, quick-action clusters, and transaction histories.
- **Floating Overlays & Popovers (Level 2):** Elevated interactive components (e.g., OTP entry sheets, context menus, action sheets): `box-shadow: 0 10px 30px -4px rgba(11, 43, 58, 0.10)`.
- **Modals & Drawers (Level 3):** Modal sheets with background dimming: `box-shadow: 0 20px 48px -6px rgba(11, 43, 58, 0.16)`. Accompanied by a `rgba(11, 43, 58, 0.4)` backdrop blur overlay (`backdrop-filter: blur(4px)`).

## Shapes

The design system uses a balanced rounded geometry to create friendly, ergonomic touch targets without compromising institutional structure.

### Corner Radius Mapping
- **Base Components (`rounded` / 0.5rem / 8px):** Small badges, pills, nested list icon backplates, and selection inputs.
- **Interactive Action Targets (12px / 0.75rem):** Form inputs, dropdown selectors, and primary/secondary button containers.
- **Primary Structural Containers (`rounded-lg` / 1rem / 16px):** Balance cards, payment summary boxes, transaction rows, and modal dialogs.
- **Pills (`rounded-full` / 9999px):** Filter tags, transactional state markers, and quick-amount chips.

## Components

### Buttons
- **Primary Action Button:** Minimum touch height of 48px (52px on mobile native viewports). Solid Brand Teal (`#0F9D8A`), white semi-bold text, 12px border radius. Interactive state transitions to `#0C8272`. Disabled state: `#E2E8F0` background with `#5A6E7C` text.
- **Secondary Outlined Button:** 48px height, 12px border radius. Transparent background with a `1.5px solid #0F9D8A` border and `#0F9D8A` text. Active state fills with `#E6F6F4`.
- **Tertiary / Ghost Button:** Transparent background, `#0B2B3A` text with subtle teal hover highlight.

### Cards & Containers
- Cards are rendered with pure white backgrounds (`#FFFFFF`), a uniform 16px radius, a continuous 1px `#E2E8F0` border, and Level 1 ambient navy shadow.
- Inner padding follows a strict 16px (`space-md`) on mobile and 24px (`space-lg`) on desktop.
- Account balance headers apply high-contrast deep navy text (`#0B2B3A`) with primary balances rendered in bold tabular type.

### Input Fields & Selectors
- Height: 50px with a 12px corner radius.
- Background: `#FFFFFF`. Border: `1.5px solid #E2E8F0`.
- Focus State: Border transitions to `#0F9D8A` with a 3px outward glow of `#0F9D8A1A`.
- Prefix/Suffix Currency Labels: Right-aligned currency symbols (`VND`) or bank selector glyphs rendered in `#5A6E7C`.

### Transaction Lists & Activity Rows
- Single item rows have a minimum tap height of 64px.
- Left-aligned icon wrapper: 40px circle or 10px rounded square using light status tints (`#E6F6F4`, `#E7F9F0`, or `#FEECEB`).
- Right-aligned value: Outflows show leading negative signs (`- 250.000đ`) in `#0B2B3A`; inflows show positive signs (`+ 1.500.000đ`) in `#10B981`.

### Status Badges & Chips
- Status markers utilize fully rounded pill containers (`rounded-full`) with a vertical padding of 4px and horizontal padding of 12px.
- Inflow/Completed: Green text `#10B981` on background `#E7F9F0`.
- Outflow/Cancelled: Red text `#EF4444` on background `#FEECEB`.
- Pending/Escrow: Amber text `#F59E0B` on background `#FEF7E7`.

### Iconography
- Clean 1.5px - 2px stroke outline geometry on a 24x24px grid. 
- Avoid heavy solid fills except within active bottom navigation tabs or confirmed transaction badges.