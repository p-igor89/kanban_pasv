'use client';

import { ArrowLeft, Plus, Users } from 'lucide-react';
import type { BoardWithData } from '@/types/board';

interface BoardHeaderProps {
  board: BoardWithData;
  canEdit: boolean;
  onBack: () => void;
  onOpenMembers: () => void;
  onOpenStatusModal: () => void;
}

export function BoardHeader({
  board,
  canEdit,
  onBack,
  onOpenMembers,
  onOpenStatusModal,
}: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Left side - Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Back to boards"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {board.name}
          </h1>
          {board.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {board.description}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMembers}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Manage board members"
        >
          <Users className="h-4 w-4" />
          Members
        </button>

        {canEdit && (
          <button
            onClick={onOpenStatusModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            aria-label="Add new status"
          >
            <Plus className="h-4 w-4" />
            Add Status
          </button>
        )}
      </div>
    </header>
  );
}
