// Board types for Supabase

// ============================================
// CORE TYPES
// ============================================

export interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: string;
  board_id: string;
  name: string;
  color: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  status_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority | null;
  tags: string[];
  assignee_name: string | null;
  assignee_color: string | null;
  due_date: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// BOARD MEMBERS (Sharing)
// ============================================

export type BoardMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardMemberRole;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  // Joined fields
  profile?: Profile;
}

// ============================================
// COMMENTS
// ============================================

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
}

// ============================================
// ATTACHMENTS
// ============================================

export interface Attachment {
  id: string;
  task_id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  // Computed
  url?: string;
}

// ============================================
// ACTIVITIES
// ============================================

export type ActivityAction =
  | 'board_created'
  | 'board_updated'
  | 'board_deleted'
  | 'status_created'
  | 'status_updated'
  | 'status_deleted'
  | 'status_reordered'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'task_reordered'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'attachment_added'
  | 'attachment_deleted'
  | 'member_invited'
  | 'member_removed'
  | 'member_role_changed';

export interface Activity {
  id: string;
  board_id: string;
  task_id: string | null;
  user_id: string;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
  // Joined fields
  profile?: Profile;
  task?: Pick<Task, 'id' | 'title'>;
}

// ============================================
// TEMPLATES
// ============================================

export interface BoardTemplateStatus {
  name: string;
  color: string;
  order: number;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_public: boolean;
  created_by: string | null;
  statuses: BoardTemplateStatus[];
  created_at: string;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'comment_added'
  | 'comment_mention'
  | 'board_invite'
  | 'board_role_changed'
  | 'task_moved'
  | 'task_updated';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  board_id: string | null;
  task_id: string | null;
  read_at: string | null;
  email_sent: boolean;
  created_at: string;
}

// ============================================
// PROFILES
// ============================================

export interface NotificationPreferences {
  email_task_assigned: boolean;
  email_task_due: boolean;
  email_comments: boolean;
  email_board_invites: boolean;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

// ============================================
// EXTENDED/COMPOSITE TYPES
// ============================================

export interface StatusWithTasks extends Status {
  tasks: Task[];
}

export interface BoardWithData extends Board {
  statuses: StatusWithTasks[];
}

export interface TaskWithDetails extends Task {
  comments?: Comment[];
  attachments?: Attachment[];
  status?: Status;
}

export interface BoardWithMembers extends Board {
  members: BoardMember[];
  statuses: StatusWithTasks[];
}

// ============================================
// SEARCH RESULTS
// ============================================

export interface SearchResult {
  id: string;
  board_id: string;
  board_name: string;
  status_id: string;
  status_name: string;
  title: string;
  description: string | null;
  priority: TaskPriority | null;
  tags: string[];
  due_date: string | null;
  rank: number;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateBoardRequest {
  name: string;
  description?: string;
  template_id?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: BoardMemberRole;
}

export interface UpdateMemberRoleRequest {
  role: BoardMemberRole;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
  notification_preferences?: Partial<NotificationPreferences>;
}
