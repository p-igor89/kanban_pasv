/**
 * Integration tests for Tasks API endpoints
 * Tests the full API route handlers with mocked Supabase client
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Tasks API - GET /api/boards/[boardId]/tasks', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create a chainable mock for Supabase queries
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if board not found or not owned by user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board not found
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Board not found');
    });
  });

  describe('Query Filters', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockBoard = { id: 'board-1', user_id: 'user-1' };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board ownership check
      mockSupabase.single.mockResolvedValueOnce({
        data: mockBoard,
        error: null,
      });
    });

    it('should filter tasks by status_id', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Task 1', status_id: 'status-1' },
        { id: 'task-2', title: 'Task 2', status_id: 'status-1' },
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/boards/board-1/tasks?status_id=status-1'
      );

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('status_id', 'status-1');
    });

    it('should filter tasks by priority', async () => {
      mockSupabase.single.mockResolvedValue({
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
      mockSupabase.single.mockResolvedValue({
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
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/boards/board-1/tasks?search=urgent'
      );

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.or).toHaveBeenCalledWith('title.ilike.%urgent%,description.ilike.%urgent%');
    });

    it('should order tasks by status_id and order', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks');

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.order).toHaveBeenCalledWith('status_id');
      expect(mockSupabase.order).toHaveBeenCalledWith('order', { ascending: true });
    });
  });

  describe('Error Handling', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });
    });

    it('should return 500 on database error', async () => {
      mockSupabase.single.mockResolvedValue({
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
      auth: {
        getUser: jest.fn(),
      },
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
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board ownership
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });
    });

    it('should return 400 if title is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          status_id: 'status-1',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Title');
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
      expect(data.error).toContain('200 characters');
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
      expect(data.error).toContain('Status ID');
    });

    it('should return 400 for invalid priority', async () => {
      // Mock status check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'status-1', board_id: 'board-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: 'status-1',
          priority: 'invalid',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Priority');
    });

    it('should return 400 if tags exceed 10 items', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'status-1', board_id: 'board-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: 'status-1',
          tags: Array(11).fill('tag'),
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Tags');
    });

    it('should return 400 if status does not belong to board', async () => {
      // Mock status not found
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          status_id: 'invalid-status',
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Status not found');
    });
  });

  describe('Task Creation', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board ownership
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      // Mock status check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'status-1', board_id: 'board-1' },
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
        status_id: 'status-1',
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        tags: ['frontend'],
        order: 6,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: newTask,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/boards/board-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          description: 'Task description',
          status_id: 'status-1',
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
          status_id: 'status-1',
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
          status_id: 'status-1',
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
          status_id: 'status-1',
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
          status_id: 'status-1',
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
