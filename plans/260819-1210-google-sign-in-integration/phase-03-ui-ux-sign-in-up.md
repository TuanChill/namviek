---
phase: 3
title: "UI/UX Integration for Sign-In and Sign-Up Screens"
status: completed
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 3: UI/UX Integration for Sign-In and Sign-Up Screens

## Overview
Implement seamless Google Sign-In and Sign-Up user experience across both `/sign-in` and `/sign-up` routes with consistent styling, loading indicators, error feedback, and redirect management.

## Requirements
- **Functional:**
  - Support 1-click Google Sign-In on `/sign-in`.
  - Support 1-click Google Sign-Up on `/sign-up`.
  - Disable buttons and display clear loading state while authentication is in progress.
  - Redirect users to their previous location (`getRecentVisit`) or `/organization` upon successful login/registration.
  - Display activation modal (`SignInactiveUser`) if the authenticated Google user's account is inactive.
  - Show clear error messages for specific failure states (e.g. registration disabled, network failure, configuration missing).
- **UI / Styling:**
  - Maintain design consistency with existing Namviek UI tokens (borders `#D0D5E1`, dark mode `dark:bg-gray-900/90`, Google logo icon, responsive layouts).
  - Include horizontal divider with "or" text between social auth and email/password forms on both screens.

## Architecture & User Flows
```
+-------------------------------------------------------------+
|                      namviek                                |
|  Welcome Back, Let's Get Started / Create Your Account      |
|                                                             |
|  [ G  Sign in / Sign up with Google ]  <-- (Loading state)  |
|                                                             |
|  ------------------- or -------------------                 |
|                                                             |
|  Email input:    [                          ]               |
|  Password input: [                          ]               |
|  [ Sign in / Sign up Button ]                               |
|                                                             |
|  Switch between Sign in <-> Register links                  |
+-------------------------------------------------------------+
```

## Related Code Files
- Modify: `apps/frontend/app/sign-in/[[...sign-in]]/SigninForm.tsx`
- Modify: `apps/frontend/app/sign-up/[[...sign-up]]/SignupForm.tsx`

## Implementation Steps
1. In `apps/frontend/app/sign-in/[[...sign-in]]/SigninForm.tsx`:
   - Add `googleLoading` state to distinguish Google button loading from email form submission.
   - Disable all interaction inputs while `loading || googleLoading` is true.
   - Handle Google sign-in cancellation silently without error toast.
   - Handle config errors (`FIREBASE_CONFIG_MISSING`) with a user-friendly error message.
   - Retain full redirect logic to recent visit / `/organization`.
2. In `apps/frontend/app/sign-up/[[...sign-up]]/SignupForm.tsx`:
   - Add Google Sign-Up button and "or" divider matching `SigninForm.tsx`.
   - Implement `signInWithThirdParty` handler in `SignupForm.tsx` using the shared Google auth flow.
   - Support `googleLoading` state and button disabled states.
   - Route successful Google sign-up directly into the authenticated session without requiring manual password login.

## Success Criteria
- [x] Users can sign in with Google from `/sign-in` with immediate redirect to dashboard.
- [x] Users can sign up with Google from `/sign-up` in one click.
- [x] Google button displays loading spinner/state while popup or backend request is active.
- [x] Responsive design functions cleanly on both mobile and desktop viewports.
