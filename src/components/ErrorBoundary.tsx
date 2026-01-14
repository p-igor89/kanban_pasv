'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, FileWarning, AlertCircle } from 'lucide-react';

// Types for ErrorBoundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

type FallbackRender = (error: Error | null, reset: () => void) => ReactNode;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | FallbackRender;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * ErrorBoundary class component that catches JavaScript errors in child components.
 * Provides error state management and recovery functionality.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error state to allow retry
   */
  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;

      // If fallback is a function, call it with error and reset
      if (typeof fallback === 'function') {
        return (fallback as FallbackRender)(this.state.error, this.reset);
      }

      // If fallback is a ReactNode, render it
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return <GenericErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

// Fallback Component Props
interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

/**
 * BoardErrorFallback - Fallback component for board loading errors.
 * Displays a prominent error message with retry functionality.
 */
export function BoardErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
    >
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
        <LayoutDashboard className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Failed to Load Board
      </h2>

      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
        We encountered an error while loading your board. This might be a temporary issue.
      </p>

      {error && (
        <details className="mb-6 w-full max-w-md">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Show error details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-32">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Retry loading board"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry Loading Board
      </button>
    </div>
  );
}

/**
 * TaskErrorFallback - Fallback component for task operation errors.
 * Displays a compact error message suitable for inline task displays.
 */
export function TaskErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
    >
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
        <FileWarning className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Task Error</h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        Something went wrong with this task operation.
      </p>

      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-md mb-4 max-w-full truncate">
          {error.message}
        </p>
      )}

      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Try again"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try Again
      </button>
    </div>
  );
}

/**
 * GenericErrorFallback - Generic fallback component for any error.
 * Provides a neutral error display suitable for various contexts.
 */
export function GenericErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-5">
        <AlertCircle className="h-7 w-7 text-gray-600 dark:text-gray-400" aria-hidden="true" />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Something Went Wrong
      </h2>

      <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm mb-4">
        An unexpected error occurred. Please try again or refresh the page.
      </p>

      {error && (
        <details className="mb-5 w-full max-w-sm">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Technical details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-24">
            {error.message}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          aria-label="Try again"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>

        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          aria-label="Refresh page"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

/**
 * MinimalErrorFallback - A very compact error indicator.
 * Useful for small UI components where space is limited.
 */
export function MinimalErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm"
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>Error occurred</span>
      <button
        onClick={onReset}
        className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline text-xs"
        aria-label="Retry"
      >
        Retry
      </button>
    </div>
  );
}

export default ErrorBoundary;
