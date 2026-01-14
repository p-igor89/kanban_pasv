import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/boards/[boardId]/tasks/[taskId]/attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const { data } = await supabase.storage
          .from('attachments')
          .createSignedUrl(attachment.storage_path, 3600); // 1 hour

        return {
          ...attachment,
          url: data?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ attachments: attachmentsWithUrls });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/tasks/[taskId]/attachments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; taskId: string }> }
) {
  try {
    const { boardId, taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop() || '';
    const filename = `${timestamp}-${randomStr}.${ext}`;
    const storagePath = `${boardId}/${taskId}/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create attachment record
    const { data: attachment, error } = await supabase
      .from('attachments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        filename,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600);

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      task_id: taskId,
      user_id: user.id,
      action: 'attachment_added',
      details: { attachment_id: attachment.id, filename: file.name },
    });

    return NextResponse.json(
      {
        attachment: {
          ...attachment,
          url: urlData?.signedUrl || null,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/boards/[boardId]/tasks/[taskId]/attachments?attachmentId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; taskId: string }> }
) {
  try {
    const { boardId, taskId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    // Get attachment to find storage path and verify ownership
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Only allow deletion by the uploader or board owner
    if (attachment.user_id !== user.id) {
      // Check if user is board owner
      const { data: board } = await supabase
        .from('boards')
        .select('user_id')
        .eq('id', boardId)
        .single();

      if (!board || board.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to delete this attachment' },
          { status: 403 }
        );
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue to delete DB record even if storage delete fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('activities').insert({
      board_id: boardId,
      task_id: taskId,
      user_id: user.id,
      action: 'attachment_deleted',
      details: { attachment_id: attachmentId, filename: attachment.filename },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
