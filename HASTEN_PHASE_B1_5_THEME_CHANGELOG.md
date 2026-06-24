# HASTEN Phase B1.5 — Enterprise Multi-Theme Mock + Toggle

## Goal
Add a clean enterprise-grade multi-theme system preview so Brian can see HASTEN in:

- Enterprise Dark
- Clean White
- Hybrid Glass
- Executive Graphite
- High Contrast Ops

## Files changed

- `src/lib/themeSkins.js`
  - Rebuilt theme presets around HASTEN enterprise visual direction.
  - Added `enterprise_dark`, `clean_white`, `hybrid_glass`, `executive_graphite`, and `high_contrast_ops`.
  - Replaced old orange-heavy theme preset behavior with green/blue enterprise styling.

- `src/hooks/useTheme.js`
  - Added skin preset class support.
  - Adds root classes like `skin-enterprise-dark`, `skin-clean-white`, and `skin-hybrid-glass`.
  - Adds `data-theme-skin` for future CSS targeting.
  - Keeps existing dark/light/system/high-contrast behavior.

- `src/index.css`
  - Added HASTEN Enterprise Multi-Theme Pack CSS variables.
  - Added card, button, shell, and pill utilities for consistent enterprise styling.
  - Supports dark, white, hybrid glass, and graphite design systems.

- `src/pages/ThemeShowcase.jsx`
  - Added a live theme preview page with toggle buttons.
  - Shows enterprise KPI cards, dispatch table, and driver mobile preview under each theme.

- `src/App.jsx`
  - Added `/theme-showcase` route.

- `src/components/HastenLayout.jsx`
  - Added Theme Showcase under Administration for admin/super_admin.
  - Added missing `Clock` import to prevent runtime error in Detention sidebar item.

- `src/components/admin/ThemeSkinPicker.jsx`
  - Updated active theme styling from orange to HASTEN green.

## Route added

- `/theme-showcase`

## How to view

Login as admin/super_admin, then open:

- Administration → Theme Showcase

or go directly to:

- `/theme-showcase`

## Build check

`npm run build` completed successfully after installing dependencies in the working environment.

## Notes

This phase adds theme preview/toggle capability and theme foundation only. It does not refactor every existing page to use the new theme utilities yet. Existing pages will continue to work with the updated CSS variables and ThemeSetting system.
