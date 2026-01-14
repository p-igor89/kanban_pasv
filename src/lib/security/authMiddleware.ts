/**
 * Authorization Middleware for API Routes
 * Provides functions to check user permissions in API handlers
 */

import { createClient } from '@/lib/supabase/server';
import { type BoardMemberRole } from '@/types/board';
import { type Permission, requirePermission, AuthorizationError } from './rbac';

/**
 * Error types
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError('You must be logged in to access this resource');
  }

  return user;
}

/**
 * Get user's role for a specific board
 */
export async function getUserBoardRole(
  boardId: string,
  userId: string
): Promise<BoardMemberRole | null> {
  const supabase = await createClient();

  // Check if user is board owner
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('user_id')
    .eq('id', boardId)
    .single();

  if (boardError) {
    return null;
  }

  if (board.user_id === userId) {
    return 'owner';
  }

  // Check board membership
  const { data: member, error: memberError } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError || !member) {
    return null;
  }

  return member.role as BoardMemberRole;
}

/**
 * Check if user has permission for a board operation
 * Returns the user's role if authorized, throws error otherwise
 */
export async function authorizeBoard(
  boardId: string,
  permission: Permission
): Promise<{ userId: string; role: BoardMemberRole }> {
  // Get current user
  const user = await getCurrentUser();

  // Get user's role for this board
  const role = await getUserBoardRole(boardId, user.id);

  // Check permission (convert null to undefined for type compatibility)
  requirePermission(role ?? undefined, permission);

  return {
    userId: user.id,
    role: role!,
  };
}

/**
 * Check if user has permission for a task operation
 * Includes ownership checks for task-specific operations
 */
export async function authorizeTask(
  boardId: string,
  taskId: string,
  permission: Permission
): Promise<{ userId: string; role: BoardMemberRole; isTaskOwner: boolean }> {
  // Get current user and board authorization
  const { userId, role } = await authorizeBoard(boardId, permission);

  // Get task to check ownership
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, board_id')
    .eq('id', taskId)
    .eq('board_id', boardId)
    .single();

  if (error || !task) {
    throw new Error('Task not found');
  }

  // For now, we don't track task creator, so isTaskOwner is always false
  // This can be extended when task creator tracking is added
  const isTaskOwner = false;

  return {
    userId,
    role,
    isTaskOwner,
  };
}

/**
 * Check if user has permission for a comment operation
 */
export async function authorizeComment(
  boardId: string,
  commentId: string,
  permission: Permission
): Promise<{ userId: string; role: BoardMemberRole; isCommentOwner: boolean }> {
  // Get current user and board authorization
  const { userId, role } = await authorizeBoard(boardId, permission);

  // Get comment to check ownership
  const supabase = await createClient();
  const { data: comment, error } = await supabase
    .from('comments')
    .select('id, user_id, task_id')
    .eq('id', commentId)
    .single();

  if (error || !comment) {
    throw new Error('Comment not found');
  }

  // Verify comment belongs to board's task
  const { data: task } = await supabase
    .from('tasks')
    .select('board_id')
    .eq('id', comment.task_id)
    .single();

  if (!task || task.board_id !== boardId) {
    throw new Error('Comment not found');
  }

  const isCommentOwner = comment.user_id === userId;

  return {
    userId,
    role,
    isCommentOwner,
  };
}

/**
 * Check if user has permission for an attachment operation
 */
export async function authorizeAttachment(
  boardId: string,
  attachmentId: string,
  permission: Permission
): Promise<{ userId: string; role: BoardMemberRole; isAttachmentOwner: boolean }> {
  // Get current user and board authorization
  const { userId, role } = await authorizeBoard(boardId, permission);

  // Get attachment to check ownership
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from('attachments')
    .select('id, user_id, task_id')
    .eq('id', attachmentId)
    .single();

  if (error || !attachment) {
    throw new Error('Attachment not found');
  }

  // Verify attachment belongs to board's task
  const { data: task } = await supabase
    .from('tasks')
    .select('board_id')
    .eq('id', attachment.task_id)
    .single();

  if (!task || task.board_id !== boardId) {
    throw new Error('Attachment not found');
  }

  const isAttachmentOwner = attachment.user_id === userId;

  return {
    userId,
    role,
    isAttachmentOwner,
  };
}

/**
 * Handle authorization errors in API routes
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message, code: error.code }, { status: 403 });
  }

  // Generic error
  console.error('Authorization error:', error);
  return Response.json({ error: 'An error occurred' }, { status: 500 });
}
