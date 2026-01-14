import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const BoardMemberRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer']);

export const ActivityActionEnum = z.enum([
  'board_created',
  'board_updated',
  'board_deleted',
  'status_created',
  'status_updated',
  'status_deleted',
  'status_reordered',
  'task_created',
  'task_updated',
  'task_deleted',
  'task_moved',
  'task_reordered',
  'comment_added',
  'comment_updated',
  'comment_deleted',
  'attachment_added',
  'attachment_deleted',
  'member_invited',
  'member_removed',
  'member_role_changed',
]);

export const NotificationTypeEnum = z.enum([
  'task_assigned',
  'task_due_soon',
  'task_overdue',
  'comment_added',
  'comment_mention',
  'board_invite',
  'board_role_changed',
  'task_moved',
  'task_updated',
]);

// ============================================
// COMMON SCHEMAS
// ============================================

/** UUID v4 validation */
export const UUIDSchema = z.string().uuid('Invalid UUID format');

/** ISO date string validation */
export const ISODateSchema = z.string().datetime({ message: 'Invalid ISO date format' });

/** Hex color validation (e.g., #FF5733) */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (e.g., #FF5733)');

/** Tag validation (max 50 chars, alphanumeric with spaces/hyphens) */
export const TagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(50, 'Tag must be at most 50 characters')
  .trim();

/** Tags array validation (max 10 tags, no default) */
export const TagsArraySchemaBase = z.array(TagSchema).max(10, 'Maximum 10 tags allowed');

/** Tags array validation with default empty array (for create operations) */
export const TagsArraySchema = TagsArraySchemaBase.default([]);

// ============================================
// TASK SCHEMAS
// ============================================

/** Schema for creating a new task */
export const CreateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .nullish()
    .transform((val) => val || null),
  status_id: UUIDSchema,
  priority: TaskPriorityEnum.nullish().transform((val) => val || null),
  tags: TagsArraySchema.optional().default([]),
  assignee_name: z
    .string()
    .max(100, 'Assignee name must be at most 100 characters')
    .trim()
    .nullish()
    .transform((val) => val || null),
  assignee_color: HexColorSchema.nullish().transform((val) => val || null),
  due_date: ISODateSchema.nullish().transform((val) => val || null),
  order: z.number().int().nonnegative().optional(),
});

/** Schema for updating an existing task (all fields optional) */
export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be at most 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .nullish()
    .transform((val) => val ?? undefined),
  status_id: UUIDSchema.optional(),
  priority: TaskPriorityEnum.nullish(),
  tags: TagsArraySchemaBase.optional(),
  assignee_name: z
    .string()
    .max(100, 'Assignee name must be at most 100 characters')
    .trim()
    .nullish(),
  assignee_color: HexColorSchema.nullish(),
  due_date: ISODateSchema.nullish(),
  order: z.number().int().nonnegative().optional(),
});

/** Schema for task reordering */
export const ReorderTaskSchema = z.object({
  task_id: UUIDSchema,
  status_id: UUIDSchema,
  order: z.number().int().nonnegative(),
});

/** Schema for bulk task reordering */
export const BulkReorderTasksSchema = z.object({
  tasks: z.array(ReorderTaskSchema).min(1, 'At least one task required'),
});

// ============================================
// BOARD SCHEMAS
// ============================================

/** Schema for creating a new board */
export const CreateBoardSchema = z.object({
  name: z
    .string()
    .min(1, 'Board name is required')
    .max(100, 'Board name must be at most 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .nullish()
    .transform((val) => val || null),
  template_id: UUIDSchema.optional(),
});

/** Schema for updating an existing board */
export const UpdateBoardSchema = z.object({
  name: z
    .string()
    .min(1, 'Board name cannot be empty')
    .max(100, 'Board name must be at most 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .nullish(),
});

// ============================================
// STATUS SCHEMAS
// ============================================

/** Schema for creating a new status column */
export const CreateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(50, 'Status name must be at most 50 characters')
    .trim(),
  color: HexColorSchema,
  order: z.number().int().nonnegative().optional(),
});

/** Schema for updating an existing status column */
export const UpdateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name cannot be empty')
    .max(50, 'Status name must be at most 50 characters')
    .trim()
    .optional(),
  color: HexColorSchema.optional(),
  order: z.number().int().nonnegative().optional(),
});

/** Schema for status reordering */
export const ReorderStatusSchema = z.object({
  status_id: UUIDSchema,
  order: z.number().int().nonnegative(),
});

/** Schema for bulk status reordering */
export const BulkReorderStatusesSchema = z.object({
  statuses: z.array(ReorderStatusSchema).min(1, 'At least one status required'),
});

// ============================================
// COMMENT SCHEMAS
// ============================================

/** Schema for creating a new comment */
export const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be at most 5000 characters')
    .trim(),
});

/** Schema for updating an existing comment */
export const UpdateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be at most 5000 characters')
    .trim(),
});

// ============================================
// BOARD MEMBER SCHEMAS
// ============================================

/** Schema for inviting a member to a board */
export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  role: BoardMemberRoleEnum.refine((role) => role !== 'owner', {
    message: 'Cannot invite as owner',
  }),
});

/** Schema for updating a member's role */
export const UpdateMemberRoleSchema = z.object({
  role: BoardMemberRoleEnum.refine((role) => role !== 'owner', {
    message: 'Cannot change role to owner',
  }),
});

// ============================================
// SEARCH & QUERY SCHEMAS
// ============================================

/** Schema for search queries */
export const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .trim(),
  board_id: UUIDSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/** Schema for task list query parameters */
export const TaskListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status_id: UUIDSchema.optional(),
  priority: TaskPriorityEnum.optional(),
  search: z.string().max(200).trim().optional(),
  assignee_name: z.string().max(100).trim().optional(),
  due_before: ISODateSchema.optional(),
  due_after: ISODateSchema.optional(),
  sort_by: z
    .enum(['created_at', 'updated_at', 'due_date', 'priority', 'order', 'title'])
    .optional()
    .default('order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================
// PROFILE SCHEMAS
// ============================================

/** Schema for notification preferences */
export const NotificationPreferencesSchema = z.object({
  email_task_assigned: z.boolean().optional(),
  email_task_due: z.boolean().optional(),
  email_comments: z.boolean().optional(),
  email_board_invites: z.boolean().optional(),
});

/** Schema for updating user profile */
export const UpdateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name must be at most 100 characters')
    .trim()
    .optional(),
  avatar_url: z.string().url('Invalid URL').max(500).optional(),
  notification_preferences: NotificationPreferencesSchema.optional(),
});

// ============================================
// PAGINATION SCHEMA
// ============================================

/** Generic pagination schema */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ============================================
// INFERRED TYPES
// ============================================

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ReorderTaskInput = z.infer<typeof ReorderTaskSchema>;
export type BulkReorderTasksInput = z.infer<typeof BulkReorderTasksSchema>;

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;

export type CreateStatusInput = z.infer<typeof CreateStatusSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type ReorderStatusInput = z.infer<typeof ReorderStatusSchema>;
export type BulkReorderStatusesInput = z.infer<typeof BulkReorderStatusesSchema>;

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type TaskListQueryInput = z.infer<typeof TaskListQuerySchema>;

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export type PaginationInput = z.infer<typeof PaginationSchema>;

// Re-export enum types
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;
export type BoardMemberRole = z.infer<typeof BoardMemberRoleEnum>;
export type ActivityAction = z.infer<typeof ActivityActionEnum>;
export type NotificationType = z.infer<typeof NotificationTypeEnum>;
