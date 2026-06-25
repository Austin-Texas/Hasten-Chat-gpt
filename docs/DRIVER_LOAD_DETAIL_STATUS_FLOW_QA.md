# Driver Load Detail Status Flow QA

## Purpose

Use the shared status-flow helper in `DriverLoadDetail.jsx` so drivers can only move one load status step at a time.

## Apply locally

```bash
node scripts/applyDriverLoadStatusFlow.mjs
```

Or run the full patch runner:

```bash
node scripts/applyRecommendedPatches.mjs
```

## Check wiring

```bash
node scripts/checkDriverLoadStatusFlowWiring.mjs
node scripts/verifyDriverLoadStatusFlow.mjs
```

## Runtime checks

- Open `/driver/loads/:id`.
- Confirm the action button moves only to the next valid status.
- Confirm status skipping is not possible from the UI.
- Confirm completed loads do not show a next action.
- Confirm the progress bar still updates as status changes.
