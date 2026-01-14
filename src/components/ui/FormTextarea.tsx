'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showRequiredIndicator?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      helperText,
      showRequiredIndicator,
      showCharCount,
      maxLength,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {showRequiredIndicator && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={`
              w-full px-3 py-2 border rounded-lg
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              placeholder-gray-400
              focus:ring-2 focus:border-transparent
              transition-colors
              resize-none
              disabled:opacity-50 disabled:cursor-not-allowed
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
          />
          {hasError && (
            <div className="absolute right-3 top-3 text-red-500 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div>
            {hasError && (
              <p
                id={`${props.id}-error`}
                className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                {error}
              </p>
            )}
            {!hasError && helperText && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
            )}
          </div>
          {showCharCount && maxLength && (
            <span
              className={`text-xs ${
                charCount >= maxLength
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
