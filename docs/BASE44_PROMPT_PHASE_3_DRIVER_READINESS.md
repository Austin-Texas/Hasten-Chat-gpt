# Base44 Prompt — Phase 3 Driver Readiness Wiring

Use this prompt inside Base44 if direct GitHub patching of `src/pages/driver/DriverProfile.jsx` is risky because the page already contains photo upload, status picker, logout, and delete-account modals.

---

## Prompt

Continue HASTEN Cargo LLC Phase 3. Do not rebuild the Driver Profile page. Only wire the existing new helper/component into the current page.

Files already added:

```text
src/lib/driverReadiness.js
src/components/driver/DriverReadinessCard.jsx
```

### 1. Import DriverReadinessCard

In `src/pages/driver/DriverProfile.jsx`, add:

```js
import DriverReadinessCard from "@/components/driver/DriverReadinessCard";
```

### 2. Render card under profile hero

In the returned JSX, place this immediately after the Profile Hero card and before Availability Status:

```jsx
<DriverReadinessCard user={user} driver={driver} truck={truck} />
```

### 3. Keep all existing behavior

Do not remove or rewrite:

- profile photo upload
- availability status picker
- edit button
- My Documents link
- About Vehicle link
- HOS Monitor link
- logout modal
- delete account modal

### 4. Expected UI

Driver Profile should show a new readiness card with:

- Ready / Needs Review / Needs Setup
- Equipment type
- Compliance status
- Payload
- Availability
- Missing requirements chips

### 5. Runtime proof

After patching, test:

```text
/driver/profile
```

Expected:

- Page still opens.
- Existing status picker still works.
- Existing profile photo upload still opens.
- Driver readiness card appears below the profile hero.
- If driver is missing license/insurance/W-9/contract/compliance, the card shows missing items.

---

## Why this matters

This starts Phase 3 without risking existing driver profile functionality. The readiness logic will later be reused by:

- Driver Offers
- Dispatch matching
- Compliance alerts
- Admin driver detail
- Onboarding pipeline
