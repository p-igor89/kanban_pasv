// Re-export all schemas and types
export * from './schemas';

// Re-export validation helpers
export {
  validateRequest,
  validateRequestBody,
  validateSearchParams,
  validateRouteParams,
  isValidationSuccess,
  isValidationError,
  safeParse,
  createValidationError,
  createIdParamsSchema,
  IdParamsSchema,
  BoardIdParamsSchema,
  TaskIdParamsSchema,
  StatusIdParamsSchema,
} from './validate';

export type { ValidationResult, ValidateOptions } from './validate';
