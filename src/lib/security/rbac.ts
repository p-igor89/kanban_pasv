/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions and authorization checks for board operations
 */

import { type BoardMemberRole } from '@/types/board';

/**
 * Permission types for board operations
 */
export type Permission =
  // Board permissions
  | 'board:read'
  | 'board:update'
  | 'board:delete'
  // Status permissions
  | 'status:create'
  | 'status:update'
  | 'status:delete'
  | 'status:reorder'
  // Task permissions
  | 'task:read'
  | 'task:create'
  | 'task:update'
  | 'task:delete'
  | 'task:move'
  | 'task:reorder'
  // Member permissions
  | 'member:read'
  | 'member:invite'
  | 'member:remove'
  | 'member:update_role'
  // Comment permissions
  | 'comment:read'
  | 'comment:create'
  | 'comment:update_own'
  | 'comment:delete_own'
  | 'comment:delete_any'
  // Attachment permissions
  | 'attachment:read'
  | 'attachment:create'
  | 'attachment:delete_own'
  | 'attachment:delete_any'
  // Activity permissions
  | 'activity:read';

/**
 * Role permission matrix
 * Defines which permissions each role has
 */
const ROLE_PERMISSIONS: Record<BoardMemberRole, Set<Permission>> = {
  owner: new Set([
    // Board - full control
    'board:read',
    'board:update',
    'board:delete',
    // Status - full control
    'status:create',
    'status:update',
    'status:delete',
    'status:reorder',
    // Task - full control
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'task:move',
    'task:reorder',
    // Member - full control
    'member:read',
    'member:invite',
    'member:remove',
    'member:update_role',
    // Comment - full control
    'comment:read',
    'comment:create',
    'comment:update_own',
    'comment:delete_own',
    'comment:delete_any',
    // Attachment - full control
    'attachment:read',
    'attachment:create',
    'attachment:delete_own',
    'attachment:delete_any',
    // Activity
    'activity:read',
  ]),

  admin: new Set([
    // Board - read and update only
    'board:read',
    'board:update',
    // Status - full control
    'status:create',
    'status:update',
    'status:delete',
    'status:reorder',
    // Task - full control
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'task:move',
    'task:reorder',
    // Member - can invite and view
    'member:read',
    'member:invite',
    // Comment - full control
    'comment:read',
    'comment:create',
    'comment:update_own',
    'comment:delete_own',
    'comment:delete_any',
    // Attachment - full control
    'attachment:read',
    'attachment:create',
    'attachment:delete_own',
    'attachment:delete_any',
    // Activity
    'activity:read',
  ]),

  member: new Set([
    // Board - read only
    'board:read',
    // Status - create and reorder only
    'status:create',
    'status:reorder',
    // Task - full control
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'task:move',
    'task:reorder',
    // Member - read only
    'member:read',
    // Comment - own items only
    'comment:read',
    'comment:create',
    'comment:update_own',
    'comment:delete_own',
    // Attachment - own items only
    'attachment:read',
    'attachment:create',
    'attachment:delete_own',
    // Activity
    'activity:read',
  ]),

  viewer: new Set([
    // Board - read only
    'board:read',
    // Task - read only
    'task:read',
    // Member - read only
    'member:read',
    // Comment - read only
    'comment:read',
    // Attachment - read only
    'attachment:read',
    // Activity
    'activity:read',
  ]),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: BoardMemberRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.has(permission);
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: BoardMemberRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: BoardMemberRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: BoardMemberRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role]);
}

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
  constructor(
    message: string = 'You do not have permission to perform this action',
    public readonly code: string = 'FORBIDDEN'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Require permission check
 * Throws AuthorizationError if user doesn't have permission
 */
export function requirePermission(role: BoardMemberRole | undefined, permission: Permission): void {
  if (!role) {
    throw new AuthorizationError('You must be a member of this board', 'NOT_MEMBER');
  }

  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(
      `You do not have permission to perform this action (requires: ${permission})`,
      'FORBIDDEN'
    );
  }
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(
  role: BoardMemberRole | undefined,
  permissions: Permission[]
): void {
  if (!role) {
    throw new AuthorizationError('You must be a member of this board', 'NOT_MEMBER');
  }

  if (!hasAnyPermission(role, permissions)) {
    throw new AuthorizationError(
      `You do not have permission to perform this action (requires one of: ${permissions.join(', ')})`,
      'FORBIDDEN'
    );
  }
}

/**
 * Check if user can modify a resource they created
 * Used for comments, attachments, etc.
 */
export function canModifyOwn(
  role: BoardMemberRole | undefined,
  resourceUserId: string,
  currentUserId: string,
  permission: Permission
): boolean {
  if (!role) return false;

  // Owner and admin can modify any resource
  if (role === 'owner' || role === 'admin') {
    return hasPermission(role, permission);
  }

  // Others can only modify their own resources
  return resourceUserId === currentUserId && hasPermission(role, permission);
}

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'board:read': 'View board details',
  'board:update': 'Edit board name and description',
  'board:delete': 'Delete board',
  'status:create': 'Create new statuses',
  'status:update': 'Edit status names and colors',
  'status:delete': 'Delete statuses',
  'status:reorder': 'Reorder statuses',
  'task:read': 'View tasks',
  'task:create': 'Create new tasks',
  'task:update': 'Edit tasks',
  'task:delete': 'Delete tasks',
  'task:move': 'Move tasks between statuses',
  'task:reorder': 'Reorder tasks',
  'member:read': 'View board members',
  'member:invite': 'Invite new members',
  'member:remove': 'Remove members',
  'member:update_role': 'Change member roles',
  'comment:read': 'View comments',
  'comment:create': 'Add comments',
  'comment:update_own': 'Edit own comments',
  'comment:delete_own': 'Delete own comments',
  'comment:delete_any': 'Delete any comment',
  'attachment:read': 'View attachments',
  'attachment:create': 'Upload attachments',
  'attachment:delete_own': 'Delete own attachments',
  'attachment:delete_any': 'Delete any attachment',
  'activity:read': 'View activity log',
};

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<BoardMemberRole, string> = {
  owner: 'Full control over board, including deletion and member management',
  admin: 'Manage tasks, statuses, and invite members, but cannot delete board',
  member: 'Create and edit tasks and statuses, view board content',
  viewer: 'Read-only access to board content',
};
