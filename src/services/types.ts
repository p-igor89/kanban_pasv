/**
 * Service Layer Types
 * Shared types and interfaces for service layer
 */

import type { Board, BoardWithData, Task, Status, BoardMember } from '@/types/board';

/**
 * Service response wrapper
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Service error
 */
export interface ServiceError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * API fetch options
 */
export interface ApiFetchOptions extends RequestInit {
  withAuth?: boolean;
  timeout?: number;
}

/**
 * Board API responses
 */
export interface BoardResponse {
  board: BoardWithData;
  userRole?: string;
}

export interface BoardsListResponse {
  boards: (Board & {
    role?: string;
    statuses_count?: number;
    tasks_count?: number;
    is_shared?: boolean;
  })[];
}

/**
 * Task API responses
 */
export interface TaskResponse {
  task: Task;
}

export interface TasksListResponse {
  tasks: Task[];
  total?: number;
}

/**
 * Status API responses
 */
export interface StatusResponse {
  status: Status;
}

export interface StatusesListResponse {
  statuses: Status[];
}

/**
 * Member API responses
 */
export interface MembersListResponse {
  members: BoardMember[];
}
