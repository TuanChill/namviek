---
phase: 1
title: "Backend Firebase Admin & Google Auth Provider Hardening"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Backend Firebase Admin & Google Auth Provider Hardening

## Overview
Harden Firebase Admin initialization, secure Google ID token verification, resolve user creation/update logic, and ensure accurate exception handling on backend auth endpoints.

## Requirements
- **Functional:**
  - Verify Google ID token using `firebase-admin/auth` (`verifyIdToken`).
  - Extract verified user identity (email, name, picture) directly from decoded Firebase token rather than client-supplied unverified parameters.
  - Automatically create active user account upon first Google Sign-In if registration is enabled (`NEXT_PUBLIC_DISABLE_REGISTRATION !== "1"`).
  - Update user's avatar (`photo`) and name if existing account has empty fields.
  - Issue standard Namviek JWT access token and refresh token via `JwtProvider`.
- **Non-functional / Security:**
  - Guard against email spoofing by enforcing `verifiedUser.email` as the authenticated identity.
  - Preserve `InactiveAccountException` (HTTP 403) for deactivated users without masking as `CredentialInvalidException` (HTTP 400).
  - Handle disabled registration (`NEXT_PUBLIC_DISABLE_REGISTRATION === "1"`) gracefully without unhandled null pointer exceptions.
  - Handle missing Firebase Admin credentials with clear diagnostic logs.

## Architecture
```
Client (Google ID Token)
        │
        ▼
POST /api/auth/sign-in { provider: 'GOOGLE', password: <idToken> }
        │
        ▼
GoogleAuthProvider.verify()
   ├── Firebase Admin verifyIdToken(token) ──► verifiedUser (email, name, picture)
   ├── Check serviceGetUserByEmail(verifiedUser.email)
   │     ├── If not found & registration allowed: mdUserAdd(...)
   │     └── If not found & registration disabled: throw RegistrationDisabled / CredentialInvalid
   ├── If user.status === INACTIVE: throw InactiveAccountException (403)
   └── If user exists: update missing photo/name if available
        │
        ▼
JwtProvider.generate() ──► Authorization & RefreshToken headers + User Data
```

## Related Code Files
- Modify: `apps/backend/src/lib/firebase-admin.ts`
- Modify: `apps/backend/src/providers/auth/GoogleAuthProvider.ts`
- Modify: `apps/backend/src/routes/auth/index.ts`

## Implementation Steps
1. In `apps/backend/src/lib/firebase-admin.ts`:
   - Validate presence of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` before attempting cert initialization.
   - Cleanly handle private key newline replacement: `process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')`.
   - Export helper `isFirebaseAdminConfigured()` to provide runtime status check.
2. In `apps/backend/src/providers/auth/GoogleAuthProvider.ts`:
   - Replace `serviceGetUserByEmail(this.email)` with `serviceGetUserByEmail(verifiedUser.email)` after verifying ID token.
   - Guard against `!user` when registration is disabled: throw explicit exception with status 400/403.
   - Re-throw `InactiveAccountException` and custom exceptions explicitly without collapsing all errors into `CredentialInvalidException`.
   - Auto-sync `photo` and `name` from `verifiedUser` if existing user record lacks them.
3. In `apps/backend/src/routes/auth/index.ts`:
   - Ensure `/sign-in` catches and returns structured error payload `{ status: error.status || 400, message: error.message }`.

## Success Criteria
- [x] Valid Google ID token successfully verifies and authenticates the user.
- [x] New users get auto-created with status `ACTIVE`, profile name, and avatar picture.
- [x] Inactive accounts receive HTTP 403 `InactiveAccountException`.
- [x] Registration-disabled flag is respected with proper error messaging.
- [x] Email spoofing attempt (mismatched body email vs token email) is prevented.
