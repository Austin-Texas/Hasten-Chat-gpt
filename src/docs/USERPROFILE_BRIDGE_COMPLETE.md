# UserProfile Bridge — Complete Implementation
**Date:** June 21, 2026  
**Status:** ✅ IMPLEMENTED & TESTED

---

## ARCHITECTURE

### Entity Bridge: Auth → Business

```
Auth User (Base44)
    ↓
UserProfile (link entity)
    ↓ linkedDriverId
    ↓ linkedContractorId
    ↓ linkedDispatcherId
    ↓ linkedBrokerId
    ↓ linkedClientId
    ↓ linkedPaymentProfileId
    ↓
Business Entities
```

---

## ENTITIES CREATED

### 1. UserProfile Entity
**File:** `entities/UserProfile.json`

Bridge between auth users and business entities.

**Key Fields:**
- `authUserId` — Auth user ID (unique link to User)
- `businessRole` — Driver, Dispatcher, Broker, Client, Finance, etc.
- `linkedDriverId` — If driver
- `linkedContractorId` — If driver
- `linkedDispatcherId` — If dispatcher
- `linkedBrokerId` — If broker
- `linkedClientId` — If client
- `linkedPaymentProfileId` — If driver
- `lastLogin` — Timestamp of last login
- `lastLoginStatus` — Current status (available, on_duty, offline)

---

## FUNCTIONS UPDATED

### 1. createUserProfile.js (Enhanced)

**Workflow on invite:**

1. User invited with businessRole (e.g., "driver")
2. Auth user created with role="user" (or "admin")
3. **Always create UserProfile bridge:**
   ```javascript
   const userProfile = await base44.asServiceRole.entities.UserProfile.create({
     authUserId: user_id,
     email,
     fullName: full_name,
     businessRole: role,
     active: true
   });
   ```

4. **Role-based profile creation:**
   - **Driver:** Creates Driver + ContractorProfile + ContractorChecklist + ContractorPaymentProfile
   - **Dispatcher:** Creates Dispatcher profile
   - **Broker:** Creates Broker profile
   - **Client:** Creates Client profile

5. **Link all IDs back to UserProfile:**
   ```javascript
   await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
     linkedDriverId: driver.id,
     linkedContractorId: contractor.id,
     linkedPaymentProfileId: paymentProfile.id
   });
   ```

**Test Result:** ✅ Passed
- UserProfile created
- linkedDriverId populated
- linkedContractorId populated
- linkedPaymentProfileId populated

### 2. handleUserLogin.js (New)

**Called on every login via AuthContext.**

**Workflow:**

1. Find UserProfile by authUserId
2. If not found, create it (ensures bridge exists)
3. Update lastLogin timestamp
4. **Driver status automation:**
   - Check if driver has active load
   - If yes: status = "on_load"
   - If no: status = "available"
5. Return routing destination based on businessRole

**Routing Map:**
```javascript
{
  admin: '/dashboard',
  dispatcher: '/dispatch',
  driver: '/driver/dashboard',
  finance: '/finance',
  broker: '/crm',
  client: '/client/dashboard',
  // ... other roles
}
```

**Test Result:** ✅ Passed
- UserProfile found/created
- lastLogin updated
- Routing destination returned

---

## INTEGRATION POINTS

### AuthContext.jsx (Updated)

On user authentication:
```javascript
const checkUserAuth = async () => {
  const currentUser = await base44.auth.me();
  
  // Trigger login-time updates
  await base44.functions.invoke('handleUserLogin', {});
  
  setUser(currentUser);
  setIsAuthenticated(true);
};
```

This ensures:
- UserProfile is linked to auth user
- Driver status is updated on login
- Correct routing is calculated

---

## VERIFICATION DASHBOARD

**Route:** `/admin/verify-users`

**Tests all 10 scenarios:**

1. ✅ Auth users created
2. ✅ UserProfile created
3. ✅ businessRole saved
4. ✅ Driver profile linked
5. ✅ Contractor profile linked
6. ✅ Payment profile created
7. ✅ Driver login routes correctly
8. ✅ Contractor management shows records
9. ✅ Settlement dropdown shows drivers
10. ✅ Dispatch board shows driver status

All tests can be run from the verification dashboard with detailed results.

---

## WORKFLOW EXAMPLE: INVITE DRIVER

### 1. Admin invites driver@example.com

**Input:**
```javascript
{
  full_name: "John Driver",
  email: "driver@example.com",
  businessRole: "driver"
}
```

### 2. System processes invite

**Step 1:** Map business role to auth role
```javascript
const authRole = "driver" === "admin" ? "admin" : "user";
// authRole = "user"
```

**Step 2:** Create auth user
```javascript
const invitedUser = await base44.users.inviteUser(
  "driver@example.com",
  "user"  // ← Auth role
);
// User ID: xyz123
```

**Step 3:** Create UserProfile bridge
```javascript
const userProfile = await base44.asServiceRole.entities.UserProfile.create({
  authUserId: "xyz123",
  email: "driver@example.com",
  fullName: "John Driver",
  businessRole: "driver",  // ← Business role
  active: true
});
```

**Step 4:** Create business entities
```javascript
// Driver
const driver = await base44.asServiceRole.entities.Driver.create({
  user_id: "xyz123",
  email: "driver@example.com",
  status: "available"
});

// ContractorProfile
const contractor = await base44.asServiceRole.entities.ContractorProfile.create({
  driver_id: driver.id,
  user_id: "xyz123",
  email: "driver@example.com",
  status: "prospect"
});

// ContractorPaymentProfile
const paymentProfile = await base44.asServiceRole.entities.ContractorPaymentProfile.create({
  driver_id: driver.id,
  legal_business_name: "John Driver"
});
```

**Step 5:** Link all IDs to UserProfile
```javascript
await base44.asServiceRole.entities.UserProfile.update(userProfile.id, {
  linkedDriverId: driver.id,
  linkedContractorId: contractor.id,
  linkedPaymentProfileId: paymentProfile.id
});
```

### 3. Driver logs in

**Step 1:** handleUserLogin called
```javascript
const userProfile = await base44.asServiceRole.entities.UserProfile.filter(
  { authUserId: "xyz123" }
);
// Found: UserProfile with linkedDriverId = driver123
```

**Step 2:** Update driver status
```javascript
const driver = await base44.asServiceRole.entities.Driver.get("driver123");
// Check for active loads
const activeLoads = await base44.asServiceRole.entities.Load.filter({
  driver_id: "driver123",
  status: { $in: ['assigned', 'accepted', 'en_route', ...] }
});

// Set status based on loads
if (activeLoads.length > 0) {
  await base44.asServiceRole.entities.Driver.update("driver123", {
    status: "on_load"
  });
} else {
  await base44.asServiceRole.entities.Driver.update("driver123", {
    status: "available"
  });
}
```

**Step 3:** Return routing
```javascript
return {
  redirectUrl: "/driver/dashboard",  // ← Based on businessRole="driver"
  userProfile: { ... }
};
```

### 4. UI updates

**Contractor Management:** Shows newly created contractor  
**Settlement Dropdown:** Shows newly created driver  
**Driver Dashboard:** Shows with status "available" or "on_load"  
**Dispatch Board:** Shows driver with live status

---

## DATA VISIBILITY

### Contractor Management Page
Shows ContractorProfile records linked via UserProfile.linkedContractorId
```javascript
const contractors = await base44.asServiceRole.entities.ContractorProfile.list();
// Returns all contractors created on invite
```

### Settlement Page / Driver Dropdown
Shows Driver records linked via UserProfile.linkedDriverId
```javascript
const drivers = await base44.asServiceRole.entities.Driver.list();
// Returns all drivers created on invite
```

### Payment Profiles Page
Shows ContractorPaymentProfile records linked via UserProfile.linkedPaymentProfileId
```javascript
const profiles = await base44.asServiceRole.entities.ContractorPaymentProfile.list();
// Returns all payment profiles created on invite
```

### Dispatch Board
Shows drivers with current status
```javascript
const drivers = await base44.asServiceRole.entities.Driver.list();
// drivers[0].status = "available" or "on_load"
```

---

## AUTOMATED STATUS UPDATES

### On Login
- Driver status → "available" (if no active load) or "on_load" (if assigned)

### Future: On Load Assignment (Not yet implemented)
- Assign load to driver
- Trigger status update → "on_load"

### Future: On Load Completion (Not yet implemented)
- Complete load
- Trigger status update → "available"

---

## TESTING CHECKLIST

- [x] UserProfile entity created
- [x] createUserProfile creates UserProfile
- [x] businessRole saved to UserProfile
- [x] All business entities linked
- [x] handleUserLogin retrieves UserProfile
- [x] Driver status updated on login
- [x] Routing calculated by businessRole
- [x] Contractor Management shows records
- [x] Settlement dropdown shows drivers
- [x] Verification dashboard passes all 10 tests

---

## PRODUCTION READINESS

✅ **Ready for:**
- User invitation workflow
- Login-time driver status sync
- Role-based routing
- Data availability in dropdowns and pages

⏳ **Coming next:**
- Load assignment status automation
- Load completion status automation
- Real-time driver status updates on dispatch board
- Notification system for status changes

---

## DEBUGGING

**View UserProfile for a user:**
```javascript
const profile = await base44.asServiceRole.entities.UserProfile.filter(
  { authUserId: "user_id_here" }
);
console.log(profile[0]);
```

**Check Driver status:**
```javascript
const driver = await base44.asServiceRole.entities.Driver.get("driver_id");
console.log("Status:", driver.status);
```

**Check linked entities:**
```javascript
const profile = await base44.asServiceRole.entities.UserProfile.get("profile_id");
console.log("Driver:", profile.linkedDriverId);
console.log("Contractor:", profile.linkedContractorId);
console.log("Payment Profile:", profile.linkedPaymentProfileId);
```

---

## FILES MODIFIED

1. `entities/UserProfile.json` — New entity
2. `entities/User.json` — Already has businessRole field
3. `functions/createUserProfile.js` — Enhanced with UserProfile creation
4. `functions/handleUserLogin.js` — New function for login automation
5. `lib/AuthContext.jsx` — Integrated handleUserLogin
6. `pages/UserProfileVerification.jsx` — New verification dashboard
7. `App.jsx` — Added route to verification dashboard

---

## STATUS

✅ **User invitation with business roles** — Complete  
✅ **UserProfile bridge entity** — Complete  
✅ **Role-based profile creation** — Complete  
✅ **Login-time driver status update** — Complete  
✅ **Login routing by businessRole** — Complete  
✅ **Data visibility in dropdowns** — Complete  
✅ **Verification dashboard** — Complete  

**READY FOR ACCEPTANCE TESTING**