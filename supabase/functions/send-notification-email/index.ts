// Supabase Edge Function for sending notification emails
// Deploy with: supabase functions deploy send-notification-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'KanbanPro <noreply@kanbanpro.app>';
const APP_URL = Deno.env.get('APP_URL') || 'https://kanbanpro.app';

interface NotificationPayload {
  to: string;
  type: 'board_invite' | 'task_assigned' | 'task_due' | 'comment_added';
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

const emailTemplates = {
  board_invite: (data: NotificationPayload['data']) => ({
    subject: `You've been invited to ${data.boardName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Board Invitation</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Hi ${data.recipientName || 'there'},
        </p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          <strong>${data.inviterName}</strong> has invited you to collaborate on the board <strong>"${data.boardName}"</strong>.
        </p>
        <a href="${APP_URL}/boards/${data.boardId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          View Board
        </a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
          - The KanbanPro Team
        </p>
      </div>
    `,
  }),
  task_assigned: (data: NotificationPayload['data']) => ({
    subject: `You've been assigned to "${data.taskTitle}"`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Task Assignment</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Hi ${data.recipientName || 'there'},
        </p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          <strong>${data.assignerName}</strong> has assigned you to the task <strong>"${data.taskTitle}"</strong> on the board <strong>"${data.boardName}"</strong>.
        </p>
        <a href="${APP_URL}/boards/${data.boardId}?task=${data.taskId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          View Task
        </a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
          - The KanbanPro Team
        </p>
      </div>
    `,
  }),
  task_due: (data: NotificationPayload['data']) => ({
    subject: `Task "${data.taskTitle}" is due soon`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Due Date Reminder</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Hi ${data.recipientName || 'there'},
        </p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          The task <strong>"${data.taskTitle}"</strong> is due on <strong>${data.dueDate}</strong>.
        </p>
        <a href="${APP_URL}/boards/${data.boardId}?task=${data.taskId}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          View Task
        </a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
          - The KanbanPro Team
        </p>
      </div>
    `,
  }),
  comment_added: (data: NotificationPayload['data']) => ({
    subject: `New comment on "${data.taskTitle}"`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">New Comment</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Hi ${data.recipientName || 'there'},
        </p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          <strong>${data.commenterName}</strong> commented on <strong>"${data.taskTitle}"</strong>:
        </p>
        <blockquote style="border-left: 4px solid #e5e7eb; margin: 16px 0; padding-left: 16px; color: #6b7280;">
          ${data.commentText}
        </blockquote>
        <a href="${APP_URL}/boards/${data.boardId}?task=${data.taskId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          View Task
        </a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
          - The KanbanPro Team
        </p>
      </div>
    `,
  }),
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const payload: NotificationPayload = await req.json();
    const { to, type, data } = payload;

    if (!to || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const template = emailTemplates[type];
    if (!template) {
      return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = template(data);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email send failed:', result);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: result }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
