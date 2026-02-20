'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-gray-400 text-sm mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
      >
        Try again
      </button>
    </div>
  )
}
