/**
 * Verify Request Page
 * 
 * Shown after user submits email for Magic Link
 */

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Check your email
          </h1>
          <p className="text-gray-600 mb-6">
            A sign-in link has been sent to your email address.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>The link expires in 10 minutes</li>
              <li>Check your spam folder if you don't see it</li>
              <li>The link can only be used once</li>
            </ul>
          </div>

          {/* Back to Sign In */}
          <a
            href="/auth/signin"
            className="inline-block mt-6 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
