'use client'

import { Button, Form, Loading, messageError, messageSuccess, setFixLoading, useForm } from '@ui-components'
import { validateRegisterUser } from '@namviek/core/validation'
import Link from 'next/link'
import Logo from '../../../components/Logo'
import { useState } from 'react'
import { ISignin, getGoalieUser, signin, signup, useUser } from '@auth-client'
import { UserStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { getRecentVisit } from '@namviek/core/client'
import { signinWithGoogle } from 'apps/frontend/libs/firebase'
import { GAAction, GACategory, trackingEvent } from '@/components/GA/utils'
import IntroSection from '@/features/IntroSection'

export default function SignupForm() {
  const { push } = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { setUser } = useUser()

  const { regField, regHandleSubmit } = useForm({
    values: {
      email: '',
      password: '',
      name: ''
    },
    validateFn: values => {
      return validateRegisterUser(values)
    },
    onSubmit: values => {
      if (loading) return

      setLoading(true)
      signup(values)
        .then(res => {
          const { data, error } = res.data

          if (error) {
            if (error?.meta?.target === 'User_email_key') {
              messageError('Email already exists')
              return
            }

            messageError(typeof error === 'string' ? error : 'Registration failed')
            console.log(error)
            return
          }

          if (data && data.status === UserStatus.ACTIVE) {
            console.log('done')
            messageSuccess('Congratulations! Your account has been successfully created!')
            push('/sign-in')
            return
          }

          setSuccess(true)
        })
        .catch(err => {
          console.log(err)
          messageError('Your information is invalid')
        })
        .finally(() => setLoading(false))
    }
  })

  const signInWithThirdParty = async () => {
    if (loading || googleLoading) return
    setGoogleLoading(true)
    try {
      const result = await signinWithGoogle()
      const { user, idToken } = result

      submitGoogleAuth({
        email: user.email || '',
        password: idToken,
        provider: 'GOOGLE'
      })
    } catch (error: any) {
      setGoogleLoading(false)
      if (error?.message === 'POPUP_CLOSED') {
        return
      }
      if (error?.message === 'FIREBASE_CONFIG_MISSING') {
        messageError('Google sign-in is not configured. Please contact administrator.')
        return
      }
      messageError('Failed to sign up with Google. Please try again.')
    }
  }

  const submitGoogleAuth = (values: ISignin) => {
    setLoading(true)
    signin(values)
      .then(res => {
        trackingEvent({
          action: GAAction.SIGN_IN,
          category: GACategory.AUTHEN,
          value: values.email
        })
        try {
          const user = getGoalieUser()
          setUser(user)

          if (!user) {
            messageError('Something went wrong')
            return
          }

          const recentVisit = getRecentVisit(user.id)

          setFixLoading(true, {
            title: 'Redirecting to main screen ...',
            solid: true
          })
          if (recentVisit) {
            const location = window.location
            location.href = `${location.protocol}//${location.host}${recentVisit}`
          } else {
            push('/organization')
            setTimeout(() => {
              setFixLoading(false)
            }, 500)
          }
        } catch (error) {
          messageError('Something went wrong as getting user')
          console.log(error)
        }
      })
      .catch(err => {
        if (err === 'NOT_ACTIVE') {
          messageError(
            "You haven't activated your account yet. Please check your email for the activation link."
          )
          return
        }

        const errMsg = typeof err === 'string' && err !== 'INVALID_INFORMATION'
          ? err
          : 'Google sign-up failed. Please try again.'
        messageError(errMsg)
      })
      .finally(() => {
        setLoading(false)
        setGoogleLoading(false)
      })
  }

  return (
    <div className="sign-page relative h-screen w-screen flex items-center justify-center ">
      <div className='relative dark:border-gray-800/50 w-screen h-screen'>
        <div className='absolute top-0 left-0 h-full w-full flex shadow-md'>
          {/* Success Form */}
          <div className={`bg-white dark:bg-gray-900/90 backdrop-blur-md w-full md:w-[600px] shrink-0 px-6 md:px-24 pt-10 md:pt-14 overflow-y-auto ${success ? '' : 'hidden'}`}>
            <div className='flex items-center gap-1'>
              <Logo />
              <span className='font-medium text-zinc-400 text-[25px]'>namviek</span>
            </div>
            
            <div className="text-center mt-6 md:mt-10">
              <img src="/email.svg" className="m-auto pb-4 md:pb-6 w-[150px] md:w-[200px]" alt="Email sent" />
              <h2 className="text-[32px] md:text-[42px] dark:text-zinc-200 font-extrabold leading-tight text-[#2B3C4F]">
                Successfully Registered
              </h2>
              <p className="text-[16px] md:text-[19px] mt-4 md:mt-6 text-[#7A8799]">
                We have sent an activation link to your email to continue with the
                registration process
              </p>
              <p className="mt-6 md:mt-8 mb-6 md:mb-0">
                <Link
                  className="text-indigo-600 hover:underline"
                  href={'/sign-in'}>
                  Back to Login
                </Link>
              </p>
            </div>
          </div>

          {/* Registration Form */}
          <form
            onSubmit={regHandleSubmit}
            className={`${success ? 'hidden' : ''} bg-white dark:bg-gray-900/90 backdrop-blur-md w-full md:w-[600px] shrink-0 px-6 md:px-24 pt-10 md:pt-14 overflow-y-auto`}>
            <div className='flex items-center gap-1'>
              <Logo />
              <span className='font-medium text-zinc-400 text-[25px]'>namviek</span>
            </div>

            <h2 className='mt-[30px] md:mt-[45px] text-[32px] md:text-[42px] dark:text-zinc-200 font-extrabold leading-tight text-[#2B3C4F]'>Create Your Account Here</h2>

            <p className="text-[16px] md:text-[19px] mt-4 md:mt-6 text-[#7A8799]">
              Our registration process is quick and easy, taking no more than 5 minutes to complete.
            </p>

            <div className="flex flex-col gap-4 mt-6 md:mt-7">
              <button
                type="button"
                disabled={loading || googleLoading}
                onClick={ev => {
                  ev.preventDefault()
                  signInWithThirdParty()
                }}
                className={`border bg-white hover:bg-zinc-50 shadow border-[#D0D5E1] rounded-lg text-base text-zinc-600 w-full flex items-center justify-center py-2.5 active:shadow-inner transition-all ${
                  loading || googleLoading ? 'opacity-60 cursor-not-allowed' : ''
                }`}>
                <img src="/google.png" className="w-4 h-4 mr-2" alt="Google" />
                {googleLoading ? 'Signing up with Google...' : 'Sign up with Google'}
              </button>

              <div className="relative mt-2 pb-1">
                <span className="text-base bg-white/95 dark:bg-gray-900/80 px-1 rounded-md absolute -top-[13px] left-1/2 -translate-x-1/2 z-10 text-gray-400">
                  or
                </span>
                <div className="absolute top-0 w-full border-b dark:border-gray-700"></div>
              </div>

              <Form.Input size='md' title="Fullname" {...regField('name')} />
              <Form.Input size='md' title="Email" {...regField('email')} />
              <Form.Input
                size='md'
                title="Password"
                type="password"
                {...regField('password')}
              />

              <div className="space-y-3 mt-2">
                <Button
                  size='md'
                  loading={loading}
                  title="Sign up"
                  type="submit"
                  block
                  primary
                />
              </div>
            </div>

            <div className="mt-6 text-center text-gray-400 mb-6 md:mb-0">
              Already have an account?{' '}
              <Link className="text-indigo-600 hover:underline" href={'/sign-in'}>
                Sign in
              </Link>
            </div>
          </form>

          {/* Hide IntroSection on mobile */}
          <div className="hidden md:block">
            <IntroSection />
          </div>
        </div>
      </div>
    </div>
  )
}

