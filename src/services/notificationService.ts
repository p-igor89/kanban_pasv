import { createClient } from '@/lib/supabase/server';

export type NotificationType = 'board_invite' | 'task_assigned' | 'task_due' | 'comment_added';

interface NotificationEmailData {
  to: string;
  type: NotificationType;
  data: {
    recipientName?: string;
    boardName?: string;
    boardId?: string;
    taskTitle?: string;
    taskId?: string;
    inviterName?: string;
    assignerName?: string;
    commenterName?: string;
    commentText?: string;
    dueDate?: string;
  };
}

interface NotificationPreferences {
  email_task_assigned?: boolean;
  email_task_due?: boolean;
  email_comments?: boolean;
  email_board_invites?: boolean;
}

// Map notification type to preference key
const notificationPreferenceMap: Record<NotificationType, keyof NotificationPreferences> = {
  board_invite: 'email_board_invites',
  task_assigned: 'email_task_assigned',
  task_due: 'email_task_due',
  comment_added: 'email_comments',
};

/**
 * Check if user has enabled email notifications for a specific type
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (!profile?.notification_preferences) {
    // Default to true if preferences not set
    return true;
  }

  const prefs = profile.notification_preferences as NotificationPreferences;
  const preferenceKey = notificationPreferenceMap[notificationType];
  return prefs[preferenceKey] !== false;
}

/**
 * Send notification email via Supabase Edge Function
 */
export async function sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: data,
    });

    if (error) {
      console.error('Failed to send notification email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

/**
 * Create in-app notification and optionally send email
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  boardId?: string;
  taskId?: string;
  emailData?: NotificationEmailData['data'];
}): Promise<void> {
  const supabase = await createClient();
  const { userId, type, title, message, boardId, taskId, emailData } = params;

  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message: message || '',
    board_id: boardId || null,
    task_id: taskId || null,
  });

  // Check if user wants email notifications
  if (emailData) {
    const shouldSend = await shouldSendEmail(userId, type);

    if (shouldSend) {
      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (profile?.email) {
        await sendNotificationEmail({
          to: profile.email,
          type,
          data: emailData,
        });
      }
    }
  }
}

/**
 * Send comment notification to task owner/assignees
 */
export async function notifyOnComment(params: {
  boardId: string;
  taskId: string;
  taskTitle: string;
  boardName: string;
  commenterId: string;
  commenterName: string;
  commentText: string;
}): Promise<void> {
  const supabase = await createClient();
  const { boardId, taskId, taskTitle, boardName, commenterId, commenterName, commentText } = params;

  // Get task assignees and board members who should be notified
  // (excluding the commenter)
  const { data: boardMembers } = await supabase
    .from('board_members')
    .select('user_id')
    .eq('board_id', boardId)
    .neq('user_id', commenterId);

  if (!boardMembers || boardMembers.length === 0) return;

  for (const member of boardMembers) {
    await createNotification({
      userId: member.user_id,
      type: 'comment_added',
      title: `New comment on "${taskTitle}"`,
      message: `${commenterName} commented: "${commentText.slice(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
      boardId,
      taskId,
      emailData: {
        boardId,
        boardName,
        taskId,
        taskTitle,
        commenterName,
        commentText: commentText.slice(0, 500),
      },
    });
  }
}

/**
 * Send board invite notification
 */
export async function notifyOnBoardInvite(params: {
  boardId: string;
  boardName: string;
  inviteeId: string;
  inviteeName: string;
  inviterName: string;
}): Promise<void> {
  const { boardId, boardName, inviteeId, inviteeName, inviterName } = params;

  await createNotification({
    userId: inviteeId,
    type: 'board_invite',
    title: `You've been invited to "${boardName}"`,
    message: `${inviterName} invited you to collaborate`,
    boardId,
    emailData: {
      boardId,
      boardName,
      recipientName: inviteeName,
      inviterName,
    },
  });
}
