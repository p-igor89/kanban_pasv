/**
 * Permission Hook
 * React hook for checking user permissions in components
 */

import { useMemo } from 'react';
import { type BoardMemberRole } from '@/types/board';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  type Permission,
} from '@/lib/security/rbac';

export interface UsePermissionsOptions {
  role: BoardMemberRole | undefined | null;
}

/**
 * Hook for checking permissions in components
 */
export function usePermissions({ role }: UsePermissionsOptions) {
  const normalizedRole = role || undefined;

  /**
   * Check if user has a specific permission
   */
  const can = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!normalizedRole) return false;
      return hasPermission(normalizedRole, permission);
    };
  }, [normalizedRole]);

  /**
   * Check if user has all specified permissions
   */
  const canAll = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      if (!normalizedRole) return false;
      return hasAllPermissions(normalizedRole, permissions);
    };
  }, [normalizedRole]);

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      if (!normalizedRole) return false;
      return hasAnyPermission(normalizedRole, permissions);
    };
  }, [normalizedRole]);

  /**
   * Common permission checks for convenience
   */
  const permissions = useMemo(() => {
    return {
      // Board permissions
      canViewBoard: can('board:read'),
      canEditBoard: can('board:update'),
      canDeleteBoard: can('board:delete'),

      // Status permissions
      canCreateStatus: can('status:create'),
      canEditStatus: can('status:update'),
      canDeleteStatus: can('status:delete'),
      canReorderStatus: can('status:reorder'),

      // Task permissions
      canViewTask: can('task:read'),
      canCreateTask: can('task:create'),
      canEditTask: can('task:update'),
      canDeleteTask: can('task:delete'),
      canMoveTask: can('task:move'),
      canReorderTask: can('task:reorder'),

      // Member permissions
      canViewMembers: can('member:read'),
      canInviteMember: can('member:invite'),
      canRemoveMember: can('member:remove'),
      canUpdateMemberRole: can('member:update_role'),

      // Comment permissions
      canViewComments: can('comment:read'),
      canAddComment: can('comment:create'),
      canEditOwnComment: can('comment:update_own'),
      canDeleteOwnComment: can('comment:delete_own'),
      canDeleteAnyComment: can('comment:delete_any'),

      // Attachment permissions
      canViewAttachments: can('attachment:read'),
      canUploadAttachment: can('attachment:create'),
      canDeleteOwnAttachment: can('attachment:delete_own'),
      canDeleteAnyAttachment: can('attachment:delete_any'),

      // Activity permissions
      canViewActivity: can('activity:read'),

      // Role checks
      isOwner: normalizedRole === 'owner',
      isAdmin: normalizedRole === 'admin',
      isMember: normalizedRole === 'member',
      isViewer: normalizedRole === 'viewer',
      isAtLeastAdmin: normalizedRole === 'owner' || normalizedRole === 'admin',
      isAtLeastMember:
        normalizedRole === 'owner' || normalizedRole === 'admin' || normalizedRole === 'member',
    };
  }, [normalizedRole, can]);

  return {
    role: normalizedRole,
    can,
    canAll,
    canAny,
    ...permissions,
  };
}

/**
 * Hook for checking if user can edit board content
 * Combines multiple permission checks
 */
export function useCanEdit(role: BoardMemberRole | undefined | null): boolean {
  const { canEditTask, canCreateTask, canDeleteTask } = usePermissions({ role });
  return canEditTask || canCreateTask || canDeleteTask;
}

/**
 * Hook for checking if user is board administrator
 * (owner or admin role)
 */
export function useIsAdmin(role: BoardMemberRole | undefined | null): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Hook for checking if user is board owner
 */
export function useIsOwner(role: BoardMemberRole | undefined | null): boolean {
  return role === 'owner';
}
