'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  Upload,
  Loader2,
  Trash2,
  Download,
  File,
  Image,
  FileText,
  Cloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';

interface Attachment {
  id: string;
  task_id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  url?: string;
}

interface TaskAttachmentsProps {
  boardId: string;
  taskId: string;
}

interface UploadProgress {
  [filename: string]: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function TaskAttachments({ boardId, taskId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}/attachments`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attachments');
      }

      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await uploadFiles(Array.from(files));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    // Filter out files that are too large
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setUploading(true);

    // Initialize progress for all files
    const initialProgress: UploadProgress = {};
    validFiles.forEach((file) => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(initialProgress);

    // Upload files sequentially to avoid overwhelming the server
    for (const file of validFiles) {
      try {
        // Simulate progress (since we can't track actual upload progress with fetch)
        setUploadProgress((prev) => ({ ...prev, [file.name]: 30 }));

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        setUploadProgress((prev) => ({ ...prev, [file.name]: 70 }));

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload file');
        }

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        setAttachments((prev) => [...prev, data.attachment]);

        // Remove progress after success
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 500);

        toast.success(`${file.name} uploaded`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);

        // Remove progress on error
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    setUploading(false);
  };

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files));
    }
  };

  const handleDeleteClick = (attachmentId: string, filename: string) => {
    setDeleteTarget({ id: attachmentId, filename });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetchWithCsrf(
        `/api/boards/${boardId}/tasks/${taskId}/attachments?attachmentId=${deleteTarget.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete attachment');
      }

      setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success('File deleted');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </h3>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </span>
        </label>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="p-6 text-center">
          <Cloud
            className={`mx-auto h-12 w-12 mb-3 transition-colors ${
              isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
            }`}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDragging ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Drop files here to upload
              </span>
            ) : (
              <>
                Drag and drop files here, or{' '}
                <label className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Maximum file size: 10MB</p>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{filename}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No attachments yet
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mime_type);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                  {attachment.mime_type.startsWith('image/') && attachment.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {attachment.url && (
                    <a
                      href={attachment.url}
                      download={attachment.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteClick(attachment.id, attachment.filename)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteTarget?.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        icon="delete-file"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
