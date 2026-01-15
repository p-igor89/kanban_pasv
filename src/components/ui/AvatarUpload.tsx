'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  displayName: string | null;
  email: string;
  onUploadSuccess: (newAvatarUrl: string) => void;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-xl',
  lg: 'w-24 h-24 text-2xl',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export default function AvatarUpload({
  currentAvatarUrl,
  displayName,
  email,
  onUploadSuccess,
  onRemove,
  size = 'md',
  disabled = false,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitial = () => {
    return (displayName || email)?.[0]?.toUpperCase() || '?';
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use JPEG, PNG, GIF, or WebP.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetchWithCsrf('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadSuccess(data.avatar_url);
      toast.success('Avatar updated');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentAvatarUrl || !onRemove) return;

    setUploading(true);

    try {
      const response = await fetchWithCsrf('/api/profile/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove avatar');
      }

      onRemove();
      toast.success('Avatar removed');
    } catch (error) {
      console.error('Avatar remove error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className={`
          ${sizeClasses[size]}
          rounded-full bg-gray-200 dark:bg-gray-600
          flex items-center justify-center overflow-hidden
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed
          relative
        `}
      >
        {currentAvatarUrl ? (
          <Image src={currentAvatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
        ) : (
          <span className="font-medium text-gray-600 dark:text-gray-300">{getInitial()}</span>
        )}

        {/* Overlay on hover */}
        {!disabled && !uploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className={`${iconSizes[size]} text-white`} />
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          </div>
        )}
      </button>

      {/* Remove button */}
      {currentAvatarUrl && onRemove && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove avatar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
    </div>
  );
}
