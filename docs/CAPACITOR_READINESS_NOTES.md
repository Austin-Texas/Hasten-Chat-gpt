# Capacitor Readiness Notes

## Goal

Use the existing HASTEN web driver surface as the base for Android and iPhone apps.

## Recommended order

1. Finish driver web/mobile hardening.
2. Run the recommended patch runner.
3. Run helper verification.
4. Run production build.
5. Add Capacitor config and native folders.
6. Test Android first.
7. Test iPhone after Android is stable.

## Current driver app surface

- Dashboard
- Loads
- Load Detail
- Scan
- Messages
- Profile
- Settlement Preview

## Native features to validate

- Camera upload
- File/photo upload
- Offline pending upload retry
- Push notification plan
- GPS/current location plan
- Login/session persistence

## Status command

```bash
node scripts/reportNativePackagingStatus.mjs
```
