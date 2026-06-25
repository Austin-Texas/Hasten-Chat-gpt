# Upload Retry Next Step

## Current status

The upload retry flow now has these pieces:

- Queued upload storage.
- Queued upload context.
- Upload retry helper.
- Retry result summary helper.
- Retry action mapping helper.

## Next target

Add a small driver page notice that shows how many queued uploads retried and how many are still waiting.

## Recommended page

Start with:

```text
/driver/scan
```

## Manual QA

- Queue an upload while offline.
- Restore connection.
- Retry uploads.
- Confirm the driver sees a short success message.
- Confirm pending count decreases.
