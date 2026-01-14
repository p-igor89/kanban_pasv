/**
 * Integration tests for Tasks API endpoints
 * Tests the full API route handlers with mocked Supabase client
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock Auth Middleware
jest.mock('@/lib/security/authMiddleware', () => ({
  authorizeBoard: jest.fn(),
  handleAuthError: jest.fn(),
}));

// Mock Security functions
jest.mock('@/lib/security', () => ({
  sanitizeSearchInput: jest.fn((input) => input),
  enforceRateLimit: jest.fn(),
  rateLimitConfigs: {
    api: {
      read: { windowMs: 60000, maxRequests: 100 },
      write: { windowMs: 60000, maxRequests: 30 },
    },
  },
}));

// Mock Validation functions
jest.mock('@/lib/validation', () => ({
  CreateTaskSchema: {},
  TaskListQuerySchema: {},
  validateRequestBody: jest.fn(),
  validateSearchParams: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { authorizeBoard, handleAuthError } from '@/lib/security/authMiddleware';
import { validateSearchParams, validateRequestBody } from '@/lib/validation';

describe('Tasks API - GET /api/boards/[boardId]/tasks', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create a chainable mock for Supabase queries
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock successful authorization by default
    (authorizeBoard as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      role: 'owner',
    });

    // Mock handleAuthError
    (handleAuthError as jest.Mock).mockImplementation((error: any) => {
      if (error.name === 'AuthenticationError') {
        return Response.json({ error: error.message }, { status: 401 });
      }
      if (error.name === 'AuthorizationError') {
        return Response.json({ error: error.message, code: error.code }, { status: 403 });
      }
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    });

    // Clear validation mocks - tests will set them up as needed
    (validateSearchParams as jest.Mock).mockClear();
    (validateRequestBody as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Mock authorization failure
      (authorizeBoard as jest.Mock).mockRejectedValue({
        name: 'AuthenticationError',
        message: 'Authentication required',
      });

      (handleAuthError as jest.Mock).mockReturnValue(
        Response.json({ error: 'Authentication required' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if board not found or not owned by user', async () => {
      // Mock authorization failure for board access
      (authorizeBoard as jest.Mock).mockRejectedValue({
        name: 'AuthorizationError',
        message: 'Board not found or access denied',
        code: 'BOARD_ACCESS_DENIED',
      });

      (handleAuthError as jest.Mock).mockReturnValue(
        Response.json(
          { error: 'Board not found or access denied', code: 'BOARD_ACCESS_DENIED' },
          { status: 403 }
        )
      );

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('Board not found or access denied');
    });
  });

  describe('Query Filters', () => {
    beforeEach(() => {
      // Set up successful validation for query filters
      (validateSearchParams as jest.Mock).mockReturnValue({
        success: true,
        data: { status_id: undefined, priority: undefined, search: undefined },
      });
    });

    it('should filter tasks by status_id', async () => {
      const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockTasks = [
        { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', title: 'Task 1', status_id: statusId },
        { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', title: 'Task 2', status_id: statusId },
      ];

      // Reset authorization mock to ensure success for this test
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });

      // Mock validation for this specific test with status_id
      (validateSearchParams as jest.Mock).mockReturnValue({
        success: true,
        data: { status_id: statusId, priority: undefined, search: undefined },
      });

      // Mock the final query result (not using .single() for tasks query)
      mockSupabase.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/boards/board-1/tasks?status_id=${statusId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('status_id', statusId);
    });

    it('should filter tasks by priority', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/boards/board-1/tasks?priority=high'
      );

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('priority', 'high');
    });

    it('should ignore invalid priority values', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/boards/board-1/tasks?priority=invalid'
      );

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      // Should not call eq with invalid priority
      const eqCalls = mockSupabase.eq.mock.calls;
      const priorityCall = eqCalls.find((call: any[]) => call[0] === 'priority');
      expect(priorityCall).toBeUndefined();
    });

    it('should search in title and description', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/boards/board-1/tasks?search=urgent'
      );

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'title.ilike.%urgent%,description.ilike.%urgent%'
      );
    });

    it('should order tasks by status_id and order', async () => {
      // Reset authorization for this test
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });

      // Create a special mock for this test that handles the chaining
      const finalOrderCall = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      mockSupabase.order
        .mockReturnValueOnce(mockSupabase) // First .order() call returns chainable object
        .mockReturnValueOnce(finalOrderCall); // Second .order() call returns promise

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      // Verify both order calls
      expect(mockSupabase.order).toHaveBeenNthCalledWith(1, 'status_id');
      expect(mockSupabase.order).toHaveBeenNthCalledWith(2, 'order', { ascending: true });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock successful authorization
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });
    });

    it('should return 500 on database error', async () => {
      // Reset authorization mock to ensure success for this test
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });

      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Failed to fetch tasks');
    });
  });
});

describe('Tasks API - POST /api/boards/[boardId]/tasks', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    beforeEach(() => {
      // Mock successful authorization
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });
    });

    it('should return 400 if title is missing', async () => {
      const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          status_id: statusId,
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('title');
    });

    it('should return 400 if title exceeds 200 characters', async () => {
      const longTitle = 'A'.repeat(201);

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: longTitle,
          status_id: 'status-1',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('200 characters');
    });

    it('should return 400 if status_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('status_id');
    });

    it('should return 400 for invalid priority', async () => {
      const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: statusId,
          priority: 'invalid',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('priority');
    });

    it('should return 400 if tags exceed 10 items', async () => {
      const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: statusId,
          tags: Array(11).fill('tag'),
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('tags');
    });

    it('should return 400 if status does not belong to board', async () => {
      const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      // Mock status not found
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: statusId,
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Status not found in this board');
    });
  });

  describe('Task Creation', () => {
    const statusId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    beforeEach(() => {
      // Mock successful authorization
      (authorizeBoard as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        role: 'owner',
      });

      // Mock status check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: statusId, board_id: 'board-1' },
        error: null,
      });
    });

    it('should create task with valid data', async () => {
      // Mock max order fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { order: 5 },
        error: null,
      });

      // Mock insert
      const newTask = {
        id: 'new-task-id',
        board_id: 'board-1',
        status_id: statusId,
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        tags: ['frontend'],
        order: 6,
      };

      // Third call to .single() for insert result
      mockSupabase.single.mockResolvedValueOnce({
        data: newTask,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          description: 'Task description',
          status_id: statusId,
          priority: 'high',
          tags: ['frontend'],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.task).toMatchObject({
        id: 'new-task-id',
        title: 'New Task',
        priority: 'high',
      });

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should calculate next order correctly', async () => {
      // Mock max order fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { order: 10 },
        error: null,
      });

      // Mock insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'new-task', order: 11 },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Ordered Task',
          status_id: statusId,
        }),
      });

      await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      // Verify insert was called with correct order
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 11,
        })
      );
    });

    it('should handle first task in column (no existing tasks)', async () => {
      // Mock no existing tasks
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'first-task', order: 0 },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'First Task',
          status_id: statusId,
        }),
      });

      await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      // Should insert with order 0
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 0,
        })
      );
    });

    it('should trim whitespace from string fields', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { order: 0 },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'trimmed-task' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: '  Trimmed Task  ',
          description: '  Description with spaces  ',
          status_id: statusId,
          assignee_name: '  John Doe  ',
        }),
      });

      await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trimmed Task',
          description: 'Description with spaces',
          assignee_name: 'John Doe',
        })
      );
    });

    it('should handle optional fields correctly', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { order: 0 },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'minimal-task' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Minimal Task',
          status_id: statusId,
        }),
      });

      await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Minimal Task',
          description: null,
          priority: null,
          tags: [],
          assignee_name: null,
          assignee_color: null,
          due_date: null,
        })
      );
    });
  });
});
