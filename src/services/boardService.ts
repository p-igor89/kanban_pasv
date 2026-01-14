/**
 * Board Service
 * Handles all board-related API operations
 */

import { apiClient } from './apiClient';
import type { ServiceResponse, BoardResponse, BoardsListResponse } from './types';
import type { BoardWithData } from '@/types/board';

export class BoardService {
  /**
   * Get all boards for current user
   */
  async getBoards(): Promise<ServiceResponse<BoardsListResponse>> {
    return apiClient.get<BoardsListResponse>('/boards');
  }

  /**
   * Get single board by ID
   */
  async getBoard(boardId: string): Promise<ServiceResponse<BoardResponse>> {
    return apiClient.get<BoardResponse>(`/boards/${boardId}`);
  }

  /**
   * Create new board
   */
  async createBoard(data: {
    name: string;
    description?: string;
    template_id?: string;
  }): Promise<ServiceResponse<{ board: BoardWithData }>> {
    return apiClient.post<{ board: BoardWithData }>('/boards', data);
  }

  /**
   * Update board
   */
  async updateBoard(
    boardId: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<ServiceResponse<{ board: BoardWithData }>> {
    return apiClient.put<{ board: BoardWithData }>(`/boards/${boardId}`, data);
  }

  /**
   * Delete board
   */
  async deleteBoard(boardId: string): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}`);
  }

  /**
   * Get board members
   */
  async getBoardMembers(boardId: string): Promise<ServiceResponse<unknown>> {
    return apiClient.get(`/boards/${boardId}/members`);
  }

  /**
   * Invite member to board
   */
  async inviteMember(
    boardId: string,
    data: {
      email: string;
      role: string;
    }
  ): Promise<ServiceResponse<unknown>> {
    return apiClient.post(`/boards/${boardId}/members`, data);
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    boardId: string,
    memberId: string,
    data: { role: string }
  ): Promise<ServiceResponse<unknown>> {
    return apiClient.patch(`/boards/${boardId}/members/${memberId}`, data);
  }

  /**
   * Remove member from board
   */
  async removeMember(boardId: string, memberId: string): Promise<ServiceResponse<void>> {
    return apiClient.delete<void>(`/boards/${boardId}/members/${memberId}`);
  }
}

/**
 * Default board service instance
 */
export const boardService = new BoardService();
