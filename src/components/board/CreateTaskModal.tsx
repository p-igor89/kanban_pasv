'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Status } from '@/types/board';
import FormInput from '@/components/ui/FormInput';
import FormTextarea from '@/components/ui/FormTextarea';
import FormSelect from '@/components/ui/FormSelect';
import { useFormValidation, createValidationRules } from '@/hooks/useFormValidation';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    status_id: string;
    priority?: string;
    due_date?: string;
  }) => Promise<void>;
  statuses: Status[];
  defaultStatusId: string | null;
}

const validationRules = {
  title: createValidationRules.title(200),
  status_id: {
    required: 'Status is required',
  },
};

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  statuses,
  defaultStatusId,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const { getFieldError, handleBlur, validateAllFields, clearErrors, setFieldTouched } =
    useFormValidation<{
      title: string;
      status_id: string;
    }>(validationRules);

  useEffect(() => {
    if (isOpen) {
      setStatusId(defaultStatusId || statuses[0]?.id || '');
      setTitle('');
      setDescription('');
      setPriority('');
      setDueDate('');
      clearErrors();
    }
  }, [isOpen, defaultStatusId, statuses, clearErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateAllFields({ title, status_id: statusId });
    if (!isValid) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status_id: statusId,
        priority: priority || undefined,
        due_date: dueDate || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Task</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormInput
            id="title"
            type="text"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleBlur('title', title)}
            error={getFieldError('title')}
            placeholder="Task title"
            maxLength={200}
            showRequiredIndicator
            autoFocus
          />

          <FormTextarea
            id="description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            rows={3}
            maxLength={2000}
            showCharCount
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              id="status"
              label="Status"
              value={statusId}
              onChange={(e) => {
                setStatusId(e.target.value);
                setFieldTouched('status_id', true);
              }}
              onBlur={() => handleBlur('status_id', statusId)}
              error={getFieldError('status_id')}
              showRequiredIndicator
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              id="priority"
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </FormSelect>
          </div>

          <FormInput
            id="dueDate"
            type="date"
            label="Due Date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
