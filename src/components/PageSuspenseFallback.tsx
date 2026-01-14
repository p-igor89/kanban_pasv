'use client';

export default function PageSuspenseFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="text-center">
        <div
          className="inline-block w-12 h-12 border-4 border-t-indigo-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading"
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
