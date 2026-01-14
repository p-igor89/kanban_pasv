'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Tag, User, Flag, MessageSquare, AlertCircle } from 'lucide-react';
import { Task, Status } from '@/types/board';
import TaskComments from './TaskComments';
import TaskAttachments from './TaskAttachments';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useFormValidation, createValidationRules } from '@/hooks/useFormValidation';

const validationRules = {
  title: createValidationRules.title(200),
};

interface TaskDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
  statuses: Status[];
  boardId: string;
}

const priorityOptions = [
  { value: '', label: 'None', color: 'gray' },
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

export default function TaskDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  statuses,
  boardId,
}: TaskDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeColor, setAssigneeColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { getFieldError, handleBlur, validateAllFields, clearErrors, setFieldTouched } =
    useFormValidation<{ title: string }>(validationRules);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatusId(task.status_id);
      setPriority(task.priority || '');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setTags(task.tags || []);
      setAssigneeName(task.assignee_name || '');
      setAssigneeColor(task.assignee_color || '#6366f1');
      clearErrors();
    }
  }, [task, clearErrors]);

  const handleSave = async () => {
    if (!task) return;

    const isValid = validateAllFields({ title });
    if (!isValid) return;

    setSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority: (priority as Task['priority']) || null,
        due_date: dueDate || null,
        tags,
        assignee_name: assigneeName.trim() || null,
        assignee_color: assigneeName.trim() ? assigneeColor : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    if (!task || newStatusId === statusId) return;

    setStatusId(newStatusId);
    await onUpdate(task.id, { status_id: newStatusId } as Partial<Task>);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (task) {
      onDelete(task.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteClick}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldTouched('title', true);
                }}
                onBlur={() => handleBlur('title', title)}
                maxLength={200}
                className={`w-full text-xl font-semibold bg-transparent border-b-2 focus:outline-none pb-2 text-gray-900 dark:text-white placeholder-gray-400 transition-colors ${
                  getFieldError('title')
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-transparent focus:border-blue-500'
                }`}
                placeholder="Task title"
              />
              {getFieldError('title') && (
                <AlertCircle className="absolute right-0 top-1 h-5 w-5 text-red-500" />
              )}
            </div>
            {getFieldError('title') && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {getFieldError('title')}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">{title.length}/200 characters</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Flag className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={statusId}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Flag className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="Assignee name"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="color"
              value={assigneeColor}
              onChange={(e) => setAssigneeColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Tag className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags ({tags.length}/10)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm rounded"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {tags.length >= 10 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                Maximum of 10 tags reached
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder={tags.length >= 10 ? 'Tag limit reached' : 'Add tag'}
                disabled={tags.length >= 10}
                maxLength={50}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.length >= 10}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Add a description..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/2000</p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Attachments Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <TaskAttachments boardId={boardId} taskId={task.id} />
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity</span>
            </div>
            <TaskComments boardId={boardId} taskId={task.id} />
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Created: {new Date(task.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task?.title}"? This will also delete all comments and attachments.`}
        confirmText="Delete Task"
        icon="delete"
        variant="danger"
      />
    </>
  );
}
