import { NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Result type for validation operations
 * Either contains validated data or an error response
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

/**
 * Options for customizing validation behavior
 */
export interface ValidateOptions {
  /** Custom error message prefix */
  errorPrefix?: string;
  /** HTTP status code for validation errors (default: 400) */
  statusCode?: number;
}

// ============================================
// ERROR FORMATTING
// ============================================

/**
 * Zod issue type for error formatting
 */
interface ZodIssue {
  path: (string | number)[];
  message: string;
}

/**
 * Format Zod errors into a user-friendly structure
 */
function formatZodErrors(error: ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  // Zod v4 uses .issues instead of .errors
  const issues: ZodIssue[] = (error as unknown as { issues: ZodIssue[] }).issues || [];
  const errors = issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

  // Create a summary message
  const fieldErrors = errors.slice(0, 3).map((e) => `${e.field}: ${e.message}`);
  const message =
    errors.length > 3
      ? `${fieldErrors.join('; ')} (+${errors.length - 3} more)`
      : fieldErrors.join('; ');

  return { message, errors };
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates data against a Zod schema and returns either the validated data
 * or a NextResponse error suitable for API routes
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate (usually from request body or query params)
 * @param options - Optional configuration for error handling
 * @returns ValidationResult with either success: true and data, or success: false and error
 *
 * @example
 * ```typescript
 * import { validateRequest } from '@/lib/validation/validate';
 * import { CreateTaskSchema } from '@/lib/validation/schemas';
 *
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   const validation = validateRequest(CreateTaskSchema, body);
 *
 *   if (!validation.success) {
 *     return validation.error;
 *   }
 *
 *   // validation.data is now typed as CreateTaskInput
 *   const task = await createTask(validation.data);
 *   return NextResponse.json(task, { status: 201 });
 * }
 * ```
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown,
  options: ValidateOptions = {}
): ValidationResult<T> {
  const { errorPrefix = 'Validation failed', statusCode = 400 } = options;

  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const { message, errors } = formatZodErrors(error);
      return {
        success: false,
        error: NextResponse.json(
          {
            error: errorPrefix,
            message,
            details: errors,
          },
          { status: statusCode }
        ),
      };
    }

    // Re-throw non-Zod errors
    throw error;
  }
}

/**
 * Validates request body from a Request object
 * Handles JSON parsing errors gracefully
 *
 * @param schema - The Zod schema to validate against
 * @param request - The incoming Request object
 * @param options - Optional configuration for error handling
 * @returns ValidationResult with either success: true and data, or success: false and error
 *
 * @example
 * ```typescript
 * import { validateRequestBody } from '@/lib/validation/validate';
 * import { CreateBoardSchema } from '@/lib/validation/schemas';
 *
 * export async function POST(request: Request) {
 *   const validation = await validateRequestBody(CreateBoardSchema, request);
 *
 *   if (!validation.success) {
 *     return validation.error;
 *   }
 *
 *   const board = await createBoard(validation.data);
 *   return NextResponse.json(board, { status: 201 });
 * }
 * ```
 */
export async function validateRequestBody<T>(
  schema: ZodSchema<T>,
  request: Request,
  options: ValidateOptions = {}
): Promise<ValidationResult<T>> {
  const { statusCode = 400 } = options;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        },
        { status: statusCode }
      ),
    };
  }

  return validateRequest(schema, body, options);
}

/**
 * Validates URL search parameters
 *
 * @param schema - The Zod schema to validate against
 * @param searchParams - URLSearchParams or URL string to extract params from
 * @param options - Optional configuration for error handling
 * @returns ValidationResult with either success: true and data, or success: false and error
 *
 * @example
 * ```typescript
 * import { validateSearchParams } from '@/lib/validation/validate';
 * import { TaskListQuerySchema } from '@/lib/validation/schemas';
 *
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url);
 *   const validation = validateSearchParams(TaskListQuerySchema, searchParams);
 *
 *   if (!validation.success) {
 *     return validation.error;
 *   }
 *
 *   const tasks = await listTasks(validation.data);
 *   return NextResponse.json(tasks);
 * }
 * ```
 */
export function validateSearchParams<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams | string,
  options: ValidateOptions = {}
): ValidationResult<T> {
  const params =
    typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;

  // Convert URLSearchParams to object
  const data: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    const existing = data[key];
    if (existing !== undefined) {
      // Handle multiple values for same key
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        data[key] = [existing, value];
      }
    } else {
      data[key] = value;
    }
  });

  return validateRequest(schema, data, options);
}

/**
 * Validates route parameters (e.g., [id] segments)
 *
 * @param schema - The Zod schema to validate against
 * @param params - The route params object
 * @param options - Optional configuration for error handling
 * @returns ValidationResult with either success: true and data, or success: false and error
 *
 * @example
 * ```typescript
 * import { validateRouteParams } from '@/lib/validation/validate';
 * import { UUIDSchema } from '@/lib/validation/schemas';
 * import { z } from 'zod';
 *
 * const RouteParamsSchema = z.object({
 *   id: UUIDSchema,
 * });
 *
 * export async function GET(
 *   request: Request,
 *   { params }: { params: Promise<{ id: string }> }
 * ) {
 *   const resolvedParams = await params;
 *   const validation = validateRouteParams(RouteParamsSchema, resolvedParams);
 *
 *   if (!validation.success) {
 *     return validation.error;
 *   }
 *
 *   const task = await getTask(validation.data.id);
 *   return NextResponse.json(task);
 * }
 * ```
 */
export function validateRouteParams<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | string[] | undefined>,
  options: ValidateOptions = {}
): ValidationResult<T> {
  return validateRequest(schema, params, {
    errorPrefix: 'Invalid route parameters',
    ...options,
  });
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if validation was successful
 * Useful for type narrowing in conditional branches
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if validation failed
 * Useful for type narrowing in conditional branches
 */
export function isValidationError<T>(
  result: ValidationResult<T>
): result is { success: false; error: NextResponse } {
  return !result.success;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Safely parse data with a Zod schema without throwing
 * Returns the parsed data or undefined
 *
 * @param schema - The Zod schema to parse with
 * @param data - The data to parse
 * @returns The parsed data or undefined if parsing fails
 */
export function safeParse<T>(schema: ZodSchema<T>, data: unknown): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

/**
 * Create a custom error response for validation
 * Useful when you need to return validation-style errors manually
 *
 * @param message - The error message
 * @param details - Optional array of field-specific errors
 * @param statusCode - HTTP status code (default: 400)
 */
export function createValidationError(
  message: string,
  details?: Array<{ field: string; message: string }>,
  statusCode: number = 400
): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      message,
      ...(details && { details }),
    },
    { status: statusCode }
  );
}

// ============================================
// SCHEMA COMPOSITION HELPERS
// ============================================

/**
 * Creates an "id params" schema for route handlers
 * Commonly used for [id] route segments
 */
export function createIdParamsSchema(fieldName: string = 'id') {
  return z.object({
    [fieldName]: z.string().uuid(`Invalid ${fieldName} format`),
  });
}

/**
 * Common route param schemas for convenience
 */
export const IdParamsSchema = createIdParamsSchema('id');
export const BoardIdParamsSchema = createIdParamsSchema('board_id');
export const TaskIdParamsSchema = createIdParamsSchema('task_id');
export const StatusIdParamsSchema = createIdParamsSchema('status_id');
