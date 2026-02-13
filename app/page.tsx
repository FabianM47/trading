import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">
          Trading Portfolio
        </h1>

        <p className="text-xl text-gray-600">
          Verwalte dein Portfolio mit Live-Kursen
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Anmelden
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Next.js 16 | Auth.js | Drizzle ORM | Vercel KV | SWR
          </p>
        </div>
      </div>
    </main>
  );
}
