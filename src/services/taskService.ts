/**
 * Task Service
 * Handles all task-related API operations
 */

import { apiClient } from './apiClient';
import type { ServiceResponse, TaskResponse, TasksListResponse } from './types';
import type { Task, TaskPriority } from '@/types/board';

export class TaskService {
  /**
   * Get tasks for a board
   */
  async getTasks(
    boardId: string,
    params?: {
      status_id?: string;
      priority?: TaskPriority;
      search?: string;
      assignee_name?: string;
      due_before?: string;
      due_after?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ServiceResponse<TasksListResponse>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const url = `/boards/${boardId}/tasks${query ? `?${query}` : ''}`;

    return apiClient.get<TasksListResponse>(url);
  }

  /**
   * Get single task by ID
   */
  async getTask(boardId: string, taskId: string): Promise<ServiceResponse<TaskResponse>> {
    return apiClient.get<TaskResponse>(`/boards/${boardId}/tasks/${taskId}`);
  }

  /**
   * Create new task
   */
  async createTask(
    boardId: string,
    data: {
      title: string;
      description?: string;
      status_id: string;
      priority?: TaskPriority;
      tags?: string[];
      assignee_name?: string;
      assignee_color?: string;
      due_date?: string;
    }
  ): Promise<ServiceResponse<TaskResponse>> {
    return apiClient.post<TaskResponse>(`/boards/${boardId}/tasks`, data);
  }

  /**
   * Update task
   */
  async updateTask(
    boardId: string,
    taskId: string,
    data: Partial<Task>
  ): Promise<ServiceResponse<TaskResponse>> {
    return apiClient.put<TaskResponse>(`/boards/${boardId}/tasks/${taskId}`, data);
  }

  /**
   * Delete task
   */
  async deleteTask(boardId: string, taskId: string): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}/tasks/${taskId}`);
  }

  /**
   * Move task to different status
   */
  async moveTask(
    boardId: string,
    taskId: string,
    data: {
      status_id: string;
      order: number;
    }
  ): Promise<ServiceResponse<TaskResponse>> {
    return apiClient.patch<TaskResponse>(`/boards/${boardId}/tasks/${taskId}/move`, data);
  }

  /**
   * Reorder tasks within same status
   */
  async reorderTasks(
    boardId: string,
    tasks: Array<{ id: string; order: number }>
  ): Promise<ServiceResponse<void>> {
    return apiClient.patch<void>(`/boards/${boardId}/tasks/reorder`, { tasks });
  }

  /**
   * Bulk reorder tasks (drag & drop)
   */
  async bulkReorderTasks(
    boardId: string,
    updates: Array<{ id: string; status_id: string; order: number }>
  ): Promise<ServiceResponse<void>> {
    return apiClient.patch<void>(`/boards/${boardId}/tasks/bulk-reorder`, { tasks: updates });
  }

  /**
   * Add comment to task
   */
  async addComment(
    boardId: string,
    taskId: string,
    content: string
  ): Promise<ServiceResponse<unknown>> {
    return apiClient.post(`/boards/${boardId}/tasks/${taskId}/comments`, { content });
  }

  /**
   * Update comment
   */
  async updateComment(
    boardId: string,
    taskId: string,
    commentId: string,
    content: string
  ): Promise<ServiceResponse<unknown>> {
    return apiClient.put(`/boards/${boardId}/tasks/${taskId}/comments/${commentId}`, {
      content,
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(
    boardId: string,
    taskId: string,
    commentId: string
  ): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}/tasks/${taskId}/comments/${commentId}`);
  }

  /**
   * Upload attachment
   */
  async uploadAttachment(
    boardId: string,
    taskId: string,
    file: File
  ): Promise<ServiceResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post(`/boards/${boardId}/tasks/${taskId}/attachments`, formData, {
      headers: {
        // Let browser set Content-Type for FormData (includes boundary)
      },
    });
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(
    boardId: string,
    taskId: string,
    attachmentId: string
  ): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}/tasks/${taskId}/attachments/${attachmentId}`);
  }
}

/**
 * Default task service instance
 */
export const taskService = new TaskService();
