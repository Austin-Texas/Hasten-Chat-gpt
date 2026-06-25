# HASTEN Driver Mobile Release Checklist

Use this before packaging the driver experience for Android and iPhone.

## Core driver routes

- `/driver/dashboard`
- `/driver/loads`
- `/driver/scan`
- `/driver/messages`
- `/driver/profile`
- `/driver/profile/about-vehicle`
- `/driver/settlement-preview`

## Required checks

- Driver readiness card appears on dashboard.
- Driver can update equipment and compliance from About Vehicle.
- Offers are blocked until driver readiness is Ready.
- Decline still works even when not ready.
- Scan route opens from the raised center tab.
- Driver can see assigned loads after dispatcher creates a load.
- Settlement preview is visible to the driver.
- Mobile bottom nav remains: Home, Loads, Scan, Chat, Profile.

## Native app readiness

- Confirm camera access for Scan.
- Confirm photo/document upload from phone.
- Confirm push notification provider.
- Confirm background location/GPS strategy.
- Confirm privacy policy covers GPS, documents, and driver data.
- Confirm app icon and splash assets.
- Confirm Android package name and iOS bundle identifier.

## Store preparation

- Google Play developer account.
- Apple Developer account.
- App description.
- Screenshots.
- Privacy policy URL.
- Support email.
- Test login account for review.

## HASTEN rule

Do not publish until runtime tests pass on a real Android phone and iPhone simulator/device.
