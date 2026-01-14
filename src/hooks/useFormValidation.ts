'use client';

import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: string) => string | true;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface FieldErrors {
  [field: string]: string | undefined;
}

export function useFormValidation<T extends Record<string, string>>(rules: ValidationRules) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (field: string, value: string): string | undefined => {
      const fieldRules = rules[field];
      if (!fieldRules) return undefined;

      // Required check
      if (fieldRules.required) {
        if (!value || !value.trim()) {
          return typeof fieldRules.required === 'string'
            ? fieldRules.required
            : 'This field is required';
        }
      }

      // MinLength check
      if (fieldRules.minLength) {
        if (value && value.length < fieldRules.minLength.value) {
          return fieldRules.minLength.message;
        }
      }

      // MaxLength check
      if (fieldRules.maxLength) {
        if (value && value.length > fieldRules.maxLength.value) {
          return fieldRules.maxLength.message;
        }
      }

      // Pattern check
      if (fieldRules.pattern) {
        if (value && !fieldRules.pattern.value.test(value)) {
          return fieldRules.pattern.message;
        }
      }

      // Custom validation
      if (fieldRules.validate) {
        const result = fieldRules.validate(value);
        if (result !== true) {
          return result;
        }
      }

      return undefined;
    },
    [rules]
  );

  const validateSingleField = useCallback(
    (field: string, value: string) => {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
      return !error;
    },
    [validateField]
  );

  const validateAllFields = useCallback(
    (values: T): boolean => {
      const newErrors: FieldErrors = {};
      let isValid = true;

      for (const field of Object.keys(rules)) {
        const error = validateField(field, values[field] || '');
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }

      setErrors(newErrors);
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      for (const field of Object.keys(rules)) {
        allTouched[field] = true;
      }
      setTouched(allTouched);

      return isValid;
    },
    [rules, validateField]
  );

  const setFieldTouched = useCallback((field: string, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  // Get error for a field (only if touched)
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return touched[field] ? errors[field] : undefined;
    },
    [errors, touched]
  );

  // Handle blur event for a field
  const handleBlur = useCallback(
    (field: string, value: string) => {
      setFieldTouched(field, true);
      validateSingleField(field, value);
    },
    [setFieldTouched, validateSingleField]
  );

  return {
    errors,
    touched,
    validateField: validateSingleField,
    validateAllFields,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    setFieldError,
    getFieldError,
    handleBlur,
    hasErrors: Object.values(errors).some((error) => !!error),
  };
}

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s-()]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

// Common validation rules factory
export const createValidationRules = {
  email: (required = true): ValidationRule => ({
    required: required ? 'Email is required' : false,
    pattern: {
      value: validationPatterns.email,
      message: 'Please enter a valid email address',
    },
  }),

  password: (minLength = 6): ValidationRule => ({
    required: 'Password is required',
    minLength: {
      value: minLength,
      message: `Password must be at least ${minLength} characters`,
    },
  }),

  confirmPassword: (getPassword: () => string): ValidationRule => ({
    required: 'Please confirm your password',
    validate: (value: string) => {
      const password = getPassword();
      return value === password || 'Passwords do not match';
    },
  }),

  name: (required = true, maxLength = 100): ValidationRule => ({
    required: required ? 'Name is required' : false,
    maxLength: {
      value: maxLength,
      message: `Name must be less than ${maxLength} characters`,
    },
  }),

  title: (maxLength = 200): ValidationRule => ({
    required: 'Title is required',
    maxLength: {
      value: maxLength,
      message: `Title must be less than ${maxLength} characters`,
    },
  }),
};
