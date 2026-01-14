'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showRequiredIndicator?: boolean;
  children: ReactNode;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { label, error, helperText, showRequiredIndicator, className = '', children, ...props },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {showRequiredIndicator && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full px-3 py-2 border rounded-lg
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              focus:ring-2 focus:border-transparent
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              appearance-none
              cursor-pointer
              ${hasError ? 'pr-10' : 'pr-8'}
              ${
                hasError
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${props.id}-error` : undefined}
            {...props}
          >
            {children}
          </select>
          {/* Dropdown arrow */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 ${
              hasError ? 'right-10' : 'right-3'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
        </div>
        {hasError && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormSelect;
