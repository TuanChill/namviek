---
phase: 4
title: "Environment Configuration, Documentation, and End-to-End Verification"
status: completed
priority: P2
effort: "1.5h"
dependencies: [1, 2, 3]
---

# Phase 4: Environment Configuration, Documentation, and End-to-End Verification

## Overview
Provide clear environment variable documentation and step-by-step setup guide for Firebase & Google Console, and perform end-to-end verification across authentication scenarios.

## Requirements
- **Documentation:**
  - Detail environment variables needed in `.env.example` and `DOCUMENTS.md`:
    - `FIREBASE_PROJECT_ID`
    - `FIREBASE_CLIENT_EMAIL`
    - `FIREBASE_PRIVATE_KEY`
    - `NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG`
  - Step-by-step guide for generating Firebase Web App config & Service Account key from Google Firebase Console.
- **Verification Scenarios:**
  - Scenario 1: New user registration via Google Sign-In on `/sign-in` and `/sign-up`.
  - Scenario 2: Existing user login via Google Sign-In.
  - Scenario 3: Linking Google account when user exists with same email created via password.
  - Scenario 4: User cancellation of Google OAuth popup window (no unwanted errors).
  - Scenario 5: Inactive user account handling (status 403, activation banner/modal).
  - Scenario 6: Behavior when `NEXT_PUBLIC_DISABLE_REGISTRATION=1` is enabled.
  - Scenario 7: Missing credentials graceful degradation / informative logs.

## Related Code & Docs Files
- Modify: `.env.example`
- Modify: `DOCUMENTS.md`

## Implementation Steps
1. Update `.env.example` with formatted examples and explanatory comments for Firebase Admin and Firebase Client configuration.
2. Update `DOCUMENTS.md` under Authentication section with instructions on configuring Firebase Authentication with Google Sign-in provider.
3. Run linting/typechecks and verify code integrity.
4. Execute manual test plan across all authentication flows.

## Success Criteria
- [x] Documentation clearly explains how to configure Google Sign-In with Firebase.
- [x] All verification test scenarios pass.
- [x] No regression on standard Email/Password authentication.
