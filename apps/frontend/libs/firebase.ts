import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  User,
  getAuth,
  signInWithPopup,
  Auth
} from 'firebase/auth'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export const getFirebaseApp = (): FirebaseApp | null => {
  if (typeof window === 'undefined') return null
  if (getApps().length > 0) {
    return getApp()
  }

  const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG
  if (!firebaseConfigStr) {
    return null
  }

  try {
    const config = JSON.parse(firebaseConfigStr)
    if (!config.apiKey || !config.projectId) {
      console.warn('Firebase client config missing required apiKey or projectId')
      return null
    }
    return initializeApp(config)
  } catch (e) {
    console.warn('Invalid NEXT_PUBLIC_FIREBASE_CLIENT_CONFIG JSON string:', e)
    return null
  }
}

export const getFirebaseAuth = (): Auth | null => {
  const app = getFirebaseApp()
  if (!app) return null
  return getAuth(app)
}

export interface GoogleSignInResult {
  accessToken: string
  idToken: string
  user: User
}

export const signinWithGoogle = async (): Promise<GoogleSignInResult> => {
  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('FIREBASE_CONFIG_MISSING')
  }

  try {
    const result = await signInWithPopup(auth, googleProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const idToken = await result.user.getIdToken()

    return {
      accessToken: credential?.accessToken || '',
      idToken,
      user: result.user
    }
  } catch (err: any) {
    const errorCode = err?.code
    const errorMessage = err?.message
    console.log('Firebase signin error:', errorCode, errorMessage)

    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request'
    ) {
      throw new Error('POPUP_CLOSED')
    }

    throw err
  }
}

