import { renderHook, act } from '@testing-library/react';
import {
  useFormValidation,
  validationPatterns,
  createValidationRules,
  ValidationRules,
} from '../useFormValidation';

describe('useFormValidation', () => {
  describe('basic validation', () => {
    it('should initialize with empty errors and touched state', () => {
      const rules: ValidationRules = {
        email: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.hasErrors).toBe(false);
    });

    it('should validate required field with default message', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', '');
      });

      expect(result.current.errors.name).toBe('This field is required');
    });

    it('should validate required field with custom message', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', '');
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should validate required field with whitespace only', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', '   ');
      });

      expect(result.current.errors.name).toBe('Name is required');
    });

    it('should pass validation for valid required field', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', 'John');
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe('minLength validation', () => {
    it('should fail for value shorter than minLength', () => {
      const rules: ValidationRules = {
        password: {
          minLength: { value: 6, message: 'Password must be at least 6 characters' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('password', '12345');
      });

      expect(result.current.errors.password).toBe('Password must be at least 6 characters');
    });

    it('should pass for value equal to minLength', () => {
      const rules: ValidationRules = {
        password: {
          minLength: { value: 6, message: 'Password must be at least 6 characters' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('password', '123456');
      });

      expect(result.current.errors.password).toBeUndefined();
    });

    it('should pass for empty value when not required', () => {
      const rules: ValidationRules = {
        password: {
          minLength: { value: 6, message: 'Password must be at least 6 characters' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('password', '');
      });

      expect(result.current.errors.password).toBeUndefined();
    });
  });

  describe('maxLength validation', () => {
    it('should fail for value longer than maxLength', () => {
      const rules: ValidationRules = {
        title: {
          maxLength: { value: 10, message: 'Title must be less than 10 characters' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('title', '12345678901');
      });

      expect(result.current.errors.title).toBe('Title must be less than 10 characters');
    });

    it('should pass for value equal to maxLength', () => {
      const rules: ValidationRules = {
        title: {
          maxLength: { value: 10, message: 'Title must be less than 10 characters' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('title', '1234567890');
      });

      expect(result.current.errors.title).toBeUndefined();
    });
  });

  describe('pattern validation', () => {
    it('should fail for value not matching pattern', () => {
      const rules: ValidationRules = {
        email: {
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('email', 'invalid-email');
      });

      expect(result.current.errors.email).toBe('Invalid email');
    });

    it('should pass for value matching pattern', () => {
      const rules: ValidationRules = {
        email: {
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('email', 'test@example.com');
      });

      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('custom validation', () => {
    it('should run custom validate function and return error', () => {
      const rules: ValidationRules = {
        password: {
          validate: (value) => (value.includes('123') ? 'Password too weak' : true),
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('password', 'abc123def');
      });

      expect(result.current.errors.password).toBe('Password too weak');
    });

    it('should pass custom validation when returning true', () => {
      const rules: ValidationRules = {
        password: {
          validate: (value) => (value.includes('123') ? 'Password too weak' : true),
        },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('password', 'strongpassword');
      });

      expect(result.current.errors.password).toBeUndefined();
    });
  });

  describe('validateAllFields', () => {
    it('should validate all fields and return false if any invalid', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
        email: { required: 'Email is required' },
      };

      const { result } = renderHook(() =>
        useFormValidation<{ name: string; email: string }>(rules)
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAllFields({ name: 'John', email: '' });
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.email).toBe('Email is required');
      expect(result.current.touched.name).toBe(true);
      expect(result.current.touched.email).toBe(true);
    });

    it('should return true if all fields are valid', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
        email: { required: 'Email is required' },
      };

      const { result } = renderHook(() =>
        useFormValidation<{ name: string; email: string }>(rules)
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAllFields({ name: 'John', email: 'john@example.com' });
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('touched state', () => {
    it('should mark field as touched', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.touched.name).toBe(true);
    });

    it('should mark field as untouched', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.setFieldTouched('name', true);
      });
      act(() => {
        result.current.setFieldTouched('name', false);
      });

      expect(result.current.touched.name).toBe(false);
    });
  });

  describe('getFieldError', () => {
    it('should return error only if field is touched', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', '');
      });

      expect(result.current.getFieldError('name')).toBeUndefined();

      act(() => {
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.getFieldError('name')).toBe('Name is required');
    });
  });

  describe('handleBlur', () => {
    it('should mark field as touched and validate', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.handleBlur('name', '');
      });

      expect(result.current.touched.name).toBe(true);
      expect(result.current.errors.name).toBe('Name is required');
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors and touched state', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
        email: { required: 'Email is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.handleBlur('name', '');
        result.current.handleBlur('email', '');
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
    });
  });

  describe('clearFieldError', () => {
    it('should clear error for specific field', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
        email: { required: 'Email is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.handleBlur('name', '');
        result.current.handleBlur('email', '');
      });

      act(() => {
        result.current.clearFieldError('name');
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBe('Email is required');
    });
  });

  describe('setFieldError', () => {
    it('should set error for specific field', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.setFieldError('name', 'Custom error message');
      });

      expect(result.current.errors.name).toBe('Custom error message');
    });
  });

  describe('hasErrors', () => {
    it('should return true when there are errors', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', '');
      });

      expect(result.current.hasErrors).toBe(true);
    });

    it('should return false when no errors', () => {
      const rules: ValidationRules = {
        name: { required: 'Name is required' },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('name', 'John');
      });

      expect(result.current.hasErrors).toBe(false);
    });
  });

  describe('field without rules', () => {
    it('should return undefined for field without rules', () => {
      const rules: ValidationRules = {
        name: { required: true },
      };

      const { result } = renderHook(() => useFormValidation(rules));

      act(() => {
        result.current.validateField('unknownField', '');
      });

      expect(result.current.errors.unknownField).toBeUndefined();
    });
  });
});

describe('validationPatterns', () => {
  describe('email pattern', () => {
    it('should match valid email addresses', () => {
      expect(validationPatterns.email.test('test@example.com')).toBe(true);
      expect(validationPatterns.email.test('user.name@domain.co.uk')).toBe(true);
      expect(validationPatterns.email.test('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validationPatterns.email.test('invalid')).toBe(false);
      expect(validationPatterns.email.test('invalid@')).toBe(false);
      expect(validationPatterns.email.test('@example.com')).toBe(false);
      expect(validationPatterns.email.test('test @example.com')).toBe(false);
    });
  });

  describe('phone pattern', () => {
    it('should match valid phone numbers', () => {
      expect(validationPatterns.phone.test('+1234567890')).toBe(true);
      expect(validationPatterns.phone.test('123-456-7890')).toBe(true);
      expect(validationPatterns.phone.test('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validationPatterns.phone.test('abc123')).toBe(false);
      expect(validationPatterns.phone.test('')).toBe(false);
    });
  });

  describe('url pattern', () => {
    it('should match valid URLs', () => {
      expect(validationPatterns.url.test('http://example.com')).toBe(true);
      expect(validationPatterns.url.test('https://example.com')).toBe(true);
      expect(validationPatterns.url.test('https://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validationPatterns.url.test('example.com')).toBe(false);
      expect(validationPatterns.url.test('ftp://example.com')).toBe(false);
    });
  });

  describe('alphanumeric pattern', () => {
    it('should match alphanumeric strings', () => {
      expect(validationPatterns.alphanumeric.test('abc123')).toBe(true);
      expect(validationPatterns.alphanumeric.test('ABC')).toBe(true);
      expect(validationPatterns.alphanumeric.test('123')).toBe(true);
    });

    it('should reject non-alphanumeric strings', () => {
      expect(validationPatterns.alphanumeric.test('abc-123')).toBe(false);
      expect(validationPatterns.alphanumeric.test('abc 123')).toBe(false);
      expect(validationPatterns.alphanumeric.test('abc_123')).toBe(false);
    });
  });
});

describe('createValidationRules', () => {
  describe('email', () => {
    it('should create email validation rule with required', () => {
      const rule = createValidationRules.email(true);
      expect(rule.required).toBe('Email is required');
      expect(rule.pattern?.message).toBe('Please enter a valid email address');
    });

    it('should create email validation rule without required', () => {
      const rule = createValidationRules.email(false);
      expect(rule.required).toBe(false);
      expect(rule.pattern?.message).toBe('Please enter a valid email address');
    });
  });

  describe('password', () => {
    it('should create password validation rule with default minLength', () => {
      const rule = createValidationRules.password();
      expect(rule.required).toBe('Password is required');
      expect(rule.minLength?.value).toBe(6);
    });

    it('should create password validation rule with custom minLength', () => {
      const rule = createValidationRules.password(8);
      expect(rule.minLength?.value).toBe(8);
      expect(rule.minLength?.message).toBe('Password must be at least 8 characters');
    });
  });

  describe('confirmPassword', () => {
    it('should validate password match', () => {
      const password = 'secret123';
      const rule = createValidationRules.confirmPassword(() => password);

      expect(rule.required).toBe('Please confirm your password');
      expect(rule.validate?.('secret123')).toBe(true);
      expect(rule.validate?.('different')).toBe('Passwords do not match');
    });
  });

  describe('name', () => {
    it('should create name validation rule with defaults', () => {
      const rule = createValidationRules.name();
      expect(rule.required).toBe('Name is required');
      expect(rule.maxLength?.value).toBe(100);
    });

    it('should create name validation rule without required', () => {
      const rule = createValidationRules.name(false);
      expect(rule.required).toBe(false);
    });

    it('should create name validation rule with custom maxLength', () => {
      const rule = createValidationRules.name(true, 50);
      expect(rule.maxLength?.value).toBe(50);
      expect(rule.maxLength?.message).toBe('Name must be less than 50 characters');
    });
  });

  describe('title', () => {
    it('should create title validation rule with default maxLength', () => {
      const rule = createValidationRules.title();
      expect(rule.required).toBe('Title is required');
      expect(rule.maxLength?.value).toBe(200);
    });

    it('should create title validation rule with custom maxLength', () => {
      const rule = createValidationRules.title(100);
      expect(rule.maxLength?.value).toBe(100);
      expect(rule.maxLength?.message).toBe('Title must be less than 100 characters');
    });
  });
});
