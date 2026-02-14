import { getSession } from "@/lib/auth/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  // Check if user is already authenticated
  const session = await getSession();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            Trading Portfolio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Verwalte dein Portfolio mit Live-Kursen und detaillierten Analysen
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            Jetzt anmelden
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Live-Kurse
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Echtzeit-Kursdaten für deine Investments
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Portfolio-Verwaltung
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Behalte alle deine Trades im Überblick
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Performance-Tracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Detaillierte Analysen deiner Gewinne und Verluste
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Next.js 16 | Auth.js | Drizzle ORM | Vercel KV | SWR
          </p>
        </div>
      </div>
    </main>
  );
}
