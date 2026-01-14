/**
 * Security utilities for KanbanPro
 * Centralized exports for sanitization, rate limiting, and authorization
 */

// Sanitization utilities
export {
  sanitizeSearchInput,
  sanitizeString,
  sanitizeUUID,
  sanitizeStringArray,
  sanitizeTags,
  escapeHtml,
  type SanitizeStringOptions,
} from './sanitize';

// Rate limiting utilities
export {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  cleanupExpiredEntries,
  stopCleanupInterval,
  getRateLimitStoreSize,
  createRateLimitHeaders,
  enforceRateLimit,
  rateLimitConfigs,
  type RateLimitConfig,
  type RateLimitResult,
} from './rateLimit';

// RBAC (Role-Based Access Control)
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  requirePermission,
  requireAnyPermission,
  canModifyOwn,
  AuthorizationError,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
  type Permission,
} from './rbac';

// Authentication and Authorization Middleware
export {
  getCurrentUser,
  getUserBoardRole,
  authorizeBoard,
  authorizeTask,
  authorizeComment,
  authorizeAttachment,
  handleAuthError,
  AuthenticationError,
} from './authMiddleware';
