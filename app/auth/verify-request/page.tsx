/**
 * Verify Request Page
 * 
 * Shown after user submits email for Magic Link
 */

export const metadata = {
  title: 'E-Mail prüfen | Trading Portfolio',
  description: 'Prüfe deine E-Mails für den Anmelde-Link',
};

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg
              className="w-10 h-10 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Prüfe deine E-Mails
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ein Anmelde-Link wurde an deine E-Mail-Adresse gesendet.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              📌 Wichtig:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Der Link ist <strong>10 Minuten</strong> gültig</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Prüfe auch deinen <strong>Spam-Ordner</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Der Link kann nur <strong>einmal</strong> verwendet werden</span>
              </li>
            </ul>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Tipp: Klicke auf den Link in der E-Mail, um dich automatisch anzumelden.
            </p>
          </div>

          {/* Back to Sign In */}
          <a
            href="/auth/signin"
            className="inline-flex items-center gap-2 mt-6 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zur Anmeldung
          </a>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keine E-Mail erhalten?{' '}
            <a href="/auth/signin" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Erneut versuchen
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
