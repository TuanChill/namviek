---
phase: 2
title: "Frontend Firebase Auth & Client Service Integration"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Frontend Firebase Auth & Client Service Integration

## Overview
Harden Firebase Client initialization on Next.js frontend, improve popup authentication reliability and cancellation handling, and streamline token exchange via `@auth-client`.

## Requirements
- **Functional:**
  - Initialize Firebase app safely in Next.js environment preventing duplicate app errors on Hot Module Reload (HMR).
  - Parse and validate `process.env.NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG`.
  - Handle Google popup sign-in via Firebase `signInWithPopup(auth, googleProvider)`.
  - Extract ID token via `user.getIdToken()`.
  - Send `{ email: user.email, password: idToken, provider: 'GOOGLE' }` to backend `/api/auth/sign-in`.
- **Non-functional / UX:**
  - Catch user cancellations (`auth/popup-closed-by-user`, `auth/cancelled-popup-request`) gracefully without firing alarming error alerts.
  - Return informative error codes/messages if Firebase client configuration is missing.
  - Correctly extract and store JWT token, refresh token, and user session in local storage.

## Architecture
```
User clicks "Sign in with Google"
        │
        ▼
apps/frontend/libs/firebase.ts :: signinWithGoogle()
   ├── Ensure Firebase initialized with getApps() check
   ├── signInWithPopup(auth, googleProvider)
   └── Return { user, idToken }
        │
        ▼
packages/auth-client :: signin({ email, password: idToken, provider: 'GOOGLE' })
   ├── POST /api/auth/sign-in
   ├── Save Goalie JWT & Refresh tokens to localStorage
   └── Update GoalieUser context & return 'SUCCESS'
```

## Related Code Files
- Modify: `apps/frontend/libs/firebase.ts`
- Modify: `packages/auth-client/src/services/auth.ts`

## Implementation Steps
1. In `apps/frontend/libs/firebase.ts`:
   - Use `getApps().length ? getApp() : initializeApp(config)` pattern for safe Next.js client initialization.
   - Add safe parsing helper for `NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG` with helpful console warning if missing or invalid.
   - Refactor `signinWithGoogle()`:
     - Check if Firebase config is ready; if not, throw descriptive `FIREBASE_CONFIG_MISSING` error.
     - Call `signInWithPopup(auth, googleProvider)`.
     - Catch `auth/popup-closed-by-user` and `auth/cancelled-popup-request` and resolve/reject with clean cancellation status `POPUP_CLOSED`.
     - Retrieve fresh ID token `await user.getIdToken()`.
2. In `packages/auth-client/src/services/auth.ts`:
   - Enhance `signin` error handling to pass through backend error message when available (`res.data.error?.message || res.data.error`).

## Success Criteria
- [x] Firebase initializes without HMR duplicate app errors.
- [x] Closing the Google popup does not produce confusing generic error toasts.
- [x] Successful popup returns valid ID token and triggers backend authentication.
- [x] Session tokens and user context update immediately upon sign in.
