import { Board, Status, StatusWithTasks, Task, BoardWithData } from '../board';

describe('Board Types', () => {
  describe('Task type', () => {
    it('should accept valid task data', () => {
      const task: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        board_id: '123e4567-e89b-12d3-a456-426614174001',
        status_id: '123e4567-e89b-12d3-a456-426614174002',
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        tags: ['tag1', 'tag2'],
        assignee_name: 'John Doe',
        assignee_color: '#6366f1',
        due_date: '2024-12-31',
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.title).toBe('Test Task');
      expect(task.priority).toBe('high');
      expect(task.tags).toHaveLength(2);
    });

    it('should accept task with null optional fields', () => {
      const task: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        board_id: '123e4567-e89b-12d3-a456-426614174001',
        status_id: '123e4567-e89b-12d3-a456-426614174002',
        title: 'Minimal Task',
        description: null,
        priority: null,
        tags: [],
        assignee_name: null,
        assignee_color: null,
        due_date: null,
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(task.description).toBeNull();
      expect(task.priority).toBeNull();
      expect(task.tags).toHaveLength(0);
    });

    it('should validate priority values', () => {
      const priorities: Array<Task['priority']> = ['low', 'medium', 'high', 'critical', null];
      priorities.forEach((priority) => {
        const task: Task = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          board_id: '123e4567-e89b-12d3-a456-426614174001',
          status_id: '123e4567-e89b-12d3-a456-426614174002',
          title: 'Test',
          description: null,
          priority,
          tags: [],
          assignee_name: null,
          assignee_color: null,
          due_date: null,
          order: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };
        expect(task.priority).toBe(priority);
      });
    });
  });

  describe('Status type', () => {
    it('should accept valid status data', () => {
      const status: Status = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        board_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'To Do',
        color: '#3B82F6',
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(status.name).toBe('To Do');
      expect(status.color).toBe('#3B82F6');
    });

    it('should accept status with tasks', () => {
      const status: StatusWithTasks = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        board_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'In Progress',
        color: '#F59E0B',
        order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            board_id: '123e4567-e89b-12d3-a456-426614174001',
            status_id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Task 1',
            description: null,
            priority: 'medium',
            tags: [],
            assignee_name: null,
            assignee_color: null,
            due_date: null,
            order: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      expect(status.tasks).toHaveLength(1);
      expect(status.tasks[0].title).toBe('Task 1');
    });
  });

  describe('Board type', () => {
    it('should accept valid board data', () => {
      const board: Board = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Board',
        description: 'Board description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(board.name).toBe('My Board');
      expect(board.description).toBe('Board description');
    });

    it('should accept board with null description', () => {
      const board: Board = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'My Board',
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(board.description).toBeNull();
    });
  });

  describe('BoardWithData type', () => {
    it('should combine board with statuses', () => {
      const boardWithData: BoardWithData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Full Board',
        description: 'A complete board',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        statuses: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            board_id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'To Do',
            color: '#3B82F6',
            order: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            tasks: [],
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            board_id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Done',
            color: '#22C55E',
            order: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            tasks: [],
          },
        ],
      };

      expect(boardWithData.statuses).toHaveLength(2);
      expect(boardWithData.statuses[0].name).toBe('To Do');
      expect(boardWithData.statuses[1].name).toBe('Done');
    });
  });
});
