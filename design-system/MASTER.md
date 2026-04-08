# Design System — LZX Pesca Dashboard
**Target:** B2B Sales CRM · Wholesale Fishing · Analytics Dashboard
**Version:** 1.0
**Last update:** 2026-04-08

---

## 1. Brand Foundation

**Identity:** LZX Equipamentos para Pesca — wholesale fishing gear distributor
**Audience:** Internal traffic managers, sales supervisors, executive stakeholders
**Tone:** Professional, premium, trustworthy, data-driven (not playful)
**Personality keywords:** Precision · Reliability · Heritage · Performance

---

## 2. Pattern: Dense Analytics Dashboard

```
┌──────────────────────────────────────────────────────────┐
│ STICKY HEADER: Logo · Title · Status · Filters · Actions │
├──────────────────────────────────────────────────────────┤
│ ACCOUNT/CONTEXT SELECTOR (chips)                         │
│ TAB BAR (Meta Ads · Instagram · GA4 · Google Ads)        │
├──────────────────────────────────────────────────────────┤
│ KPI CARD GRID (6–9 cards, primary metrics)               │
│ ────────────────────────────────────────────             │
│ HIGHLIGHT SECTION (WhatsApp / Conversion focus)          │
│ ────────────────────────────────────────────             │
│ TIME-SERIES CHART (toggleable metrics)                   │
│ ────────────────────────────────────────────             │
│ DETAIL TABLE (sortable, filterable, expandable rows)     │
└──────────────────────────────────────────────────────────┘
```

**Why this pattern:** B2B analytics users scan top-down — overview first, then drill into detail. KPI cards above the fold satisfy the "5-second glance" need; the table below supports investigation.

---

## 3. Color System

### Dark Theme (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1017` | Page background |
| `--surface` | `#1e2530` | Cards, header, tables |
| `--surface2` | `#252d3a` | Hover, secondary surfaces, inputs |
| `--surface3` | `#2c3547` | Tertiary, expanded rows |
| `--border` | `#2e3a4e` | Dividers, card borders |
| `--text` | `#f0ede8` | Primary text |
| `--text-muted` | `#8a95a8` | Labels, secondary text |
| `--gold` | `#c4a35a` | Brand, primary CTA, highlights |
| `--gold-light` | `#d4b878` | Hover state for gold |
| `--gold-dim` | `#8a6e35` | Disabled gold |

### Light Theme
| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f1eb` | Cream background |
| `--surface` | `#ffffff` | White cards |
| `--surface2` | `#f0ece4` | Hover |
| `--text` | `#1a1714` | Primary text |
| `--text-muted` | `#7a7060` | Secondary |
| `--gold` | `#8a6200` | Brand (saturated for contrast) |

### Semantic Colors
| Token | Dark | Light | Use |
|---|---|---|---|
| `--green` | `#88c800` | `#3d7a00` | Positive deltas, "Bom" badges |
| `--yellow` | `#f59e0b` | `#c47a00` | Warning, "Razoável" |
| `--red` | `#ee5a4a` | `#c0392b` | Critical, "Baixo", negative |
| `--cyan` | `#4aa8c0` | `#1a7a96` | Info, secondary metrics |
| `--purple` | `#a855f7` | `#7c3aed` | Instagram-related metrics |

**Contrast rule:** All text/background pairs must hit WCAG AA (4.5:1 minimum, 3:1 for large text).

---

## 4. Typography

**Font family:** `Rubik` (Google Fonts) — geometric sans, modern but warm
**Fallback stack:** `'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

| Role | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| H1 (page title) | 18–22px | 700 | 1.3 | -0.5px |
| H2 (section) | 14px | 700 | 1.4 | 0.05em (uppercase) |
| H3 (sub) | 12–13px | 600 | 1.4 | 0.05em (uppercase) |
| KPI value | 26px | 700 | 1 | -0.5px |
| KPI label | 13px | 500 | 1.4 | normal |
| Body | 13–14px | 400 | 1.5 | normal |
| Micro / caption | 11–12px | 500 | 1.4 | normal |
| Table header | 12px | 600 | 1 | normal (uppercase) |
| Table cell | 12–13px | 400 | 1.4 | normal |

**Section titles use uppercase + gold color** for hierarchy.

---

## 5. Spacing & Layout

**Base unit:** 4px
**Common steps:** 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40

| Token | Value | Use |
|---|---|---|
| Card padding | `18px 20px` | KPI cards |
| Card gap | `12px` | Grid between cards |
| Section gap | `24px` | Between major sections |
| Page padding | `24px` (desktop) / `16px 12px` (mobile) | Main content |
| Header height | `64px` | Sticky top bar |
| Border radius | `6px` (controls) / `10px` (cards) / `12px` (modals) |
| Max content width | `1400px` | Centered |

---

## 6. Components

### KPI Card
```
┌─────────────────────┐
│ LABEL          ICON │  ← 13px muted, icon 20px right
│ 1.234,56            │  ← 26px bold, color-coded
│ subtitle here       │  ← 12px muted (optional)
│ ─────────────────── │  ← optional divider
│ explanation text    │  ← 11px muted (for technical metrics)
└─────────────────────┘
```
**Rules:**
- Primary number always takes visual weight (26px / 700)
- Use semantic colors only when interpreting (green=good, red=bad), neutral otherwise
- Add `desc` line under technical metrics (CTR, CPC, CPM) — explain in plain language

### Tab Bar
- Underline indicator in `--gold` on active tab, transparent on inactive
- Active label: `--gold`, weight 700
- Inactive: `--text-muted`, weight 400
- 10px vertical padding, 18px horizontal

### Table (Campaign Detail)
- Header: `--surface2` background, uppercase 12px muted labels
- Rows: alternating `transparent` / `rgba(255,255,255,0.02)`
- Click-to-expand reveals recommendation panel with semantic icons (🔴🟡🟢💡)
- Sortable columns indicate state with `↓ ↑` arrows + gold color
- All numeric columns right-aligned

### Date Filter
- Trigger button looks like a chip with calendar icon + label + chevron
- Dropdown panel: 300px wide, presets row + custom date inputs
- On mobile: dropdown opens from left to avoid screen overflow

### Buttons
| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary (gold) | `--gold` | `#1a1500` | none | Main CTAs (Generate Report) |
| Secondary | `--surface2` | `--text` | `--border` | Toggles, filters |
| Ghost | `transparent` | `--text-muted` | `--border` | Close, dismiss |
| Danger | `--red` (10% bg) | `--red` | `--red` (30%) | Destructive |

**All buttons:** 6px radius, 500–700 weight, `cursor: pointer`, focus ring required.

### Charts (Recharts)
- Grid: `strokeDasharray="3 3"`, color `--border`
- Axes: tick color `--text-muted`, no axis line on Y, hide tick lines
- Lines: 2px stroke, no dots, `activeDot={{ r: 4 }}`
- Tooltip: `--surface2` background, `--border` border, 6px radius
- Color cycle: gold → purple → cyan → green → yellow → red

### Status Badges
```
● Conectado     (green tinted bg, green text, green border 30%)
● Desabilitada  (red tinted)
● Em Revisão    (yellow tinted)
```
- Padding: `4px 10px`, radius 6px, font 12px / 600
- Always lead with `●` dot for visual scan

---

## 7. Iconography

**Strategy:** Mix emoji (for KPI cards / exec reports) + Lucide icons (for controls)
- **Why emoji on KPIs:** universally legible, no extra dependency, friendly for non-technical viewers (supervisors)
- **Why Lucide on controls:** sharper, monochrome, theme-aware

**Reserved emoji map:**
- 💰 money/spend · 👁 impressions · 🖱 clicks · 📡 reach · 📊 CTR · 💳 CPC
- 📣 CPM · 💬 messages · 🛒 purchases · 👥 followers · 📸 Instagram
- ✅ good · 🟡 warning · 🔴 critical · 💡 info · 🚀 scale

---

## 8. Effects & Motion

| Property | Value |
|---|---|
| Transition default | `all 0.15s` |
| Theme switch | `background 0.2s, color 0.2s` |
| Hover lift | None (flat design — use border/bg color shift instead) |
| Border hover | `var(--border)` → `var(--gold)` |
| Modal backdrop | `rgba(0,0,0,0.7)` |
| Card shadow | None on cards (use border) — modals use `0 8px 32px rgba(0,0,0,0.4)` |

**Respect** `prefers-reduced-motion: reduce` — all transitions become instant.

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | `< 600px` | Hide header subtitle, hide button labels, reduce padding to 12px, stack cards single column, table scrolls horizontally |
| Tablet | `600–1024px` | 2-column card grid, normal header |
| Desktop | `> 1024px` | Full layout, max 1400px centered |

---

## 10. Accessibility Checklist

- [ ] Color contrast ≥ 4.5:1 for body text in both themes
- [ ] All interactive elements have visible `:focus` states
- [ ] All buttons / links have `cursor: pointer`
- [ ] Tables use `<th>` for headers and right-align numbers
- [ ] Charts include `<title>` / aria-label for screen readers
- [ ] Theme preference persists in `localStorage`
- [ ] Forms use real `<label>` or aria-label
- [ ] No information conveyed by color alone (always pair with icon + label)
- [ ] Text scales to 200% without breaking layout

---

## 11. Anti-Patterns (DO NOT)

❌ **AI-style purple/pink gradients** — wrong vibe for B2B financial dashboards
❌ **Glassmorphism / heavy blur** — distracts from data
❌ **Decorative animations on numbers** — distracts during scanning
❌ **Stock fishing photography backgrounds** — undermines professionalism
❌ **More than 3 emoji per card** — feels playful, not executive
❌ **Tooltips for primary information** — supervisors won't hover
❌ **Centered numeric tables** — always right-align money/counts
❌ **Vague labels like "Performance"** — name the metric explicitly
❌ **Hiding critical errors in modals** — show inline at the top
❌ **Replacing native date inputs with custom widgets on mobile** — keep system date picker

---

## 12. Pre-Delivery Checklist

When shipping any new screen / component:

- [ ] Works in both light and dark themes
- [ ] Renders without errors when data is empty (shows zeros, not nothing)
- [ ] Renders correctly at 375px width
- [ ] All click targets ≥ 36×36px
- [ ] Loading state present (`⏳ Carregando...`)
- [ ] Error state present (red banner with action hint)
- [ ] Numbers formatted with `pt-BR` locale (`1.234,56`)
- [ ] Currency uses `R$` prefix
- [ ] Dates use `date-fns` with `ptBR` locale
- [ ] Technical metrics include plain-language description
- [ ] PDF export branded (gold + dark header, footer credit)
- [ ] No console warnings

---

## 13. Content Voice

**Two registers depending on audience:**

**Technical (Gestor de Tráfego):**
> "CTR 1.85% — abaixo do ideal de 2%. Ajustar criativo do conjunto X."

**Executive (Supervisores):**
> "De cada 100 pessoas que viram o anúncio, 1.85 clicaram. Considere ajustar o anúncio."

**Always in Portuguese (pt-BR).** Avoid English jargon when a clear PT term exists. Use English only for industry-standard acronyms (CTR, CPC, ROAS) — and always pair with explanation.

---

_End of MASTER.md_
