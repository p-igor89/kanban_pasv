/**
 * Status Service
 * Handles all status (column) related API operations
 */

import { apiClient } from './apiClient';
import type { ServiceResponse, StatusResponse, StatusesListResponse } from './types';

export class StatusService {
  /**
   * Get all statuses for a board
   */
  async getStatuses(boardId: string): Promise<ServiceResponse<StatusesListResponse>> {
    return apiClient.get<StatusesListResponse>(`/boards/${boardId}/statuses`);
  }

  /**
   * Get single status by ID
   */
  async getStatus(boardId: string, statusId: string): Promise<ServiceResponse<StatusResponse>> {
    return apiClient.get<StatusResponse>(`/boards/${boardId}/statuses/${statusId}`);
  }

  /**
   * Create new status
   */
  async createStatus(
    boardId: string,
    data: {
      name: string;
      color: string;
      order?: number;
    }
  ): Promise<ServiceResponse<StatusResponse>> {
    return apiClient.post<StatusResponse>(`/boards/${boardId}/statuses`, data);
  }

  /**
   * Update status
   */
  async updateStatus(
    boardId: string,
    statusId: string,
    data: {
      name?: string;
      color?: string;
      order?: number;
    }
  ): Promise<ServiceResponse<StatusResponse>> {
    return apiClient.put<StatusResponse>(`/boards/${boardId}/statuses/${statusId}`, data);
  }

  /**
   * Delete status
   */
  async deleteStatus(boardId: string, statusId: string): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}/statuses/${statusId}`);
  }

  /**
   * Reorder statuses
   */
  async reorderStatuses(
    boardId: string,
    statuses: Array<{ id: string; order: number }>
  ): Promise<ServiceResponse<void>> {
    return apiClient.patch<void>(`/boards/${boardId}/statuses/reorder`, { statuses });
  }

  /**
   * Get task count for status
   */
  async getTaskCount(
    boardId: string,
    statusId: string
  ): Promise<ServiceResponse<{ count: number }>> {
    return apiClient.get<{ count: number }>(`/boards/${boardId}/statuses/${statusId}/count`);
  }
}

/**
 * Default status service instance
 */
export const statusService = new StatusService();
