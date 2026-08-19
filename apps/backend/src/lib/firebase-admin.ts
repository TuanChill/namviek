import { cert, initializeApp, getApps } from 'firebase-admin/app'

export const isFirebaseAdminConfigured = () => getApps().length > 0

try {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      })
      console.log('Firebase Admin initialized successfully')
    }
  } else {
    console.warn('Firebase admin missing configuration (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY)')
  }
} catch (error) {
  console.warn('Firebase admin initialization failed:', error)
}

