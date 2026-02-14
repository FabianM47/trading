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

export const metadata = {
  title: 'Anmelden | Trading Portfolio',
  description: 'Melde dich bei deinem Trading Portfolio an',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  // Redirect if already authenticated
  const session = await getSession();
  if (session?.user) {
    redirect(searchParams.callbackUrl || '/dashboard');
  }

  const callbackUrl = searchParams.callbackUrl || '/dashboard';
  const error = searchParams.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Melde dich bei deinem Trading Portfolio an
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error === 'OAuthAccountNotLinked'
                ? 'Diese E-Mail ist bereits mit einem anderen Konto verknüpft. Bitte nutze die ursprüngliche Anmeldemethode.'
                : error === 'EmailSignin'
                  ? 'Prüfe deine E-Mails für den Anmelde-Link.'
                  : error === 'Configuration'
                    ? 'Es gibt ein Problem mit der Server-Konfiguration.'
                    : 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}
            </p>
          </div>
        )}

        {/* Sign In Card */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
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
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    E-Mail Adresse
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                             transition-colors"
                    placeholder="deine@email.de"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                           text-white font-semibold rounded-lg 
                           transition-all duration-200 
                           shadow-md hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Mit E-Mail anmelden
                </button>
              </form>

              {/* Divider */}
              {(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Oder weiter mit
                    </span>
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
                className="w-full flex items-center justify-center gap-3 py-3 px-4 
                         border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 
                         hover:bg-gray-50 dark:hover:bg-gray-600 
                         text-gray-700 dark:text-gray-200
                         transition-all duration-200
                         shadow-sm hover:shadow-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">Mit Google anmelden</span>
              </button>
            </form>
          )}

          {/* No Providers Warning */}
          {!process.env.EMAIL_SERVER &&
            !process.env.AUTH_GOOGLE_ID &&
            !process.env.AUTH_GOOGLE_SECRET && (
              <div className="text-center py-8">
                <div className="inline-block p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Keine Anmeldemethoden konfiguriert
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Bitte konfiguriere EMAIL_SERVER oder Google OAuth in deinen Umgebungsvariablen.
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Mit der Anmeldung stimmst du unseren{' '}
          <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
            Nutzungsbedingungen
          </a>{' '}
          und{' '}
          <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
            Datenschutzrichtlinien
          </a>{' '}
          zu.
        </p>
      </div>
    </div>
  );
}
