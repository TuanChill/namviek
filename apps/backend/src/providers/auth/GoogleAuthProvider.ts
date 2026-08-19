import { UserStatus } from '@prisma/client'
import { serviceGetUserByEmail } from '../../services/user'
import CredentialInvalidException from '../../exceptions/CredentialInvalidException'
import { BaseAuthProvider } from './BaseAuthProvider'
import { getAuth } from 'firebase-admin/auth'
import { mdUserAdd, mdUserUpdate } from '@database'
import InactiveAccountException from '../../exceptions/InactiveAccountException'
import { isFirebaseAdminConfigured } from '../../lib/firebase-admin'

export default class GoogleAuthProvider extends BaseAuthProvider {
  constructor({ email, password }: { email: string; password: string }) {
    super({ email, password })
  }

  async verify() {
    try {
      if (!isFirebaseAdminConfigured()) {
        throw new CredentialInvalidException('Firebase Admin is not configured on the server')
      }

      const idToken = this.password
      if (!idToken) {
        throw new CredentialInvalidException('Google ID token is required')
      }

      const verifiedUser = await getAuth().verifyIdToken(idToken)
      if (!verifiedUser || !verifiedUser.email) {
        throw new CredentialInvalidException('Invalid Google token or email missing')
      }

      const verifiedEmail = verifiedUser.email.toLowerCase()
      let user = await serviceGetUserByEmail(verifiedEmail)

      if (!user) {
        if (process.env.NEXT_PUBLIC_DISABLE_REGISTRATION === '1') {
          throw new CredentialInvalidException(
            'Registration is currently unavailable. Please contact the website administrator for further assistance'
          )
        }

        user = await mdUserAdd({
          email: verifiedEmail,
          password: '1',
          name: verifiedUser.name || verifiedEmail.split('@')[0],
          country: null,
          bio: null,
          resetToken: null,
          dob: null,
          status: UserStatus.ACTIVE,
          photo: verifiedUser.picture || null,
          settings: {},
          createdAt: new Date(),
          createdBy: null,
          updatedAt: null,
          updatedBy: null
        })
      } else {
        // Sync photo or name if missing on existing account
        const updateData: { photo?: string; name?: string } = {}
        if (!user.photo && verifiedUser.picture) {
          updateData.photo = verifiedUser.picture
        }
        if (!user.name && verifiedUser.name) {
          updateData.name = verifiedUser.name
        }
        if (Object.keys(updateData).length > 0) {
          user = await mdUserUpdate(user.id, updateData)
        }
      }

      // in case users was deleted or marked inactive
      if (user.status === UserStatus.INACTIVE) {
        throw new InactiveAccountException()
      }

      this.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        photo: user.photo
      }
    } catch (error) {
      if (error instanceof InactiveAccountException || error instanceof CredentialInvalidException) {
        throw error
      }
      console.error('Google Auth verification error:', error)
      throw new CredentialInvalidException(error?.message || 'Google authentication failed')
    }
  }
}

