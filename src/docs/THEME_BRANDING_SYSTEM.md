# HASTEN Theme & Branding System

## Overview

The HASTEN theme and branding system provides comprehensive UI customization without subscription/billing complexity. Admin users can:
- Select from 8 professional theme skins
- Fine-tune glassmorphism, transparency, shadows, and borders
- Upload and manage company logos and branding
- Control section visibility per role

---

## Theme Skins (Presets)

### Available Skins

| Skin ID | Name | Description | Accent Color |
|---------|------|-------------|--------------|
| `hasten_dark_glass` | HASTEN Dark Glass | Enterprise dark with high glass morphism | #EA580C (Orange) |
| `hasten_light_glass` | HASTEN Light Glass | Professional light with soft glass | #EA580C (Orange) |
| `midnight_blue` | Midnight Blue | Deep blue dark theme | #06B6D4 (Cyan) |
| `black_gold` | Black & Gold | Luxury minimalist theme | #EAB308 (Gold) |
| `corporate_gray` | Corporate Gray | Professional business gray | #3B82F6 (Blue) |
| `emerald_fleet` | Emerald Fleet | Green eco-friendly theme | #10B981 (Emerald) |
| `apple_transparent` | Apple Transparent | Clean minimalist transparent | #000000 (Black) |

### Skin Configuration

Each skin controls:
- `theme_mode` - "dark", "light", or "system"
- `accent_color` - Primary brand color
- `glassmorphism_intensity` - "off", "low", "medium", "high"
- `card_transparency` - "solid", "soft", "clear"
- `gloss_highlight` - "off", "subtle", "strong"
- `shadow_level` - "low", "medium", "high"
- `border_style` - "thin", "rounded", "pill"
- `button_style` - "gradient", "solid", "ghost"

---

## UI Controls (Advanced Customization)

Admins can fine-tune skins via the "Advanced UI Controls" panel:

### Glassmorphism Intensity
- **Off**: Solid cards, no blur effect
- **Low**: Minimal backdrop blur (5px)
- **Medium**: Standard blur (10px blur) with 40% opacity
- **High**: Strong glass effect (15px blur) with 30% opacity

### Card Transparency
- **Solid**: 100% opaque cards
- **Soft**: 70% opacity, readable on any background
- **Clear**: 40% opacity, see-through glass cards

### Gloss Highlight
- **Off**: No shine/gloss effect
- **Subtle**: Light 1px inner border highlight
- **Strong**: Bold gloss effect with bright highlight

### Shadow Level
- **Low**: `shadow-sm` - minimal depth
- **Medium**: `shadow-md` - standard depth
- **High**: `shadow-2xl` - dramatic depth, for critical UI

### Border Style
- **Thin**: `rounded-lg` - tight corners (8px)
- **Rounded**: `rounded-xl` - standard corners (12px)
- **Pill**: `rounded-full` - maximally rounded (99px)

---

## Company Branding Settings

### Fields

All stored in the `Branding` entity:

| Field | Type | Purpose |
|-------|------|---------|
| `company_display_name` | String | Main company name (e.g., "HASTEN") |
| `company_tagline` | String | Subtitle (e.g., "Freight & Transport") |
| `support_email` | Email | Customer support contact |
| `support_phone` | String | Support phone number |
| `brand_accent_color` | Hex Color | Primary brand color |
| `logo_light` | File URL | Light-theme logo |
| `logo_dark` | File URL | Dark-theme logo |
| `logo_mode` | Enum | "light", "dark", or "automatic" |
| `app_icon` | File URL | App icon (iOS/Android) |

### Logo Auto-Sizing Rules

When logos are uploaded:
1. **Sidebar Logo** - Auto-sized to 32px height in top-left
2. **Mobile Header** - Auto-sized to 28px height
3. **Login Screen** - Auto-sized to 48px height
4. **PDF/Invoice Header** - Auto-sized to 60px height
5. **Auto-switching** - If `logo_mode` is "automatic", light logo appears in dark theme, dark logo in light theme

---

## Section Hover Descriptions

### Feature

Every major module card displays a description on hover (desktop) or info icon (mobile/tablet).

### Descriptions Available For

| Section | Description |
|---------|------------|
| `dashboard` | View fleet status, active loads, revenue trends, and real-time KPIs. |
| `dispatch` | Assign loads, monitor drivers, update statuses, and manage daily operations. |
| `loads` | Create, track, and manage freight loads across all operations. |
| `fleet_manager` | Monitor trucks, maintenance, compliance, tracking, and fleet expenses. |
| `fleet` | Manage truck inventory, status, and operational details. |
| `drivers` | Manage driver profiles, licenses, certifications, and compliance documents. |
| `maintenance` | Schedule and track maintenance, manage service intervals and alerts. |
| `compliance` | Monitor driver and truck documents, expirations, alerts, and lockouts. |
| `safety` | Track safety violations, incidents, scores, and compliance status. |
| `tracking` | Live GPS tracking, route visualization, and real-time location updates. |
| `crm` | Manage clients, brokers, contacts, and business relationships. |
| `finance` | Track invoices, payroll, expenses, taxes, and profitability. |
| `payroll` | Manage driver compensation, tax profiles, and payment processing. |
| `expenses` | Track and approve fuel, maintenance, and operational expenses. |
| `invoices` | Generate, send, track, and manage customer invoices. |
| `documents` | Manage driver documents, compliance files, and proof of delivery. |
| `messages` | Internal communication between dispatch, drivers, and support teams. |
| `support` | Support tickets, customer inquiries, and issue resolution. |
| `notifications` | System alerts, notifications, and real-time event updates. |
| `analytics` | Performance reports, analytics dashboards, and business insights. |
| `settings` | Control users, permissions, visibility, themes, branding, and preferences. |
| `security` | Security dashboard, audit logs, and access control. |
| `audit_logs` | System audit trail of all administrative and sensitive actions. |

### Usage

Wrap section headers/cards with `<SectionHoverDescription sectionId="dispatch">`:

```jsx
<SectionHoverDescription sectionId="dispatch">
  <h2>Dispatch Board</h2>
</SectionHoverDescription>
```

Shows info icon on hover (desktop) or on tap (mobile).

---

## Section Block Layout Control

Using the existing `PortalVisibility` entity, admins can show/hide entire sections/blocks:

### Affected Areas

- Dashboard cards (KPI cards, charts, tables)
- Fleet Manager sections (fleet status, alerts, financial)
- Finance sections (payroll, invoices, expenses)
- Driver app tabs (loads, earnings, compliance, etc.)
- Client/broker portal tabs (tracking, invoices, support)
- Settings sections (users, roles, visibility, theme, audit)

### How It Works

1. Admin visits Settings → Visibility tab
2. Select a role (e.g., "dispatcher")
3. Toggle visibility for each section (eye icon)
4. Sections hidden from that role's view

Controlled by `PortalVisibility` entity with fields:
- `is_visible` - Boolean to show/hide
- `role` - Target user role
- `section` - Section identifier
- `portal_type` - Admin, dispatcher, driver, client, etc.

---

## Implementation Details

### Files Created

- `lib/themeSkins.js` - Theme skin presets and UI helpers
- `lib/brandingDefaults.js` - Default branding settings & section descriptions
- `components/admin/ThemeSkinPicker.jsx` - Skin selection UI
- `components/admin/UIControlsPanel.jsx` - Advanced controls UI
- `components/admin/BrandingPanel.jsx` - Logo & branding upload
- `components/SectionHoverDescription.jsx` - Reusable hover description component
- `entities/Branding.json` - Branding data entity

### Entity: ThemeSetting

Extended with new fields:
- `card_transparency` - Soft/Clear/Solid
- `gloss_highlight` - Off/Subtle/Strong
- `shadow_level` - Low/Medium/High
- `border_style` - Thin/Rounded/Pill
- `button_style` - Gradient/Solid/Ghost

### Entity: Branding

New entity for company branding:
- `company_display_name`, `company_tagline`
- `support_email`, `support_phone`
- `brand_accent_color`
- `logo_light`, `logo_dark`, `logo_mode`
- `app_icon`

---

## Future Notes

### NOT Implemented (Intentionally Deferred)

- ❌ Subscriptions / Multi-tenant billing
- ❌ SaaS marketplace / Plan selection
- ❌ Payment plans
- ❌ Usage limits per tier

These are outside scope and can be added as Phase 2 if business requires.

---

## Summary

| Feature | Status | Location |
|---------|--------|----------|
| Theme Skins (8 presets) | ✅ Done | Admin → Theme tab |
| UI Controls (glass, shadow, border) | ✅ Done | Admin → Theme → Advanced UI |
| Logo Upload & Auto-Sizing | ✅ Done | Admin → Theme → Branding |
| Logo Mode (auto-switch) | ✅ Done | Branding Panel |
| Company Branding Settings | ✅ Done | Admin → Theme → Branding |
| Section Hover Descriptions | ✅ Done | SectionHoverDescription component |
| Section Visibility Control | ✅ Done | Via PortalVisibility entity |
| Subscriptions | ❌ Deferred | Phase 2 if needed |
| Multi-tenant Billing | ❌ Deferred | Phase 2 if needed |