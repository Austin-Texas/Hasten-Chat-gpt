# Sidebar Bid Review QA

## Purpose

Add a direct sidebar shortcut for dispatcher/admin access to `/dispatch/bid-review`.

## Apply locally

The sidebar file is large and may be blocked by connector rewrites. Run:

```bash
node scripts/applySidebarBidReview.mjs
```

Then commit:

```bash
git add src/components/HastenLayout.jsx
git commit -m "Add bid review to dispatch sidebar"
git push
```

## Check status

```bash
node scripts/checkSidebarBidReview.mjs
```

## Runtime checks

- Login as admin.
- Open sidebar > Dispatch.
- Confirm Bid Review appears below Marketplace.
- Login as dispatcher.
- Confirm Bid Review appears below Marketplace.
- Click Bid Review and confirm `/dispatch/bid-review` opens.
