import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateBoardSchema,
  UpdateBoardSchema,
  CreateCommentSchema,
  SearchQuerySchema,
  TaskListQuerySchema,
  TagsArraySchema,
  UUIDSchema,
  HexColorSchema,
  TaskPriorityEnum,
  InviteMemberSchema,
  CreateStatusSchema,
} from '../schemas';

describe('Zod Validation Schemas', () => {
  describe('UUIDSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(UUIDSchema.parse(validUUID)).toBe(validUUID);
    });

    it('should reject invalid UUIDs', () => {
      expect(() => UUIDSchema.parse('not-a-uuid')).toThrow();
      expect(() => UUIDSchema.parse('')).toThrow();
      expect(() => UUIDSchema.parse('123')).toThrow();
    });
  });

  describe('HexColorSchema', () => {
    it('should accept valid hex colors', () => {
      expect(HexColorSchema.parse('#FF5733')).toBe('#FF5733');
      expect(HexColorSchema.parse('#000000')).toBe('#000000');
      expect(HexColorSchema.parse('#ffffff')).toBe('#ffffff');
    });

    it('should reject invalid hex colors', () => {
      expect(() => HexColorSchema.parse('FF5733')).toThrow(); // Missing #
      expect(() => HexColorSchema.parse('#FFF')).toThrow(); // Too short
      expect(() => HexColorSchema.parse('#GGGGGG')).toThrow(); // Invalid chars
    });
  });

  describe('TaskPriorityEnum', () => {
    it('should accept valid priorities', () => {
      expect(TaskPriorityEnum.parse('low')).toBe('low');
      expect(TaskPriorityEnum.parse('medium')).toBe('medium');
      expect(TaskPriorityEnum.parse('high')).toBe('high');
      expect(TaskPriorityEnum.parse('critical')).toBe('critical');
    });

    it('should reject invalid priorities', () => {
      expect(() => TaskPriorityEnum.parse('urgent')).toThrow();
      expect(() => TaskPriorityEnum.parse('LOW')).toThrow(); // Case sensitive
    });
  });

  describe('TagsArraySchema', () => {
    it('should accept valid tags array', () => {
      const tags = ['bug', 'frontend', 'urgent'];
      expect(TagsArraySchema.parse(tags)).toEqual(tags);
    });

    it('should default to empty array', () => {
      expect(TagsArraySchema.parse(undefined)).toEqual([]);
    });

    it('should reject more than 10 tags', () => {
      const tooManyTags = Array(11).fill('tag');
      expect(() => TagsArraySchema.parse(tooManyTags)).toThrow();
    });

    it('should reject tags over 50 characters', () => {
      const longTag = 'a'.repeat(51);
      expect(() => TagsArraySchema.parse([longTag])).toThrow();
    });

    it('should reject empty tag strings', () => {
      expect(() => TagsArraySchema.parse([''])).toThrow();
    });
  });

  describe('CreateTaskSchema', () => {
    const validTask = {
      title: 'Test Task',
      status_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('should accept minimal valid task', () => {
      const result = CreateTaskSchema.parse(validTask);
      expect(result.title).toBe('Test Task');
      expect(result.status_id).toBe(validTask.status_id);
      expect(result.tags).toEqual([]);
    });

    it('should accept full task with all fields', () => {
      const fullTask = {
        ...validTask,
        description: 'A test description',
        priority: 'high',
        tags: ['bug', 'frontend'],
        assignee_name: 'John Doe',
        assignee_color: '#FF5733',
        due_date: '2024-12-31T23:59:59Z',
        order: 1,
      };
      const result = CreateTaskSchema.parse(fullTask);
      expect(result).toMatchObject({
        title: 'Test Task',
        description: 'A test description',
        priority: 'high',
        tags: ['bug', 'frontend'],
      });
    });

    it('should reject title over 200 characters', () => {
      expect(() =>
        CreateTaskSchema.parse({
          ...validTask,
          title: 'a'.repeat(201),
        })
      ).toThrow();
    });

    it('should reject description over 2000 characters', () => {
      expect(() =>
        CreateTaskSchema.parse({
          ...validTask,
          description: 'a'.repeat(2001),
        })
      ).toThrow();
    });

    it('should reject empty title', () => {
      expect(() =>
        CreateTaskSchema.parse({
          ...validTask,
          title: '',
        })
      ).toThrow();
    });

    it('should reject invalid status_id', () => {
      expect(() =>
        CreateTaskSchema.parse({
          ...validTask,
          status_id: 'not-a-uuid',
        })
      ).toThrow();
    });

    it('should transform null description to null', () => {
      const result = CreateTaskSchema.parse({
        ...validTask,
        description: null,
      });
      expect(result.description).toBeNull();
    });

    it('should transform empty description to null', () => {
      const result = CreateTaskSchema.parse({
        ...validTask,
        description: '',
      });
      expect(result.description).toBeNull();
    });
  });

  describe('UpdateTaskSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateTaskSchema.parse({ title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
    });

    it('should accept empty object', () => {
      const result = UpdateTaskSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept priority update', () => {
      const result = UpdateTaskSchema.parse({ priority: 'critical' });
      expect(result.priority).toBe('critical');
    });

    it('should reject invalid priority', () => {
      expect(() => UpdateTaskSchema.parse({ priority: 'invalid' })).toThrow();
    });
  });

  describe('CreateBoardSchema', () => {
    it('should accept valid board', () => {
      const result = CreateBoardSchema.parse({ name: 'My Board' });
      expect(result.name).toBe('My Board');
      expect(result.description).toBeNull();
    });

    it('should accept board with description and template', () => {
      const result = CreateBoardSchema.parse({
        name: 'My Board',
        description: 'A test board',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.description).toBe('A test board');
      expect(result.template_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject board name over 100 characters', () => {
      expect(() => CreateBoardSchema.parse({ name: 'a'.repeat(101) })).toThrow();
    });

    it('should reject empty board name', () => {
      expect(() => CreateBoardSchema.parse({ name: '' })).toThrow();
    });

    it('should reject description over 500 characters', () => {
      expect(() =>
        CreateBoardSchema.parse({
          name: 'Board',
          description: 'a'.repeat(501),
        })
      ).toThrow();
    });
  });

  describe('UpdateBoardSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateBoardSchema.parse({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should accept description only update', () => {
      const result = UpdateBoardSchema.parse({ description: 'New description' });
      expect(result.description).toBe('New description');
    });
  });

  describe('CreateCommentSchema', () => {
    it('should accept valid comment', () => {
      const result = CreateCommentSchema.parse({ content: 'This is a comment' });
      expect(result.content).toBe('This is a comment');
    });

    it('should reject empty comment', () => {
      expect(() => CreateCommentSchema.parse({ content: '' })).toThrow();
    });

    it('should reject comment over 5000 characters', () => {
      expect(() => CreateCommentSchema.parse({ content: 'a'.repeat(5001) })).toThrow();
    });

    it('should trim whitespace', () => {
      const result = CreateCommentSchema.parse({ content: '  trimmed comment  ' });
      expect(result.content).toBe('trimmed comment');
    });
  });

  describe('SearchQuerySchema', () => {
    it('should accept minimal search query', () => {
      const result = SearchQuerySchema.parse({ q: 'search term' });
      expect(result.q).toBe('search term');
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should accept search with board_id', () => {
      const result = SearchQuerySchema.parse({
        q: 'search',
        board_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.board_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should coerce string limit to number', () => {
      const result = SearchQuerySchema.parse({ q: 'search', limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('should reject limit over 100', () => {
      expect(() => SearchQuerySchema.parse({ q: 'search', limit: 101 })).toThrow();
    });

    it('should reject empty search query', () => {
      expect(() => SearchQuerySchema.parse({ q: '' })).toThrow();
    });
  });

  describe('TaskListQuerySchema', () => {
    it('should provide sensible defaults', () => {
      const result = TaskListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort_by).toBe('order');
      expect(result.sort_order).toBe('asc');
    });

    it('should accept all filter options', () => {
      const result = TaskListQuerySchema.parse({
        page: '2',
        limit: '50',
        status_id: '123e4567-e89b-12d3-a456-426614174000',
        priority: 'high',
        search: 'test',
        sort_by: 'due_date',
        sort_order: 'desc',
      });
      expect(result.page).toBe(2);
      expect(result.priority).toBe('high');
      expect(result.sort_by).toBe('due_date');
    });

    it('should reject invalid sort_by', () => {
      expect(() => TaskListQuerySchema.parse({ sort_by: 'invalid' })).toThrow();
    });

    it('should reject page less than 1', () => {
      expect(() => TaskListQuerySchema.parse({ page: 0 })).toThrow();
    });
  });

  describe('InviteMemberSchema', () => {
    it('should accept valid invite', () => {
      const result = InviteMemberSchema.parse({
        email: 'user@example.com',
        role: 'member',
      });
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('member');
    });

    it('should reject owner role', () => {
      expect(() =>
        InviteMemberSchema.parse({
          email: 'user@example.com',
          role: 'owner',
        })
      ).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() =>
        InviteMemberSchema.parse({
          email: 'not-an-email',
          role: 'member',
        })
      ).toThrow();
    });
  });

  describe('CreateStatusSchema', () => {
    it('should accept valid status', () => {
      const result = CreateStatusSchema.parse({
        name: 'In Progress',
        color: '#3B82F6',
      });
      expect(result.name).toBe('In Progress');
      expect(result.color).toBe('#3B82F6');
    });

    it('should reject status name over 50 characters', () => {
      expect(() =>
        CreateStatusSchema.parse({
          name: 'a'.repeat(51),
          color: '#3B82F6',
        })
      ).toThrow();
    });

    it('should reject invalid color', () => {
      expect(() =>
        CreateStatusSchema.parse({
          name: 'Done',
          color: 'blue',
        })
      ).toThrow();
    });
  });
});
