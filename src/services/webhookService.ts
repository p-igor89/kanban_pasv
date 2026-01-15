import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.moved'
  | 'comment.added'
  | 'member.invited'
  | 'member.removed';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  board_id: string;
  data: Record<string, unknown>;
}

interface Webhook {
  id: string;
  board_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  is_active: boolean;
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send webhook to configured URL
 */
async function sendWebhook(webhook: Webhook, payload: WebhookPayload): Promise<boolean> {
  const payloadStr = JSON.stringify(payload);
  const signature = await generateSignature(payloadStr, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body: payloadStr,
    });

    if (!response.ok) {
      console.error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Webhook delivery error:', error);
    return false;
  }
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  boardId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // Get all active webhooks for this board that subscribe to this event
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('board_id', boardId)
    .eq('is_active', true);

  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    board_id: boardId,
    data,
  };

  // Send to all webhooks that subscribe to this event
  const deliveryPromises = webhooks
    .filter((webhook) => {
      const events = webhook.events as WebhookEvent[];
      return events.includes(event);
    })
    .map((webhook) =>
      sendWebhook(webhook as unknown as Webhook, payload).then((success) => {
        // Log delivery attempt
        supabase.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event,
          payload: payload as unknown as Json,
          success,
          delivered_at: new Date().toISOString(),
        });
        return success;
      })
    );

  await Promise.allSettled(deliveryPromises);
}

/**
 * Create a new webhook for a board
 */
export async function createWebhook(params: {
  boardId: string;
  url: string;
  events: WebhookEvent[];
  userId: string;
}): Promise<{ webhook: Webhook | null; error: string | null }> {
  const supabase = await createClient();
  const { boardId, url, events, userId } = params;

  // Validate URL
  try {
    new URL(url);
  } catch {
    return { webhook: null, error: 'Invalid webhook URL' };
  }

  // Verify user has permission on board
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { webhook: null, error: 'Insufficient permissions' };
  }

  // Generate secret
  const secret = crypto.randomUUID() + crypto.randomUUID();

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert({
      board_id: boardId,
      url,
      events,
      secret,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { webhook: null, error: error.message };
  }

  return { webhook: webhook as unknown as Webhook, error: null };
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get webhook to verify ownership
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('board_id')
    .eq('id', webhookId)
    .single();

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  // Verify user has permission
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', webhook.board_id)
    .eq('user_id', userId)
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { error } = await supabase.from('webhooks').delete().eq('id', webhookId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Test a webhook by sending a ping event
 */
export async function testWebhook(
  webhookId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get webhook
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  // Verify user has permission
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', webhook.board_id)
    .eq('user_id', userId)
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Send test ping
  const success = await sendWebhook(webhook as unknown as Webhook, {
    event: 'task.created' as WebhookEvent, // Use a real event type for test
    timestamp: new Date().toISOString(),
    board_id: webhook.board_id,
    data: { test: true, message: 'Webhook test ping' },
  });

  return { success, error: success ? null : 'Webhook delivery failed' };
}
