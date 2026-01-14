import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateRequest,
  validateRequestBody,
  validateSearchParams,
  validateRouteParams,
  isValidationSuccess,
  isValidationError,
  safeParse,
  createValidationError,
  IdParamsSchema,
} from '../validate';

// Mock NextResponse for testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, options) => ({
      body,
      status: options?.status,
    })),
  },
}));

describe('Validation Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    it('should return success with valid data', () => {
      const result = validateRequest(TestSchema, { name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('should return error for invalid data', () => {
      const result = validateRequest(TestSchema, { name: '', age: -5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            message: expect.any(String),
            details: expect.any(Array),
          }),
          { status: 400 }
        );
      }
    });

    it('should use custom error prefix', () => {
      const result = validateRequest(TestSchema, { name: '' }, { errorPrefix: 'Custom error' });

      expect(result.success).toBe(false);
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Custom error' }),
        expect.any(Object)
      );
    });

    it('should use custom status code', () => {
      const result = validateRequest(TestSchema, { name: '' }, { statusCode: 422 });

      expect(result.success).toBe(false);
      expect(NextResponse.json).toHaveBeenCalledWith(expect.any(Object), { status: 422 });
    });

    it('should handle missing required fields', () => {
      const result = validateRequest(TestSchema, {});

      expect(result.success).toBe(false);
    });

    it('should handle wrong types', () => {
      const result = validateRequest(TestSchema, { name: 123, age: 'thirty' });

      expect(result.success).toBe(false);
    });
  });

  describe('validateRequestBody', () => {
    const TestSchema = z.object({
      title: z.string().min(1),
    });

    it('should validate JSON body from request', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ title: 'Test' }),
      } as unknown as Request;

      const result = await validateRequestBody(TestSchema, mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test');
      }
    });

    it('should handle JSON parse errors', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Request;

      const result = await validateRequestBody(TestSchema, mockRequest);

      expect(result.success).toBe(false);
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        }),
        { status: 400 }
      );
    });

    it('should handle validation errors after parsing', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ title: '' }),
      } as unknown as Request;

      const result = await validateRequestBody(TestSchema, mockRequest);

      expect(result.success).toBe(false);
    });
  });

  describe('validateSearchParams', () => {
    const QuerySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      search: z.string().optional(),
    });

    it('should validate URLSearchParams', () => {
      const params = new URLSearchParams('page=2&search=test');
      const result = validateSearchParams(QuerySchema, params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.search).toBe('test');
      }
    });

    it('should validate string query params', () => {
      const result = validateSearchParams(QuerySchema, 'page=3');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });

    it('should handle multiple values for same key', () => {
      const ArraySchema = z.object({
        tags: z.array(z.string()).or(z.string()),
      });

      const params = new URLSearchParams();
      params.append('tags', 'one');
      params.append('tags', 'two');

      const result = validateSearchParams(ArraySchema, params);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for missing params', () => {
      const params = new URLSearchParams();
      const result = validateSearchParams(QuerySchema, params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });
  });

  describe('validateRouteParams', () => {
    it('should validate route params with IdParamsSchema', () => {
      const result = validateRouteParams(IdParamsSchema, {
        id: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('id');
      }
    });

    it('should reject invalid UUID in route params', () => {
      const result = validateRouteParams(IdParamsSchema, { id: 'not-a-uuid' });

      expect(result.success).toBe(false);
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid route parameters' }),
        expect.any(Object)
      );
    });
  });

  describe('Type Guards', () => {
    const TestSchema = z.object({ value: z.string() });

    describe('isValidationSuccess', () => {
      it('should return true for successful validation', () => {
        const result = validateRequest(TestSchema, { value: 'test' });
        expect(isValidationSuccess(result)).toBe(true);
      });

      it('should return false for failed validation', () => {
        const result = validateRequest(TestSchema, { value: 123 });
        expect(isValidationSuccess(result)).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('should return false for successful validation', () => {
        const result = validateRequest(TestSchema, { value: 'test' });
        expect(isValidationError(result)).toBe(false);
      });

      it('should return true for failed validation', () => {
        const result = validateRequest(TestSchema, { value: 123 });
        expect(isValidationError(result)).toBe(true);
      });
    });
  });

  describe('safeParse', () => {
    const TestSchema = z.object({ name: z.string() });

    it('should return parsed data for valid input', () => {
      const result = safeParse(TestSchema, { name: 'John' });
      expect(result).toEqual({ name: 'John' });
    });

    it('should return undefined for invalid input', () => {
      const result = safeParse(TestSchema, { name: 123 });
      expect(result).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      const result = safeParse(TestSchema, null);
      expect(result).toBeUndefined();
    });
  });

  describe('createValidationError', () => {
    it('should create error response with message only', () => {
      createValidationError('Something went wrong');

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          message: 'Something went wrong',
        },
        { status: 400 }
      );
    });

    it('should create error response with details', () => {
      const details = [
        { field: 'name', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
      ];

      createValidationError('Multiple errors', details);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          message: 'Multiple errors',
          details,
        },
        { status: 400 }
      );
    });

    it('should use custom status code', () => {
      createValidationError('Not found', undefined, 404);

      expect(NextResponse.json).toHaveBeenCalledWith(expect.any(Object), { status: 404 });
    });
  });
});
