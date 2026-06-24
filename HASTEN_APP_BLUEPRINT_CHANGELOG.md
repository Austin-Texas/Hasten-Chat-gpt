# HASTEN App Blueprint Update

## Goal
Updated the repository to include the enterprise dashboard + driver app structure shown in the latest mockup direction.

## New Page
- `src/pages/AppBlueprint.jsx`

## New Route
- `/app-blueprint`

## Sidebar
Added under:
- Administration → App Blueprint

Visible to:
- `admin`
- `super_admin`

## What the page demonstrates
- Enterprise web dashboard layout
- Driver mobile app structure
- Bottom nav: Home / Loads / Scan / Chat / Profile
- Premium dark UI
- Clean white UI
- Hybrid glass UI
- Theme toggle interaction
- KPI cards
- Load status chart
- Live tracking map preview
- Recent activity
- Driver quick actions
- Mobile load detail preview
- Mobile tracking preview
- Theme option cards

## Files Changed
- `src/App.jsx`
- `src/components/HastenLayout.jsx`
- `src/pages/AppBlueprint.jsx`

## Build
`npm run build` completed successfully after installing dependencies locally for validation.

## Notes
This update does not remove or rebuild existing production pages. It adds a controlled design/structure preview page so the new direction can be reviewed before deeper refactoring into production dashboards.
