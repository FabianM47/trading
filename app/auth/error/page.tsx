/**
 * Auth Error Page
 * 
 * Shown when there's an authentication error
 */

import Link from 'next/link';

export const metadata = {
  title: 'Fehler | Trading Portfolio',
  description: 'Anmeldefehler',
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server-Konfigurationsfehler',
      description: 'Es gibt ein Problem mit der Server-Konfiguration. Bitte kontaktiere den Support.',
    },
    AccessDenied: {
      title: 'Zugriff verweigert',
      description: 'Du hast keinen Zugriff auf diese Anwendung.',
    },
    Verification: {
      title: 'Verifizierung fehlgeschlagen',
      description: 'Der Verifizierungslink ist abgelaufen oder wurde bereits verwendet.',
    },
    OAuthSignin: {
      title: 'OAuth-Fehler',
      description: 'Fehler beim Starten des OAuth-Flows.',
    },
    OAuthCallback: {
      title: 'OAuth-Callback-Fehler',
      description: 'Fehler beim Verarbeiten der OAuth-Antwort.',
    },
    OAuthCreateAccount: {
      title: 'Konto konnte nicht erstellt werden',
      description: 'Fehler beim Erstellen des Benutzerkontos.',
    },
    EmailCreateAccount: {
      title: 'E-Mail-Konto konnte nicht erstellt werden',
      description: 'Fehler beim Erstellen des E-Mail-Kontos.',
    },
    Callback: {
      title: 'Callback-Fehler',
      description: 'Fehler beim Callback-Prozess.',
    },
    OAuthAccountNotLinked: {
      title: 'Konto bereits verknüpft',
      description: 'Diese E-Mail-Adresse ist bereits mit einem anderen Konto verknüpft.',
    },
    EmailSignin: {
      title: 'E-Mail konnte nicht gesendet werden',
      description: 'Fehler beim Senden der Anmelde-E-Mail.',
    },
    CredentialsSignin: {
      title: 'Anmeldung fehlgeschlagen',
      description: 'Die eingegebenen Anmeldedaten sind ungültig.',
    },
    SessionRequired: {
      title: 'Anmeldung erforderlich',
      description: 'Du musst angemeldet sein, um auf diese Seite zuzugreifen.',
    },
    default: {
      title: 'Anmeldefehler',
      description: 'Ein unbekannter Fehler ist aufgetreten.',
    },
  };

  const errorInfo = error ? errorMessages[error] || errorMessages.default : errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <svg
              className="w-16 h-16 text-red-600 dark:text-red-400"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {errorInfo.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {errorInfo.description}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-600">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-mono text-red-600 dark:text-red-400">
                  Error Code: {error}
                </p>
              </div>
            )}

            <Link
              href="/auth/signin"
              className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                       text-white font-semibold rounded-lg text-center
                       transition-all duration-200 
                       shadow-md hover:shadow-lg"
            >
              Zurück zur Anmeldung
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 border-2 border-gray-300 dark:border-gray-600 
                       hover:bg-gray-50 dark:hover:bg-gray-700 
                       text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-center
                       transition-all duration-200"
            >
              Zur Startseite
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Wenn das Problem weiterhin besteht, kontaktiere bitte den{' '}
            <a href="mailto:support@fabianmaucher.de" className="text-blue-600 dark:text-blue-400 hover:underline">
              Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
