/**
 * Sign In Page
 * 
 * Supports:
 * - Email Magic Link
 * - Google OAuth
 */

import { signIn } from '@/auth';
import { getSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  // Redirect if already authenticated
  const session = await getSession();
  if (session?.user) {
    redirect(searchParams.callbackUrl || '/app');
  }

  const callbackUrl = searchParams.callbackUrl || '/app';
  const error = searchParams.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-600">
            Sign in to your trading portfolio
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {error === 'OAuthAccountNotLinked'
                ? 'This email is already associated with another account. Please use the original sign-in method.'
                : error === 'EmailSignin'
                  ? 'Check your email for the sign-in link.'
                  : error === 'Configuration'
                    ? 'There is a problem with the server configuration.'
                    : 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        {/* Sign In Card */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Email Sign In */}
          {process.env.EMAIL_SERVER && (
            <>
              <form
                action={async (formData: FormData) => {
                  'use server';
                  await signIn('nodemailer', {
                    email: formData.get('email') as string,
                    redirectTo: callbackUrl,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  Sign in with Email
                </button>
              </form>

              {/* Divider */}
              {(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Google OAuth */}
          {process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && (
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            </form>
          )}

          {/* No Providers Warning */}
          {!process.env.EMAIL_SERVER &&
            !process.env.AUTH_GOOGLE_ID &&
            !process.env.AUTH_GOOGLE_SECRET && (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No authentication providers configured.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Please configure EMAIL_SERVER or Google OAuth in your environment variables.
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
